#!/usr/bin/env bash
# گواهی HTTPS (Let's Encrypt). روی سرور، بعد از اینکه DNS دامنه به همین سرور اشاره کرد.
#   DOMAIN=azmayarapp.ir EMAIL=you@example.com bash deploy/https.sh
set -euo pipefail
DOMAIN="${DOMAIN:-azmayarapp.ir}"
: "${EMAIL:?EMAIL را بده}"
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" -m "$EMAIL" --agree-tos --no-eff-email --redirect -n
systemctl list-timers | grep -i certbot || true
