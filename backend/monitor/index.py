"""Мониторинг открытых источников: поиск кандидатов на контракт с Министерством обороны."""
import json
import os
import re
import urllib.request
import urllib.parse
import psycopg2
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError

SCHEMA = "t_p56466268_lead_capture_system"

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

PHONE_RE = re.compile(r'(?:\+7|8)[\s\-\(]?\d{3}[\s\-\)]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}')
EMAIL_RE = re.compile(r'[a-zA-Z0-9_.+\-]+@[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}')

INTENT_KEYWORDS = [
    "хочу заключить контракт", "интересует контракт", "служба по контракту",
    "хочу служить по контракту", "как заключить контракт", "условия контракта",
    "сколько платят по контракту", "выплаты по контракту", "контрактная служба",
    "пойти по контракту", "записаться по контракту", "узнать про контракт",
    "хочу в армию", "пойти в армию", "служить в армии", "мобилизация",
    "доброволец", "добровольцем", "вступить в армию",
]

TELEGRAM_CHANNELS = [
    "kontraktvka",
    "kontraktservice",
    "army_kontract",
    "voenniy_kontract",
    "kontraktrf",
    "svo_kontract",
    "vmf_kontract",
    "contract_army_ru",
    "army_russia_kontract",
]

HTTP_TIMEOUT = 5

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def ensure_tables(cur):
    pass

def calc_intent(text):
    text_lower = text.lower()
    score = 50
    matches = 0
    for kw in INTENT_KEYWORDS:
        if kw in text_lower:
            matches += 1
    if matches >= 3:
        score = 95
    elif matches >= 2:
        score = 85
    elif matches >= 1:
        score = 70
    return score

def http_get(url, timeout=HTTP_TIMEOUT):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace")

def search_yandex(keywords):
    """Ищет в Яндексе людей, интересующихся службой по контракту."""
    results = []
    queries = [
        f"{keywords} служба по контракту телефон",
        f"хочу заключить контракт {keywords}",
    ]
    seen = set()
    for q in queries:
        query = urllib.parse.quote_plus(q)
        url = f"https://yandex.ru/search/?text={query}&lr=0"
        try:
            html = http_get(url)
            phones = PHONE_RE.findall(html)
            emails = EMAIL_RE.findall(html)
            intent = calc_intent(html)
            for ph in phones:
                ph_clean = ph.strip()
                if ph_clean not in seen:
                    seen.add(ph_clean)
                    results.append({
                        "phone": ph_clean,
                        "email": "",
                        "source_name": "Яндекс",
                        "source_url": url,
                        "snippet": f"Найден в выдаче Яндекса по запросу: {q}",
                        "intent_score": intent,
                    })
            for em in emails:
                em_clean = em.strip()
                if em_clean not in seen:
                    seen.add(em_clean)
                    results.append({
                        "phone": "",
                        "email": em_clean,
                        "source_name": "Яндекс",
                        "source_url": url,
                        "snippet": f"Найден email в выдаче Яндекса по запросу: {q}",
                        "intent_score": intent,
                    })
        except Exception:
            pass
    return results

def search_vk(keywords):
    """Ищет в ВКонтакте публичные посты людей, интересующихся контрактной службой."""
    results = []
    vk_queries = [
        f"служба по контракту {keywords}",
        f"контракт МО {keywords}",
    ]
    seen = set()
    for q in vk_queries:
        query = urllib.parse.quote_plus(q)
        url = (
            f"https://api.vk.com/method/newsfeed.search"
            f"?q={query}&count=20&v=5.131"
        )
        try:
            raw = http_get(url)
            data = json.loads(raw)
            items = data.get("response", {}).get("items", [])
            for item in items:
                text = item.get("text", "")
                if not text:
                    continue
                intent = calc_intent(text)
                if intent < 60:
                    continue
                phones = PHONE_RE.findall(text)
                emails = EMAIL_RE.findall(text)
                owner_id = item.get("owner_id", "")
                post_id = item.get("id", "")
                post_url = f"https://vk.com/wall{owner_id}_{post_id}" if owner_id and post_id else ""
                for ph in phones:
                    if ph not in seen:
                        seen.add(ph)
                        results.append({
                            "phone": ph,
                            "email": "",
                            "source_name": "ВКонтакте",
                            "source_url": post_url,
                            "snippet": text[:200],
                            "intent_score": intent,
                        })
                for em in emails:
                    if em not in seen:
                        seen.add(em)
                        results.append({
                            "phone": "",
                            "email": em,
                            "source_name": "ВКонтакте",
                            "source_url": post_url,
                            "snippet": text[:200],
                            "intent_score": intent,
                        })
        except Exception:
            pass
    return results

def search_telegram_channel(channel_username):
    """Парсит публичный Telegram-канал через веб-версию t.me/s/ без авторизации."""
    results = []
    url = f"https://t.me/s/{channel_username}"
    try:
        html = http_get(url, timeout=15)
        message_re = re.compile(
            r'<div class="tgme_widget_message_text[^"]*"[^>]*>(.*?)</div>',
            re.DOTALL | re.IGNORECASE,
        )
        messages = message_re.findall(html)
        seen = set()
        for msg_html in messages:
            msg_text = re.sub(r'<[^>]+>', ' ', msg_html)
            msg_text = re.sub(r'\s+', ' ', msg_text).strip()
            if not msg_text:
                continue
            intent = calc_intent(msg_text)
            if intent < 60:
                continue
            phones = PHONE_RE.findall(msg_text)
            emails = EMAIL_RE.findall(msg_text)
            for ph in phones:
                if ph not in seen:
                    seen.add(ph)
                    results.append({
                        "phone": ph,
                        "email": "",
                        "source_name": f"Telegram @{channel_username}",
                        "source_url": f"https://t.me/{channel_username}",
                        "snippet": msg_text[:200],
                        "intent_score": intent,
                    })
            for em in emails:
                if em not in seen:
                    seen.add(em)
                    results.append({
                        "phone": "",
                        "email": em,
                        "source_name": f"Telegram @{channel_username}",
                        "source_url": f"https://t.me/{channel_username}",
                        "snippet": msg_text[:200],
                        "intent_score": intent,
                    })
            if not phones and not emails and intent >= 70:
                key = msg_text[:50]
                if key not in seen:
                    seen.add(key)
                    results.append({
                        "phone": "",
                        "email": "",
                        "source_name": f"Telegram @{channel_username}",
                        "source_url": f"https://t.me/{channel_username}",
                        "snippet": msg_text[:200],
                        "intent_score": intent,
                    })
    except Exception:
        pass
    return results

def search_telegram_all():
    """Парсит все известные Telegram-каналы про контрактную службу параллельно."""
    results = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(search_telegram_channel, ch) for ch in TELEGRAM_CHANNELS]
        for future in futures:
            try:
                results.extend(future.result(timeout=8))
            except Exception:
                pass
    return results

def save_results(task_id, results, cur):
    """Сохраняет найденные лиды в БД."""
    saved = 0
    for r in results:
        try:
            cur.execute(
                f"""
                INSERT INTO {SCHEMA}.monitor_leads
                    (task_id, phone, email, source_name, source_url, snippet, intent_score)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    task_id,
                    str(r.get("phone", ""))[:100],
                    str(r.get("email", ""))[:200],
                    str(r.get("source_name", ""))[:200],
                    str(r.get("source_url", ""))[:500],
                    str(r.get("snippet", ""))[:1000],
                    int(r.get("intent_score", 50)),
                ),
            )
            saved += 1
        except Exception:
            cur.connection.rollback()
    return saved

def run_source(task_id, source, competitor_name, keywords, cur):
    """Запускает один источник и сохраняет результаты."""
    search_kw = keywords if keywords else competitor_name
    results = []
    if source == "yandex":
        results = search_yandex(search_kw)
    elif source == "vk":
        results = search_vk(search_kw)
    elif source == "telegram":
        results = search_telegram_all()
    saved = save_results(task_id, results, cur)
    cur.execute(
        f"UPDATE {SCHEMA}.monitor_tasks SET last_run = NOW(), status = 'running' WHERE id = %s",
        (task_id,),
    )
    return saved

def handler(event: dict, context) -> dict:
    """Мониторит открытые источники: Яндекс, ВКонтакте, Telegram — ищет кандидатов на контрактную службу."""
    json_headers = dict(CORS_HEADERS)
    json_headers["Content-Type"] = "application/json"

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "")
    task_id = params.get("task_id", "")

    if method == "OPTIONS":
        return {"statusCode": 200, "headers": json_headers, "body": ""}

    conn = get_conn()
    cur = conn.cursor()
    ensure_tables(cur)
    conn.commit()

    if method == "GET" and not task_id:
        cur.execute(
            f"""
            SELECT mt.id, mt.competitor_name, mt.keywords, mt.status,
                   to_char(mt.created_at, 'DD.MM.YYYY HH24:MI') as created_at,
                   to_char(mt.last_run, 'DD.MM.YYYY HH24:MI') as last_run,
                   COUNT(ml.id) as leads_count
            FROM {SCHEMA}.monitor_tasks mt
            LEFT JOIN {SCHEMA}.monitor_leads ml ON ml.task_id = mt.id
            GROUP BY mt.id
            ORDER BY mt.created_at DESC
            """
        )
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        tasks = [dict(zip(cols, row)) for row in rows]
        conn.close()
        return {
            "statusCode": 200,
            "headers": json_headers,
            "body": json.dumps({"tasks": tasks}, ensure_ascii=False),
        }

    if method == "GET" and task_id:
        cur.execute(
            f"""
            SELECT id, task_id, phone, email, source_name, source_url,
                   snippet, intent_score,
                   to_char(created_at, 'DD.MM.YYYY HH24:MI') as created_at
            FROM {SCHEMA}.monitor_leads
            WHERE task_id = %s
            ORDER BY intent_score DESC, created_at DESC
            """,
            (task_id,),
        )
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        leads = [dict(zip(cols, row)) for row in rows]
        conn.close()
        return {
            "statusCode": 200,
            "headers": json_headers,
            "body": json.dumps({"leads": leads}, ensure_ascii=False),
        }

    if method == "POST" and action == "create":
        body = json.loads(event.get("body") or "{}")
        competitor_name = body.get("competitor_name", "").strip()
        keywords = body.get("keywords", "").strip()
        if not competitor_name:
            conn.close()
            return {
                "statusCode": 400,
                "headers": json_headers,
                "body": json.dumps({"error": "competitor_name обязателен"}, ensure_ascii=False),
            }
        cur.execute(
            f"""
            INSERT INTO {SCHEMA}.monitor_tasks (competitor_name, keywords)
            VALUES (%s, %s)
            RETURNING id
            """,
            (competitor_name, keywords),
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return {
            "statusCode": 200,
            "headers": json_headers,
            "body": json.dumps({"id": new_id, "success": True}, ensure_ascii=False),
        }

    if method == "POST" and action == "run" and task_id:
        cur.execute(
            f"SELECT id, competitor_name, keywords FROM {SCHEMA}.monitor_tasks WHERE id = %s",
            (task_id,),
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return {
                "statusCode": 404,
                "headers": json_headers,
                "body": json.dumps({"error": "Task not found"}, ensure_ascii=False),
            }
        t_id, competitor_name, keywords = row
        cur.execute(
            f"UPDATE {SCHEMA}.monitor_tasks SET status = 'running' WHERE id = %s",
            (t_id,),
        )
        conn.commit()
        conn.close()
        return {
            "statusCode": 200,
            "headers": json_headers,
            "body": json.dumps({"success": True, "task_id": t_id, "sources": ["yandex", "vk", "telegram"]}, ensure_ascii=False),
        }

    if method == "POST" and action == "run_source" and task_id:
        source = params.get("source", "")
        cur.execute(
            f"SELECT id, competitor_name, keywords FROM {SCHEMA}.monitor_tasks WHERE id = %s",
            (task_id,),
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return {"statusCode": 404, "headers": json_headers, "body": json.dumps({"error": "Task not found"})}
        t_id, competitor_name, keywords = row
        found = run_source(t_id, source, competitor_name, keywords, cur)
        if source == "telegram":
            cur.execute(
                f"UPDATE {SCHEMA}.monitor_tasks SET status = 'done', last_run = NOW() WHERE id = %s",
                (t_id,),
            )
        conn.commit()
        conn.close()
        return {
            "statusCode": 200,
            "headers": json_headers,
            "body": json.dumps({"success": True, "source": source, "found": found}, ensure_ascii=False),
        }

    if method == "POST" and action == "autorun":
        cur.execute(f"SELECT id, competitor_name, keywords FROM {SCHEMA}.monitor_tasks")
        all_tasks = cur.fetchall()
        total_found = 0
        for t_id, competitor_name, keywords in all_tasks:
            cur.execute(f"UPDATE {SCHEMA}.monitor_tasks SET status = 'running' WHERE id = %s", (t_id,))
            conn.commit()
            for source in ["yandex", "vk", "telegram"]:
                found = run_source(t_id, source, competitor_name, keywords, cur)
                total_found += found
                conn.commit()
            cur.execute(f"UPDATE {SCHEMA}.monitor_tasks SET status = 'done', last_run = NOW() WHERE id = %s", (t_id,))
            conn.commit()
        conn.close()
        return {
            "statusCode": 200,
            "headers": json_headers,
            "body": json.dumps({"success": True, "tasks_run": len(all_tasks), "total_found": total_found}, ensure_ascii=False),
        }

    if method == "POST" and action == "delete" and task_id:
        cur.execute(f"DELETE FROM {SCHEMA}.monitor_leads WHERE task_id = %s", (task_id,))
        cur.execute(f"DELETE FROM {SCHEMA}.monitor_tasks WHERE id = %s", (task_id,))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": json_headers, "body": json.dumps({"success": True})}

    conn.close()
    return {
        "statusCode": 400,
        "headers": json_headers,
        "body": json.dumps({"error": "Unknown action or method"}, ensure_ascii=False),
    }