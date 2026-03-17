#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec upay-gateway-postgres-1 pg_dump -U upay upay_gateway > backups/db_$DATE.sql
echo "Backup saved: backups/db_$DATE.sql"
