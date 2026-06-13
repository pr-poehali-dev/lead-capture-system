"""Планировщик: каждый день в 8:00 запускает все задачи мониторинга."""
import json
import urllib.request

MONITOR_URL = "https://functions.poehali.dev/6fd4c8bd-5191-496b-bfcd-ed698a11e3a0"

HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
}


def handler(event: dict, context) -> dict:
    """Запускает все задачи мониторинга. Вызывается по расписанию раз в день."""
    body = json.dumps({"action": "autorun"}).encode()
    req = urllib.request.Request(
        f"{MONITOR_URL}?action=autorun",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        result = json.loads(resp.read().decode())

    return {
        "statusCode": 200,
        "headers": HEADERS,
        "body": json.dumps({
            "success": True,
            "tasks_run": result.get("tasks_run", 0),
            "total_found": result.get("total_found", 0),
        }, ensure_ascii=False),
    }
