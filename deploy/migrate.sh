#!/usr/bin/env bash
# انتقال به سرور جدید:
#   1) روی سرور جدید یک بار: OLD=<آی‌پی قدیم> NEW=<آی‌پی جدید> SSH_KEY=... bash deploy/migrate.sh
#   2) DNS دامنه را به آی‌پی جدید ببر؛ بعد bash deploy/https.sh روی سرور جدید.
# ترتیب: deploy.sh روی NEW (کد + setup)، سپس این اسکریپت (داده + env).
set -euo pipefail
: "${OLD:?}" "${NEW:?}"
KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
S=(-i "$KEY" -o StrictHostKeyChecking=accept-new)
TMP="$(mktemp -d)"

ssh "${S[@]}" "root@$OLD" 'systemctl stop khanesh; tar -C / -czf - etc/khanesh/env var/lib/khanesh; systemctl start khanesh' > "$TMP/state.tgz"
ssh "${S[@]}" "root@$NEW" 'systemctl stop khanesh 2>/dev/null || true; tar -C / -xzf - && chown -R khanesh:khanesh /var/lib/khanesh && chown root:khanesh /etc/khanesh/env && chmod 640 /etc/khanesh/env && systemctl start khanesh && systemctl is-active khanesh' < "$TMP/state.tgz"
rm -rf "$TMP"
echo "منتقل شد. حالا DNS را عوض کن."
