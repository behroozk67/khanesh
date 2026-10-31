#!/usr/bin/env bash
# روشن‌کردنِ ورود با کدِ پیامک روی سرورِ تولید — idempotent و با بکاپ.
#   HOST=<server-ip> SSH_KEY=~/.ssh/id_ed25519 bash deploy/enable-auth-otp.sh
#
# چرا اسکریپت و نه یک ssh تکی: پیستِ چندخطی در SSH به‌هم می‌ریزد و خطِ
# «AUTH_REQUIRED=true» دستی هم یک‌بار به خطِ بی‌معنی «AUT...ue» تبدیل شد
# (احراز هویت همان‌طور خاموش ماند). اینجا همه‌چیز در یک فایلِ کنترل‌شده است.
#
# کاری که می‌کند:
#   ۱. از /etc/khanesh/env بکاپ می‌گیرد.
#   ۲. خط‌های خراب (هر خطی که قالبِ KEY=VALUE ندارد) را حذف می‌کند.
#   ۳. AUTH_REQUIRED=true و SMSIR_PARAM=CODE را جایگزین/اضافه می‌کند.
#   ۴. khanesh را ری‌استارت و وضعیتش را چاپ می‌کند.
set -euo pipefail
: "${HOST:?HOST را بده}"
KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"

ssh -i "$KEY" -o StrictHostKeyChecking=accept-new -o BatchMode=yes "root@$HOST" 'bash -s' <<'REMOTE'
set -euo pipefail
ENV=/etc/khanesh/env
cp -a "$ENV" "$ENV.bak-$(date +%Y%m%d-%H%M%S)"
TMP=$(mktemp)
# فقط خط‌های معتبر (KEY=VALUE) می‌مانند؛ کلیدهای حساسِ موجود دست‌نخورده‌اند.
grep -E '^[A-Z0-9_]+=' "$ENV" | grep -vE '^(AUTH_REQUIRED|SMSIR_PARAM)=' > "$TMP"
echo 'AUTH_REQUIRED=true' >> "$TMP"
echo 'SMSIR_PARAM=CODE'   >> "$TMP"
chown root:khanesh "$TMP"
chmod 640 "$TMP"
mv "$TMP" "$ENV"
sed -E 's/(JWT_SECRET|API_KEY)=.*/\1=<set>/' "$ENV"
systemctl restart khanesh
sleep 4
systemctl is-active khanesh
curl -s -m8 http://127.0.0.1:8787/api/health | grep -oE '"authRequired":[a-z]+,"smsOtp":"[a-z]+"'
REMOTE
