"""Функции для работы с лидами: создание и получение списка. v2"""
import json
import os
import psycopg2

SCHEMA = "t_p56466268_lead_capture_system"

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    method = event.get("httpMethod", "GET")

    if method == "GET":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""
            SELECT id, company_name, contact_name, phone, email,
                   source, status, amount, notes, score,
                   to_char(created_at, 'DD.MM.YYYY') as created_at
            FROM {SCHEMA}.leads
            ORDER BY created_at DESC
            LIMIT 100
            """
        )
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        leads = [dict(zip(cols, row)) for row in rows]
        conn.close()
        return {"statusCode": 200, "headers": headers, "body": json.dumps({"leads": leads}, ensure_ascii=False)}

    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        company_name = body.get("company_name", "").strip()
        contact_name = body.get("contact_name", "").strip()
        phone = body.get("phone", "").strip()
        email = body.get("email", "").strip()
        source = body.get("source", "Сайт")
        amount = int(body.get("amount") or 0)
        notes = body.get("notes", "").strip()

        if not company_name or not contact_name:
            return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Название компании и контакт обязательны"}, ensure_ascii=False)}

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""
            INSERT INTO {SCHEMA}.leads (company_name, contact_name, phone, email, source, amount, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (company_name, contact_name, phone, email, source, amount, notes),
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return {"statusCode": 201, "headers": headers, "body": json.dumps({"success": True, "id": new_id}, ensure_ascii=False)}

    return {"statusCode": 405, "headers": headers, "body": json.dumps({"error": "Method not allowed"})}