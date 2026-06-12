"""Управление виджетами и приём лидов от JavaScript-скрипта на сайтах клиентов."""
import json
import os
import secrets
import psycopg2

SCHEMA = "t_p56466268_lead_capture_system"

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def ensure_tables(cur):
    cur.execute(f"""
        CREATE SCHEMA IF NOT EXISTS {SCHEMA}
    """)
    cur.execute(f"""
        CREATE TABLE IF NOT EXISTS {SCHEMA}.widgets (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            site_url TEXT NOT NULL,
            competitors TEXT DEFAULT '',
            token TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    cur.execute(f"""
        CREATE TABLE IF NOT EXISTS {SCHEMA}.widget_leads (
            id SERIAL PRIMARY KEY,
            widget_id INTEGER NOT NULL,
            phone TEXT DEFAULT '',
            email TEXT DEFAULT '',
            name TEXT DEFAULT '',
            referrer TEXT DEFAULT '',
            utm_source TEXT DEFAULT '',
            utm_medium TEXT DEFAULT '',
            utm_campaign TEXT DEFAULT '',
            page_url TEXT DEFAULT '',
            ip TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)

def generate_script(token, competitors_list):
    competitors_json = json.dumps(competitors_list, ensure_ascii=False)
    endpoint = os.environ.get("WIDGET_ENDPOINT", "")
    script = f"""(function() {{
  var TOKEN = "{token}";
  var COMPETITORS = {competitors_json};
  var ENDPOINT = "{endpoint}";

  function getUtm() {{
    var params = {{}};
    var search = window.location.search.replace('?', '');
    if (!search) return params;
    search.split('&').forEach(function(p) {{
      var kv = p.split('=');
      if (kv[0] && kv[0].indexOf('utm_') === 0) {{
        params[kv[0]] = decodeURIComponent(kv[1] || '');
      }}
    }});
    return params;
  }}

  function detectCompetitor() {{
    var ref = document.referrer || '';
    for (var i = 0; i < COMPETITORS.length; i++) {{
      if (ref.indexOf(COMPETITORS[i]) !== -1) return COMPETITORS[i];
    }}
    return '';
  }}

  function extractField(form, patterns) {{
    var inputs = form.querySelectorAll('input, textarea');
    for (var i = 0; i < inputs.length; i++) {{
      var el = inputs[i];
      var name = (el.name || el.id || el.placeholder || '').toLowerCase();
      for (var j = 0; j < patterns.length; j++) {{
        if (name.indexOf(patterns[j]) !== -1) return el.value || '';
      }}
    }}
    return '';
  }}

  function extractPhone(form) {{
    var tel = form.querySelector('input[type=tel]');
    if (tel && tel.value) return tel.value;
    return extractField(form, ['phone', 'tel', 'телефон', 'моб', 'mob']);
  }}

  function extractEmail(form) {{
    var em = form.querySelector('input[type=email]');
    if (em && em.value) return em.value;
    return extractField(form, ['email', 'mail', 'почта', 'e-mail']);
  }}

  function extractName(form) {{
    return extractField(form, ['name', 'имя', 'фио', 'fio', 'fname', 'fullname', 'ваше имя']);
  }}

  function sendLead(data) {{
    var xhr = new XMLHttpRequest();
    var url = ENDPOINT + '?action=lead';
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(data));
  }}

  function attachForm(form) {{
    if (form.__lcAttached) return;
    form.__lcAttached = true;
    form.addEventListener('submit', function() {{
      var utm = getUtm();
      sendLead({{
        token: TOKEN,
        phone: extractPhone(form),
        email: extractEmail(form),
        name: extractName(form),
        referrer: document.referrer || '',
        competitor: detectCompetitor(),
        utm_source: utm.utm_source || '',
        utm_medium: utm.utm_medium || '',
        utm_campaign: utm.utm_campaign || '',
        page_url: window.location.href
      }});
    }});
  }}

  function attachAll() {{
    var forms = document.querySelectorAll('form');
    for (var i = 0; i < forms.length; i++) attachForm(forms[i]);
  }}

  attachAll();

  var obs = new MutationObserver(attachAll);
  obs.observe(document.body, {{ childList: true, subtree: true }});
}})();
"""
    return script

def handler(event: dict, context) -> dict:
    """Управляет виджетами: создание, список, лиды, генерация JS-скрипта для вставки на сайт клиента."""
    json_headers = dict(CORS_HEADERS)
    json_headers["Content-Type"] = "application/json"

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "")

    if method == "OPTIONS":
        return {"statusCode": 200, "headers": json_headers, "body": ""}

    conn = get_conn()
    cur = conn.cursor()
    ensure_tables(cur)
    conn.commit()

    # GET /?action=script&token=TOKEN — вернуть JavaScript
    if method == "GET" and action == "script":
        token = params.get("token", "")
        cur.execute(
            f"SELECT id, competitors FROM {SCHEMA}.widgets WHERE token = %s",
            (token,),
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return {
                "statusCode": 404,
                "headers": json_headers,
                "body": json.dumps({"error": "Widget not found"}),
            }
        competitors_raw = row[1] or ""
        competitors_list = [c.strip() for c in competitors_raw.split(",") if c.strip()]
        script_code = generate_script(token, competitors_list)
        script_headers = dict(CORS_HEADERS)
        script_headers["Content-Type"] = "application/javascript"
        return {"statusCode": 200, "headers": script_headers, "body": script_code}

    # GET /?action=list — список виджетов
    if method == "GET" and action == "list":
        cur.execute(
            f"""
            SELECT id, name, site_url, competitors, token,
                   to_char(created_at, 'DD.MM.YYYY HH24:MI') as created_at
            FROM {SCHEMA}.widgets
            ORDER BY created_at DESC
            """
        )
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        widgets = [dict(zip(cols, row)) for row in rows]
        conn.close()
        return {
            "statusCode": 200,
            "headers": json_headers,
            "body": json.dumps({"widgets": widgets}, ensure_ascii=False),
        }

    # GET /?action=leads&widget_id=X — лиды виджета
    if method == "GET" and action == "leads":
        widget_id = params.get("widget_id", "")
        cur.execute(
            f"""
            SELECT id, widget_id, phone, email, name, referrer,
                   utm_source, utm_medium, utm_campaign, page_url, ip,
                   to_char(created_at, 'DD.MM.YYYY HH24:MI') as created_at
            FROM {SCHEMA}.widget_leads
            WHERE widget_id = %s
            ORDER BY created_at DESC
            LIMIT 200
            """,
            (widget_id,),
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

    # POST /?action=create — создать виджет
    if method == "POST" and action == "create":
        body = json.loads(event.get("body") or "{}")
        name = body.get("name", "").strip()
        site_url = body.get("site_url", "").strip()
        competitors = body.get("competitors", "").strip()
        if not name or not site_url:
            conn.close()
            return {
                "statusCode": 400,
                "headers": json_headers,
                "body": json.dumps({"error": "name и site_url обязательны"}, ensure_ascii=False),
            }
        token = secrets.token_hex(16)
        cur.execute(
            f"""
            INSERT INTO {SCHEMA}.widgets (name, site_url, competitors, token)
            VALUES (%s, %s, %s, %s)
            RETURNING id
            """,
            (name, site_url, competitors, token),
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return {
            "statusCode": 200,
            "headers": json_headers,
            "body": json.dumps({"id": new_id, "token": token}, ensure_ascii=False),
        }

    # POST /?action=lead — принять лид от скрипта
    if method == "POST" and action == "lead":
        body = json.loads(event.get("body") or "{}")
        token = body.get("token", "").strip()
        cur.execute(
            f"SELECT id FROM {SCHEMA}.widgets WHERE token = %s",
            (token,),
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return {
                "statusCode": 404,
                "headers": json_headers,
                "body": json.dumps({"error": "Widget not found"}, ensure_ascii=False),
            }
        widget_id = row[0]
        ip = ""
        try:
            ip = event["requestContext"]["identity"]["sourceIp"] or ""
        except (KeyError, TypeError):
            pass
        cur.execute(
            f"""
            INSERT INTO {SCHEMA}.widget_leads
                (widget_id, phone, email, name, referrer,
                 utm_source, utm_medium, utm_campaign, page_url, ip)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                widget_id,
                body.get("phone", ""),
                body.get("email", ""),
                body.get("name", ""),
                body.get("referrer", ""),
                body.get("utm_source", ""),
                body.get("utm_medium", ""),
                body.get("utm_campaign", ""),
                body.get("page_url", ""),
                ip,
            ),
        )
        lead_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return {
            "statusCode": 200,
            "headers": json_headers,
            "body": json.dumps({"success": True, "id": lead_id}, ensure_ascii=False),
        }

    conn.close()
    return {
        "statusCode": 400,
        "headers": json_headers,
        "body": json.dumps({"error": "Unknown action or method"}, ensure_ascii=False),
    }
