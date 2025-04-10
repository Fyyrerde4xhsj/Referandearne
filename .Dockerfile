FROM php:apache

# Copy application files
COPY . /var/www/html/

# Set proper permissions for web server
RUN chmod 777 /var/www/html \
    && touch /var/www/html/users.json /var/www/html/error.log \
    && chmod 666 /var/www/html/users.json /var/www/html/error.log

# Enable mod_rewrite
RUN a2enmod rewrite