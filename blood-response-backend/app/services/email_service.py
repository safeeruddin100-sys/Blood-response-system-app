import asyncio
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings


async def send_otp_email(to_email: str, otp: str, full_name: str = "User") -> bool:
    """Send an OTP email through the configured SMTP server."""
    if not all(
        (
            settings.SMTP_HOST,
            settings.SMTP_USER,
            settings.SMTP_PASSWORD,
            settings.OTP_EMAIL_FROM,
        )
    ):
        print(
            "[WARN] SMTP settings are incomplete. Set SMTP_HOST, SMTP_USER, "
            "SMTP_PASSWORD, and OTP_EMAIL_FROM in .env."
        )
        return False

    sender_email = settings.OTP_EMAIL_FROM
    subject = "Blood Response System - Your OTP Code"
    body = f"""Assalamu Alaikum {full_name},

Your OTP verification code for Blood Response System (Alkhidmat Foundation) is:

        ------------------
         {otp}
        ------------------

This code is valid for 10 minutes.
Do not share this code with anyone.

Alkhidmat Foundation Pakistan
"""
    msg = MIMEMultipart()
    msg["From"] = sender_email
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    def _send():
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(sender_email, to_email, msg.as_string())

    try:
        await asyncio.get_event_loop().run_in_executor(None, _send)
        print(f"OTP email sent to {to_email}")
        return True
    except Exception as e:
        print(f"Email send failed: {e}")
        return False
