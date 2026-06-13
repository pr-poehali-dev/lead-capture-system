"""Парсер контактов с сайтов конкурентов: телефоны, email, имена, соцсети."""
import json
import os
import re
import urllib.request
import urllib.parse
from html.parser import HTMLParser
import psycopg2

SCHEMA = "t_p56466268_lead_capture_system"

PHONE_RE = re.compile(
    r'(?<!\d)(\+7|8)[\s\-\(]?(\d{3})[\s\-\)\.]?(\d{3})[\s\-\.]?(\d{2})[\s\-\.]?(\d{2})(?!\d)'
)
EMAIL_RE = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]{2,}')
VK_RE = re.compile(r'https?://(?:www\.)?vk\.com/[a-zA-Z0-9_.\-]+')
TG_RE = re.compile(r'https?://(?:www\.)?t\.me/[a-zA-Z0-9_]+|@[a-zA-Z0-9_]{5,}')
NAME_RE = re.compile(r'\b([А-ЯЁ][а-яё]+)\s+([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?)\b')

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
}

CONTACT_PAGES = ['/contacts', '/contact', '/kontakty', '/about', '/o-kompanii', '/o-nas', '/about-us']


class LinkParser(HTMLParser):
    def __init__(self, base_url):
        super().__init__()
        self.links = set()
        self.base_url = base_url

    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            for attr, val in attrs:
                if attr == 'href' and val:
                    full = urllib.parse.urljoin(self.base_url, val)
                    parsed = urllib.parse.urlparse(full)
                    base_parsed = urllib.parse.urlparse(self.base_url)
                    if parsed.netloc == base_parsed.netloc:
                        self.links.add(full.split('#')[0])


def fetch_page(url: str, timeout: int = 4) -> str:
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            charset = 'utf-8'
            ct = resp.headers.get_content_charset()
            if ct:
                charset = ct
            raw = resp.read(300_000)
            try:
                return raw.decode(charset, errors='replace')
            except Exception:
                return raw.decode('utf-8', errors='replace')
    except Exception:
        return ''


def normalize_phone(m) -> str:
    prefix, g1, g2, g3, g4 = m.groups()
    # Приводим к единому формату +7XXXXXXXXXX
    digits = g1 + g2 + g3 + g4  # 10 цифр без кода страны
    return f'+7 ({digits[0:3]}) {digits[3:6]}-{digits[6:8]}-{digits[8:10]}'


def extract_contacts(html: str, page_url: str) -> dict:
    phones = list({normalize_phone(m) for m in PHONE_RE.finditer(html)})
    emails = list({e.lower() for e in EMAIL_RE.findall(html)
                   if not e.endswith(('.png', '.jpg', '.gif', '.svg', '.css', '.js'))})
    vk_links = list(set(VK_RE.findall(html)))
    tg_links = list(set(TG_RE.findall(html)))
    names = list({m.group(0) for m in NAME_RE.finditer(html)})[:10]

    return {
        'phones': phones,
        'emails': emails,
        'names': names,
        'vk': vk_links,
        'telegram': tg_links,
        'page_url': page_url,
    }


def get_pages_to_scan(base_url: str, main_html: str) -> list:
    pages = {base_url}
    base = urllib.parse.urlparse(base_url)
    root = f"{base.scheme}://{base.netloc}"

    for path in CONTACT_PAGES:
        pages.add(root + path)
        pages.add(root + path + '/')

    lp = LinkParser(base_url)
    try:
        lp.feed(main_html)
    except Exception:
        pass

    for link in lp.links:
        path = urllib.parse.urlparse(link).path.lower()
        if any(kw in path for kw in ['contact', 'kontakt', 'about', 'o-nas', 'o-kompan']):
            pages.add(link)

    return list(pages)[:5]


def parse_site(url: str) -> list:
    if not url.startswith('http'):
        url = 'https://' + url

    main_html = fetch_page(url)
    if not main_html:
        main_html = fetch_page(url.replace('https://', 'http://'))

    pages = get_pages_to_scan(url, main_html)
    all_contacts = []
    seen_phones = set()
    seen_emails = set()

    for page_url in pages:
        html = fetch_page(page_url) if page_url != url else main_html
        if not html:
            continue
        c = extract_contacts(html, page_url)

        for phone in c['phones']:
            if phone not in seen_phones:
                seen_phones.add(phone)
                row = {
                    'source_url': url,
                    'phone': phone,
                    'email': None,
                    'name': c['names'][0] if c['names'] else None,
                    'social_vk': c['vk'][0] if c['vk'] else None,
                    'social_tg': c['telegram'][0] if c['telegram'] else None,
                    'social_other': None,
                    'raw_page_url': page_url,
                }
                all_contacts.append(row)

        for email in c['emails']:
            if email not in seen_emails:
                seen_emails.add(email)
                row = {
                    'source_url': url,
                    'phone': None,
                    'email': email,
                    'name': c['names'][0] if c['names'] else None,
                    'social_vk': c['vk'][0] if c['vk'] else None,
                    'social_tg': c['telegram'][0] if c['telegram'] else None,
                    'social_other': None,
                    'raw_page_url': page_url,
                }
                all_contacts.append(row)

    return all_contacts


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def handler(event: dict, context) -> dict:
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    method = event.get('httpMethod', 'GET')

    # GET /results?task_id=X — результаты задачи
    if method == 'GET':
        params = event.get('queryStringParameters') or {}
        task_id = params.get('task_id')
        conn = get_conn()
        cur = conn.cursor()
        if task_id:
            cur.execute(
                f"SELECT pt.id, pt.url, pt.status, to_char(pt.created_at,'DD.MM.YYYY HH24:MI') as created_at, to_char(pt.finished_at,'DD.MM.YYYY HH24:MI') as finished_at, COUNT(c.id) as contacts_count FROM {SCHEMA}.parse_tasks pt LEFT JOIN {SCHEMA}.contacts c ON c.task_id = pt.id WHERE pt.id = %s GROUP BY pt.id",
                (task_id,)
            )
        else:
            cur.execute(
                f"SELECT pt.id, pt.url, pt.status, to_char(pt.created_at,'DD.MM.YYYY HH24:MI') as created_at, to_char(pt.finished_at,'DD.MM.YYYY HH24:MI') as finished_at, COUNT(c.id) as contacts_count FROM {SCHEMA}.parse_tasks pt LEFT JOIN {SCHEMA}.contacts c ON c.task_id = pt.id GROUP BY pt.id ORDER BY pt.created_at DESC LIMIT 50"
            )
        cols = [d[0] for d in cur.description]
        tasks = [dict(zip(cols, r)) for r in cur.fetchall()]

        contacts = []
        if task_id:
            cur.execute(
                f"SELECT id, source_url, phone, email, name, social_vk, social_tg, social_other, raw_page_url, to_char(created_at,'DD.MM.YYYY HH24:MI') as created_at FROM {SCHEMA}.contacts WHERE task_id = %s ORDER BY id",
                (task_id,)
            )
            cols2 = [d[0] for d in cur.description]
            contacts = [dict(zip(cols2, r)) for r in cur.fetchall()]

        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'tasks': tasks, 'contacts': contacts}, ensure_ascii=False)}

    # POST /?action=delete — удалить задачу и контакты
    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        action = (event.get('queryStringParameters') or {}).get('action', '') or body.get('action', '')
        if action == 'delete':
            task_id = body.get('task_id')
            if not task_id:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'task_id обязателен'}, ensure_ascii=False)}
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"DELETE FROM {SCHEMA}.contacts WHERE task_id = %s", (task_id,))
            cur.execute(f"DELETE FROM {SCHEMA}.parse_tasks WHERE id = %s", (task_id,))
            conn.commit()
            conn.close()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True}, ensure_ascii=False)}

    # POST / — запустить парсинг одного или списка URL
    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        urls_raw = body.get('urls', '')
        if isinstance(urls_raw, list):
            urls = [u.strip() for u in urls_raw if u.strip()]
        else:
            urls = [u.strip() for u in str(urls_raw).splitlines() if u.strip()]

        if not urls:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Не указаны URL'}, ensure_ascii=False)}

        conn = get_conn()
        cur = conn.cursor()
        task_ids = []
        total_contacts = 0

        for url in urls[:20]:
            cur.execute(
                f"INSERT INTO {SCHEMA}.parse_tasks (url, status) VALUES (%s, 'running') RETURNING id",
                (url,)
            )
            task_id = cur.fetchone()[0]
            conn.commit()
            task_ids.append(task_id)

            contacts = parse_site(url)
            total_contacts += len(contacts)

            for c in contacts:
                cur.execute(
                    f"""INSERT INTO {SCHEMA}.contacts (task_id, source_url, phone, email, name, social_vk, social_tg, social_other, raw_page_url)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (task_id, c['source_url'], c['phone'], c['email'], c['name'],
                     c['social_vk'], c['social_tg'], c['social_other'], c['raw_page_url'])
                )

            cur.execute(
                f"UPDATE {SCHEMA}.parse_tasks SET status='done', finished_at=NOW() WHERE id=%s",
                (task_id,)
            )
            conn.commit()

        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({
            'success': True,
            'task_ids': task_ids,
            'total_contacts': total_contacts,
        }, ensure_ascii=False)}

    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}