#!/usr/bin/env bash
# آماده‌سازی یک Ubuntu 22.04/24.04 تمیز برای خوانش. روی سرور، با root اجرا می‌شود؛ تکرارش بی‌خطر است.
# چیدمان (همه‌چیز که باید همراهِ سرور جابه‌جا شود، فقط در دو مسیر است):
#   /opt/khanesh/app   کدِ سرور (هر استقرار جایگزینش می‌کند)
#   /opt/khanesh/web   بیلدِ فرانت
#   /var/lib/khanesh   دیتابیس SQLite  ← داده
#   /etc/khanesh/env   رازها و تنظیمات   ← پیکربندی
set -euo pipefail
DOMAIN="${DOMAIN:-azmayarapp.ir}"
HERE="$(cd "$(dirname "$0")" && pwd)"

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl ca-certificates gnupg nginx certbot python3-certbot-nginx ufw build-essential openssl

if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

id khanesh >/dev/null 2>&1 || useradd --system --home /opt/khanesh --shell /usr/sbin/nologin khanesh
mkdir -p /opt/khanesh/app /opt/khanesh/web /var/lib/khanesh /etc/khanesh
chown -R khanesh:khanesh /opt/khanesh /var/lib/khanesh
chmod 750 /var/lib/khanesh

# فایل محیطی: فقط اگر نبود ساخته می‌شود (مقدارهای واقعی را deploy.sh از .envِ محلی می‌ریزد)
if [ ! -f /etc/khanesh/env ]; then
  cat > /etc/khanesh/env <<EOF
NODE_ENV=production
PORT=8787
DB_FILE=/var/lib/khanesh/database.sqlite
TRUST_PROXY=1
ALLOWED_ORIGINS=https://${DOMAIN},https://www.${DOMAIN},http://${DOMAIN}
JWT_SECRET=$(openssl rand -hex 32)
AUTH_REQUIRED=false
EOF
fi
chown root:khanesh /etc/khanesh/env
chmod 640 /etc/khanesh/env

install -m 644 "$HERE/khanesh.service" /etc/systemd/system/khanesh.service
# ⚠️ اگر certbot بخش 443 را اضافه کرده، بازنویسی آن را پاک می‌کند و HTTPS می‌افتد؛ پس فقط در نصبِ اول.
if ! grep -q ssl_certificate /etc/nginx/sites-available/khanesh 2>/dev/null; then
  sed "s/__DOMAIN__/${DOMAIN}/g" "$HERE/nginx.conf" > /etc/nginx/sites-available/khanesh
fi
ln -sf /etc/nginx/sites-available/khanesh /etc/nginx/sites-enabled/khanesh
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl daemon-reload
systemctl enable khanesh nginx
systemctl reload nginx

# فایروال: فقط SSH و وب
ufw allow OpenSSH >/dev/null
# ⚠️ پشتِ Cloudflare، ۸۰/۴۴۳ فقط برای رنج‌های Cloudflare باز است (cloudflare-sync.sh، قاعده‌های با comment «Cloudflare»).
#   «Nginx Full» آن را به Anywhere برمی‌گرداند — پس فقط وقتی هنوز هیچ قاعدهٔ Cloudflareای نیست (نصبِ اول).
if ! ufw status | grep -q Cloudflare; then
  ufw allow 'Nginx Full' >/dev/null
fi
ufw --force enable >/dev/null
echo "setup OK"
