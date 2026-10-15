#!/usr/bin/env bash
# استقرار از ماشین توسعه: بیلد، آپلود، نصب وابستگی، ری‌استارت.
#   HOST=87.107.130.42 SSH_KEY=~/.ssh/azmayar_deploy bash deploy/deploy.sh
# برای سرور جدید فقط HOST را عوض کن. اولین بار setup.sh هم روی سرور اجرا می‌شود (idempotent).
set -euo pipefail
: "${HOST:?HOST را بده}"
KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
DOMAIN="${DOMAIN:-azmayarapp.ir}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SSH=(ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "root@$HOST")
SCP=(scp -i "$KEY" -o StrictHostKeyChecking=accept-new)

echo "› بیلد فرانت"
(cd "$ROOT/khanesh" && npm ci --silent && npm run build --silent)

TMP="$(mktemp -d)"
tar -C "$ROOT/khanesh-server" --exclude=node_modules --exclude=.env --exclude='database.sqlite*' \
    --exclude=promptfoo --exclude='*.test.js' -czf "$TMP/app.tgz" .
tar -C "$ROOT/khanesh/dist" -czf "$TMP/web.tgz" .
tar -C "$ROOT" -czf "$TMP/deploy.tgz" deploy

echo "› آپلود"
"${SCP[@]}" "$TMP"/*.tgz "root@$HOST:/tmp/"
rm -rf "$TMP"

echo "› آماده‌سازی و نصب روی سرور"
"${SSH[@]}" "DOMAIN=$DOMAIN bash -s" <<'REMOTE'
set -euo pipefail
mkdir -p /tmp/khdeploy && tar -xzf /tmp/deploy.tgz -C /tmp/khdeploy
bash /tmp/khdeploy/deploy/setup.sh
systemctl stop khanesh 2>/dev/null || true
rm -rf /opt/khanesh/app/* /opt/khanesh/web/*
tar -xzf /tmp/app.tgz -C /opt/khanesh/app
tar -xzf /tmp/web.tgz -C /opt/khanesh/web
chown -R khanesh:khanesh /opt/khanesh
cd /opt/khanesh/app
sudo -u khanesh npm ci --omit=dev --no-audit --no-fund || sudo -u khanesh npm install --omit=dev --no-audit --no-fund
# باینری آمادهٔ sqlite3 به glibc>=2.38 نیاز دارد؛ Ubuntu 22.04 ندارد ⇒ روی خودِ سرور کامپایل می‌شود
sudo -u khanesh npm rebuild sqlite3 --build-from-source >/dev/null
systemctl restart khanesh
sleep 4
systemctl is-active khanesh
curl -s -m5 http://127.0.0.1:8787/api/health | head -c 400; echo
rm -f /tmp/app.tgz /tmp/web.tgz /tmp/deploy.tgz
REMOTE
