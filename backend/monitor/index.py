"""Мониторинг открытых источников: поиск упоминаний конкурентов и людей, ищущих альтернативы."""
import json
import os
import re
import urllib.request
import urllib.parse
import psycopg2

SCHEMA = "t_p56466268_lead_capture_system"

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

PHONE_RE = re.compile(r'(\+7|8)[\s\-\(]?\d{3}[\s\-\)]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}')
EMAIL_RE = re.compile(r'[a-zA-Z0-9_.+\-]+@[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}')
INTENT_KEYWORDS = ["ищу альтернативу", "порекомендуйте", "ищу замену"]

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def ensure_tables(cur):
    cur.execute(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA}")
    cur.execute(f"""
        CREATE TABLE IF NOT EXISTS {SCHEMA}.monitor_tasks (
            id SERIAL PRIMARY KEY,
            competitor_name TEXT NOT NULL,
            keywords TEXT DEFAULT '',
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT NOW(),
            last_run TIMESTAMP
        )
    """)
    cur.execute(f"""
        CREATE TABLE IF NOT EXISTS {SCHEMA}.monitor_leads (
            id SERIAL PRIMARY KEY,
            task_id INTEGER NOT NULL,
            phone TEXT DEFAULT '',
            email TEXT DEFAULT '',
            source_name TEXT DEFAULT '',
            source_url TEXT DEFAULT '',
            snippet TEXT DEFAULT '',
            intent_score INTEGER DEFAULT 50,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)

def calc_intent(text):
    text_lower = text.lower()
    for kw in INTENT_KEYWORDS:
        if kw in text_lower:
            return 80
    return 50

def http_get(url, timeout=10):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; LeadBot/1.0)"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace")

def search_yandex(competitor_name, keywords):
    """Ищет в Яндексе контакты по запросу с именем конкурента и ключевыми словами."""
    results = []
    query = urllib.parse.quote_plus(f"{competitor_name} {keywords} отзывы контакты телефон")
    url = f"https://yandex.ru/search/?text={query}&lr=213"
    try:
        html = http_get(url)
        phones = PHONE_RE.findall(html)
        emails = EMAIL_RE.findall(html)
        intent = calc_intent(html)
        seen = set()
        for ph in phones:
            if ph not in seen:
                seen.add(ph)
                results.append({
                    "phone": ph,
                    "email": "",
                    "source_name": "Яндекс",
                    "source_url": url,
                    "snippet": f"Найден телефон в выдаче Яндекса по запросу: {competitor_name}",
                    "intent_score": intent,
                })
        for em in emails:
            if em not in seen:
                seen.add(em)
                results.append({
                    "phone": "",
                    "email": em,
                    "source_name": "Яндекс",
                    "source_url": url,
                    "snippet": f"Найден email в выдаче Яндекса по запросу: {competitor_name}",
                    "intent_score": intent,
                })
    except Exception:
        pass
    return results

def search_2gis(competitor_name):
    """Ищет контакты организации в 2GIS по названию конкурента."""
    results = []
    query = urllib.parse.quote_plus(competitor_name)
    url = (
        f"https://catalog.api.2gis.com/3.0/items"
        f"?q={query}&fields=items.contact_groups&key=ruMXgB&page_size=20"
    )
    try:
        raw = http_get(url)
        data = json.loads(raw)
        items = data.get("result", {}).get("items", [])
        for item in items:
            contact_groups = item.get("contact_groups", [])
            for group in contact_groups:
                contacts = group.get("contacts", [])
                for contact in contacts:
                    ctype = contact.get("type", "")
                    value = contact.get("value", "")
                    if ctype == "phone" and value:
                        results.append({
                            "phone": value,
                            "email": "",
                            "source_name": "2GIS",
                            "source_url": f"https://2gis.ru/search/{query}",
                            "snippet": f"Контакт из 2GIS: {item.get('name', '')}",
                            "intent_score": 50,
                        })
                    elif ctype == "email" and value:
                        results.append({
                            "phone": "",
                            "email": value,
                            "source_name": "2GIS",
                            "source_url": f"https://2gis.ru/search/{query}",
                            "snippet": f"Контакт из 2GIS: {item.get('name', '')}",
                            "intent_score": 50,
                        })
    except Exception:
        pass
    return results

def search_vk(keywords):
    """Ищет упоминания в публичных постах ВКонтакте по ключевым словам."""
    results = []
    query = urllib.parse.quote_plus(keywords)
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
            phones = PHONE_RE.findall(text)
            emails = EMAIL_RE.findall(text)
            intent = calc_intent(text)
            post_url = ""
            owner_id = item.get("owner_id", "")
            post_id = item.get("id", "")
            if owner_id and post_id:
                post_url = f"https://vk.com/wall{owner_id}_{post_id}"
            for ph in phones:
                results.append({
                    "phone": ph,
                    "email": "",
                    "source_name": "ВКонтакте",
                    "source_url": post_url,
                    "snippet": text[:200],
                    "intent_score": intent,
                })
            for em in emails:
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

def run_monitoring(task_id, competitor_name, keywords, cur):
    """Запускает парсинг по всем источникам и сохраняет найденные лиды в БД."""
    all_results = []
    all_results.extend(search_yandex(competitor_name, keywords))
    all_results.extend(search_2gis(competitor_name))
    all_results.extend(search_vk(keywords))

    for r in all_results:
        cur.execute(
            f"""
            INSERT INTO {SCHEMA}.monitor_leads
                (task_id, phone, email, source_name, source_url, snippet, intent_score)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                task_id,
                r["phone"],
                r["email"],
                r["source_name"],
                r["source_url"],
                r["snippet"],
                r["intent_score"],
            ),
        )

    cur.execute(
        f"""
        UPDATE {SCHEMA}.monitor_tasks
        SET last_run = NOW(), status = 'done'
        WHERE id = %s
        """,
        (task_id,),
    )
    return len(all_results)

def handler(event: dict, context) -> dict:
    """Мониторит открытые источники: Яндекс, 2GIS, ВКонтакте — ищет контакты конкурентов."""
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

    # GET / — список задач мониторинга
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

    # GET /?task_id=X — лиды задачи
    if method == "GET" and task_id:
        cur.execute(
            f"""
            SELECT id, task_id, phone, email, source_name, source_url,
                   snippet, intent_score,
                   to_char(created_at, 'DD.MM.YYYY HH24:MI') as created_at
            FROM {SCHEMA}.monitor_leads
            WHERE task_id = %s
            ORDER BY created_at DESC
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

    # POST /?action=create — создать задачу мониторинга
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

    # POST /?action=run&task_id=X — запустить мониторинг
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
        found = run_monitoring(t_id, competitor_name, keywords, cur)
        conn.commit()
        conn.close()
        return {
            "statusCode": 200,
            "headers": json_headers,
            "body": json.dumps({"success": True, "found": found}, ensure_ascii=False),
        }

    # POST /?action=autorun — запустить все задачи сразу (для автозапуска по расписанию)
    if method == "POST" and action == "autorun":
        cur.execute(f"SELECT id, competitor_name, keywords FROM {SCHEMA}.monitor_tasks")
        all_tasks = cur.fetchall()
        total_found = 0
        for t_id, competitor_name, keywords in all_tasks:
            cur.execute(f"UPDATE {SCHEMA}.monitor_tasks SET status = 'running' WHERE id = %s", (t_id,))
            conn.commit()
            found = run_monitoring(t_id, competitor_name, keywords, cur)
            conn.commit()
            total_found += found
        conn.close()
        return {
            "statusCode": 200,
            "headers": json_headers,
            "body": json.dumps({"success": True, "tasks_run": len(all_tasks), "total_found": total_found}, ensure_ascii=False),
        }

    # POST /?action=delete&task_id=X — удалить задачу
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