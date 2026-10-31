#!/usr/bin/env bash
# تنظیم متغیرهای اعلان پیام به تلگرام و ایمیل در سرور
#   HOST=<server-ip> SSH_KEY=<path-to-key> bash deploy/configure-notifier.sh
set -euo pipefail
: "${HOST:?HOST را بده}"
KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"

BOT_TOKEN="${TELEGRAM_NOTIFY_BOT_TOKEN:-}"
CHAT_ID="${TELEGRAM_NOTIFY_CHAT_ID:-}"
TG_RELAY="${TELEGRAM_API_BASE:-https://api.telegram.org}"
NOTIFY_EMAIL_ADDR="${NOTIFY_EMAIL:-}"
SMTP_USER_VAL="${SMTP_USER:-}"
SMTP_PASS_VAL="${SMTP_PASS:-}"
SMTP_HOST_VAL="${SMTP_HOST:-smtp.gmail.com}"
SMTP_PORT_VAL="${SMTP_PORT:-465}"

ssh -i "$KEY" -o StrictHostKeyChecking=accept-new -o BatchMode=yes "root@$HOST" "bash -s" <<REMOTE
set -euo pipefail
ENV=/etc/khanesh/env
cp -a "\$ENV" "\$ENV.bak-\$(date +%Y%m%d-%H%M%S)"
TMP=\$(mktemp)

# فیلتر متغیرهای قبلی اعلان
grep -E '^[A-Z0-9_]+=' "\$ENV" | grep -vE '^(TELEGRAM_NOTIFY_BOT_TOKEN|TELEGRAM_NOTIFY_CHAT_ID|TELEGRAM_API_BASE|NOTIFY_EMAIL|SMTP_USER|SMTP_PASS|SMTP_HOST|SMTP_PORT)=' > "\$TMP"

if [ -n "$BOT_TOKEN" ]; then
  echo "TELEGRAM_NOTIFY_BOT_TOKEN=$BOT_TOKEN" >> "\$TMP"
fi
if [ -n "$CHAT_ID" ]; then
  echo "TELEGRAM_NOTIFY_CHAT_ID=$CHAT_ID" >> "\$TMP"
fi
if [ -n "$TG_RELAY" ]; then
  echo "TELEGRAM_API_BASE=$TG_RELAY" >> "\$TMP"
fi
if [ -n "$NOTIFY_EMAIL_ADDR" ]; then
  echo "NOTIFY_EMAIL=$NOTIFY_EMAIL_ADDR" >> "\$TMP"
fi
if [ -n "$SMTP_USER_VAL" ]; then
  echo "SMTP_USER=$SMTP_USER_VAL" >> "\$TMP"
fi
if [ -n "$SMTP_PASS_VAL" ]; then
  echo "SMTP_PASS=$SMTP_PASS_VAL" >> "\$TMP"
fi
if [ -n "$SMTP_HOST_VAL" ]; then
  echo "SMTP_HOST=$SMTP_HOST_VAL" >> "\$TMP"
fi
if [ -n "$SMTP_PORT_VAL" ]; then
  echo "SMTP_PORT=$SMTP_PORT_VAL" >> "\$TMP"
fi

chown root:khanesh "\$TMP"
chmod 640 "\$TMP"
mv "\$TMP" "\$ENV"
echo "Notifier environment variables configured."
systemctl restart khanesh
sleep 4
systemctl is-active khanesh
REMOTE
