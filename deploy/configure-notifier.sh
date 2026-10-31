#!/usr/bin/env bash
# تنظیم متغیرهای اعلان پیام به تلگرام و ایمیل در سرور تولید
#   HOST=87.107.130.42 SSH_KEY=~/.ssh/azmayar_deploy bash deploy/configure-notifier.sh
set -euo pipefail
: "${HOST:?HOST را بده}"
KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"

# استخراج توکن بات از سرور پشتیبانی 162.35.19.85
BOT_TOKEN="${TELEGRAM_NOTIFY_BOT_TOKEN:-}"
if [ -z "$BOT_TOKEN" ]; then
  BOT_TOKEN=$(ssh -o BatchMode=yes root@162.35.19.85 "python3 -c 'import re; print(re.search(r\"TOKEN\s*=\s*[\x27\x22]([^\x27\x22]+)[\x27\x22]\", open(\"/home/hermes/azmayar-support-bot/bot.py\").read()).group(1))'" 2>/dev/null || true)
fi

SMTP_PASS_VAL="${SMTP_PASS:-}"

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
echo "TELEGRAM_NOTIFY_CHAT_ID=554318761" >> "\$TMP"
echo "TELEGRAM_API_BASE=http://162.35.19.85/tg-relay" >> "\$TMP"
echo "NOTIFY_EMAIL=azmayarapp@gmail.com" >> "\$TMP"
echo "SMTP_USER=azmayarapp@gmail.com" >> "\$TMP"
echo "SMTP_PASS=$SMTP_PASS_VAL" >> "\$TMP"
echo "SMTP_HOST=smtp.gmail.com" >> "\$TMP"
echo "SMTP_PORT=465" >> "\$TMP"

chown root:khanesh "\$TMP"
chmod 640 "\$TMP"
mv "\$TMP" "\$ENV"
echo "Notifier environment variables configured."
systemctl restart khanesh
sleep 4
systemctl is-active khanesh
REMOTE
