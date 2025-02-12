#!/bin/bash

# Set variables
BACKUP_DIR="/opt/backups/penyidik-toolkit"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup configuration files
tar -czf $BACKUP_DIR/config_$DATE.tar.gz \
    docker-compose.yml \
    Dockerfile.prod \
    nginx.conf \
    ssl/

# Backup volumes
docker run --rm \
    -v penyidik-toolkit-prod_nginx-cache:/source:ro \
    -v $BACKUP_DIR:/backup \
    alpine tar -czf /backup/volumes_$DATE.tar.gz -C /source .

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete 