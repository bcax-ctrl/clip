"""Alert rule engine + dispatch.

Rules are simple boolean expressions over a snapshot of metrics, e.g.:
    {"all": [{"metric": "rsi", "op": ">", "value": 70},
             {"metric": "sentiment", "op": "==", "value": "bullish"}]}
Supports "all" (AND) and "any" (OR) groups. Dispatch via email (SMTP, if
configured) is best-effort; browser push is delivered through the frontend by
polling the /api/alerts/triggered feed.
"""
from __future__ import annotations

import logging
import operator
import smtplib
import os
from email.mime.text import MIMEText
from typing import Any

logger = logging.getLogger("neuromax.alerts")

_OPS = {
    ">": operator.gt, ">=": operator.ge, "<": operator.lt,
    "<=": operator.le, "==": operator.eq, "!=": operator.ne,
}


def _cmp(left: Any, op: str, right: Any) -> bool:
    fn = _OPS.get(op)
    if fn is None:
        return False
    try:
        # Numeric compare when possible, else string compare.
        if isinstance(right, (int, float)) and not isinstance(left, (int, float)):
            left = float(left)
        return bool(fn(left, right))
    except (TypeError, ValueError):
        return bool(fn(str(left), str(right)))


def evaluate_rule(rule: dict[str, Any], metrics: dict[str, Any]) -> bool:
    """Evaluate an alert rule against a metrics snapshot."""
    def check(cond: dict[str, Any]) -> bool:
        return _cmp(metrics.get(cond["metric"]), cond["op"], cond["value"])

    if "all" in rule:
        return all(check(c) for c in rule["all"])
    if "any" in rule:
        return any(check(c) for c in rule["any"])
    if "metric" in rule:  # single condition
        return check(rule)
    return False


def metrics_from_analysis(analysis: dict[str, Any]) -> dict[str, Any]:
    """Flatten an /analyze result into a metric snapshot for rule evaluation."""
    findings = analysis.get("findings", {})
    tech = findings.get("technical", {})
    sent = findings.get("sentiment", {})
    insight = analysis.get("insight", {})
    return {
        "symbol": analysis.get("symbol"),
        "rsi": tech.get("rsi", 50),
        "macd_histogram": (tech.get("macd") or {}).get("histogram", 0),
        "bias": tech.get("bias", "neutral"),
        "sentiment": sent.get("label", "neutral"),
        "sentiment_score": sent.get("score", 0),
        "action": insight.get("action", "WATCH"),
        "risk_score": insight.get("risk_score", 5),
        "confidence": insight.get("confidence", 0),
    }


class AlertEngine:
    def send_email(self, to_addr: str, subject: str, body: str) -> bool:
        """Best-effort SMTP email. Configured via SMTP_* env vars."""
        host = os.getenv("SMTP_HOST")
        if not host or not to_addr:
            logger.info("email skipped (SMTP not configured)")
            return False
        try:
            msg = MIMEText(body)
            msg["Subject"] = subject
            msg["From"] = os.getenv("SMTP_FROM", "neuromax@localhost")
            msg["To"] = to_addr
            with smtplib.SMTP(host, int(os.getenv("SMTP_PORT", "587"))) as server:
                server.starttls()
                user, pw = os.getenv("SMTP_USER"), os.getenv("SMTP_PASS")
                if user and pw:
                    server.login(user, pw)
                server.send_message(msg)
            return True
        except Exception as exc:  # pragma: no cover - network dependent
            logger.warning("email send failed: %s", exc)
            return False
