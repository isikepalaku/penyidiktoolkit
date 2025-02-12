#!/bin/bash

# Check container status
echo "Container Status:"
docker-compose ps

# Check resource usage
echo -e "\nResource Usage:"
docker stats penyidik-frontend --no-stream

# Check nginx status
echo -e "\nNginx Status:"
docker exec penyidik-frontend nginx -t

# Check SSL certificate expiry
echo -e "\nSSL Certificate Status:"
docker exec penyidik-frontend openssl x509 -in /etc/nginx/ssl/cert.pem -noout -dates

# Check disk space
echo -e "\nDisk Space:"
df -h /var/lib/docker 