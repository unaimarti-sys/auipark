#!/bin/sh
# =====================================================================
#  AuiPark · Copia de seguridad diaria de Supabase (pg_dump)
#  Hace una copia al arrancar (RUN_ON_START) y después cada día a BACKUP_TIME.
#  Guarda el esquema y los datos de "public" comprimidos y borra los de más de N días.
# =====================================================================
set -u
: "${SUPABASE_DB_URL:?Falta SUPABASE_DB_URL}"
BACKUP_TIME="${BACKUP_TIME:-03:30}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

backup() {
  file="/backups/auipark_$(date +%Y-%m-%d_%H%M).sql.gz"
  echo "[$(date '+%F %T')] Iniciando copia → $file"
  if pg_dump "$SUPABASE_DB_URL" --schema=public --no-owner --no-privileges | gzip > "$file.tmp"; then
    mv "$file.tmp" "$file"
    echo "[$(date '+%F %T')] Copia correcta ($(du -h "$file" | cut -f1))"
  else
    rm -f "$file.tmp"
    echo "[$(date '+%F %T')] ERROR: la copia ha fallado"
  fi
  find /backups -name 'auipark_*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
}

seconds_until() {
  now=$(date +%s)
  target=$(date -d "$(date +%Y-%m-%d) $1" +%s 2>/dev/null || date -D '%Y-%m-%d %H:%M' -d "$(date +%Y-%m-%d) $1" +%s)
  [ "$target" -le "$now" ] && target=$((target + 86400))
  echo $((target - now))
}

[ "${RUN_ON_START:-true}" = "true" ] && backup
while true; do
  wait_s=$(seconds_until "$BACKUP_TIME")
  echo "[$(date '+%F %T')] Próxima copia en $((wait_s / 3600)) h $(((wait_s % 3600) / 60)) min"
  sleep "$wait_s"
  backup
done
