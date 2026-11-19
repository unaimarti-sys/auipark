# Copia diaria de la base de datos de Supabase con pg_dump (cliente de PostgreSQL 17)
FROM postgres:17-alpine
RUN apk add --no-cache tzdata
COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh
ENTRYPOINT ["/usr/local/bin/backup.sh"]
