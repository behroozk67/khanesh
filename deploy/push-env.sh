#!/usr/bin/env bash
# کلیدها (AvalAI, SMS.ir, ...) را از khanesh-server/.env محلی روی /etc/khanesh/env سرور می‌ریزد.
# فقط کلیدهای فهرست‌شده؛ تنظیمات تولید (JWT_SECRET, AUTH_REQUIRED, ...) دست نمی‌خورند.
#   HOST=... SSH_KEY=... bash deploy/push-env.sh
set -euo pipefail
: "${HOST:?HOST را بده}"
KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEYS='AVALAI_API_KEY|TEXT_MODEL|VISION_MODEL|SMSIR_API_KEY|SMSIR_TEMPLATE_ID|SMSIR_PARAM|ZARINPAL_MERCHANT_ID|ZARINPAL_SANDBOX|SITE_ORIGIN'
grep -E "^($KEYS)=" "$ROOT/khanesh-server/.env" | tr -d '\r' | sed -E 's/[[:space:]]+#.*$//' | \
ssh -i "$KEY" "root@$HOST" 'set -e
  f=/etc/khanesh/env; cp $f $f.bak
  while IFS= read -r line; do
    k="${line%%=*}"; sed -i "/^$k=/d" $f; printf "%s\n" "$line" >> $f
  done
  systemctl restart khanesh && echo "env updated"'
