#!/usr/bin/env bash
# يشغّل اختبارات الصلاحيات (RLS) على PostgreSQL مؤقت، بدون Docker.
# الاستخدام: npm run test:db   (يتطلب initdb/pg_ctl/psql في PATH أو في /usr/lib/postgresql/*/bin)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
export PATH="$PGBIN:$PATH"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-54329}"
cleanup() { pg_ctl -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
RUN_AS=()
if [ "$(id -u)" = "0" ]; then
  chown -R nobody "$TMP" 2>/dev/null || true
  RUN_AS=(runuser -u nobody --)
fi
"${RUN_AS[@]}" initdb -D "$TMP/data" -U postgres -A trust --locale=C.UTF-8 >/dev/null
"${RUN_AS[@]}" pg_ctl -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start -w >/dev/null
PSQL=(psql -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f "$ROOT/supabase/tests/00_supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
"${PSQL[@]}" -f "$ROOT/supabase/tests/01_helpers.sql"
for f in "$ROOT"/supabase/tests/*.test.sql; do "${PSQL[@]}" -f "$f"; done
"${PSQL[@]}" -f "$ROOT/supabase/tests/99_summary.sql"
