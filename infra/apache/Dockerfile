# Apache2 + PHP 8.3 con SSL autofirmado
FROM php:8.3-apache

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/* \
 && a2enmod ssl proxy proxy_http headers rewrite status \
 && mkdir -p /etc/apache2/ssl \
 && openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/apache2/ssl/auipark.key -out /etc/apache2/ssl/auipark.crt \
      -subj "/C=ES/ST=Tarragona/L=Tarragona/O=AuiPark/OU=ASIX/CN=localhost" \
      -addext "subjectAltName=DNS:localhost,DNS:auipark.local,IP:127.0.0.1" \
 && chmod 600 /etc/apache2/ssl/auipark.key \
 && echo "ServerName localhost" > /etc/apache2/conf-available/servername.conf \
 && a2enconf servername \
 && sed -i 's/^ServerTokens .*/ServerTokens Prod/; s/^ServerSignature .*/ServerSignature Off/' /etc/apache2/conf-available/security.conf

COPY auipark.conf /etc/apache2/sites-available/auipark.conf
COPY html/ /var/www/html/
RUN a2dissite 000-default && a2ensite auipark

EXPOSE 80 443
