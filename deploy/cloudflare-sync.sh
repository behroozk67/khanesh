#!/usr/bin/env bash
# رنج‌های رسمی کلودفلر را می‌گیرد و هم UFW (۸۰/۴۴۳) هم real_ip نجینکس را با آن هماهنگ می‌کند.
# نصب روی سرور:  install -m 755 cloudflare-sync.sh /usr/local/sbin/cloudflare-sync.sh
# idempotent است؛ اگر دانلود ناقص/خراب بود هیچ چیزی را تغییر نمی‌دهد.
set -euo pipefail

REALIP_CONF=/etc/nginx/conf.d/cloudflare-realip.conf
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

curl -fsS -m 30 https://www.cloudflare.com/ips-v4 -o "$TMP/v4"
curl -fsS -m 30 https://www.cloudflare.com/ips-v6 -o "$TMP/v6"
{ cat "$TMP/v4"; echo; cat "$TMP/v6"; echo; } | tr -d '\r' | grep -E '^[0-9a-fA-F:.]+/[0-9]+$' | sort -u > "$TMP/all"

# محافظ: لیست خالی یا مشکوک ⇒ خروج بدون تغییر (وگرنه UFW قفل می‌شد)
n=$(wc -l < "$TMP/all")
if [ "$n" -lt 15 ] || [ "$n" -gt 60 ]; then echo "تعداد رنج غیرعادی ($n)؛ تغییری داده نشد" >&2; exit 1; fi
grep -q ':' "$TMP/all" && grep -qv ':' "$TMP/all" || { echo "IPv4 یا IPv6 در لیست نیست" >&2; exit 1; }

# ── UFW ──
ufw status | grep -qE '^(22/tcp|OpenSSH)' || { echo "قاعدهٔ SSH در UFW نیست؛ خروج" >&2; exit 1; }
added=0
while read -r ip; do
  if ! ufw status | grep -F "# Cloudflare" | grep -qF "$ip "; then
    ufw allow from "$ip" to any port 80,443 proto tcp comment Cloudflare >/dev/null; added=$((added+1))
  fi
done < "$TMP/all"
# رنج‌هایی که دیگر در لیست رسمی نیستند حذف شوند (از آخر به اول تا شماره‌ها نپرند)
removed=0
for num in $(ufw status numbered | grep -F "# Cloudflare" | sed -E 's/^\[ *([0-9]+)\].*/\1/' | sort -rn); do
  rng=$(ufw status numbered | grep -E "^\[ *$num\]" | awk '{print $(NF-2)}')
  if ! grep -qxF "$rng" "$TMP/all"; then ufw --force delete "$num" >/dev/null; removed=$((removed+1)); fi
done

# ── nginx real_ip ──
{
  echo "# تولیدشده با cloudflare-sync.sh — دستی ویرایش نکن"
  while read -r ip; do echo "set_real_ip_from $ip;"; done < "$TMP/all"
  echo "real_ip_header CF-Connecting-IP;"
  echo "real_ip_recursive on;"
} > "$TMP/realip.conf"

if ! cmp -s "$TMP/realip.conf" "$REALIP_CONF" 2>/dev/null; then
  [ -f "$REALIP_CONF" ] && cp "$REALIP_CONF" "$REALIP_CONF.bak"
  cp "$TMP/realip.conf" "$REALIP_CONF"
  if nginx -t 2>/dev/null; then systemctl reload nginx; echo "nginx real_ip به‌روز شد"
  else
    echo "nginx -t خطا داد؛ برگشت" >&2
    if [ -f "$REALIP_CONF.bak" ]; then mv "$REALIP_CONF.bak" "$REALIP_CONF"; else rm -f "$REALIP_CONF"; fi
    exit 1
  fi
fi
echo "cloudflare-sync: $n رنج؛ UFW +$added -$removed"
