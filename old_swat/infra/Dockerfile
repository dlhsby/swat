FROM php:5.6-apache

# php:5.6-apache is built on Debian "stretch", now EOL — its packages moved to
# archive.debian.org. Repoint apt there, drop the non-existent stretch-updates,
# and skip Valid-Until checks (the archived Release files are expired).
RUN echo 'deb [trusted=yes] http://archive.debian.org/debian stretch main' > /etc/apt/sources.list \
    && echo 'deb [trusted=yes] http://archive.debian.org/debian-security stretch/updates main' >> /etc/apt/sources.list \
    && printf 'Acquire::Check-Valid-Until "false";\n' > /etc/apt/apt.conf.d/99archive \
    && apt-get update \
    && apt-get install -y \
        libpng-dev \
        libjpeg62-turbo-dev \
        libcurl4-openssl-dev \
    && rm -rf /var/lib/apt/lists/*

# PHP extensions used by CodeIgniter 2.1.4 + app libraries:
#   mysql/mysqli -> DB driver, gd -> Image_lib/barcode, mbstring -> Zend StringUtils, curl -> nusoap
RUN docker-php-ext-configure gd --with-jpeg-dir=/usr/include/ \
    && docker-php-ext-install mysql mysqli gd mbstring curl

# PHP 5.6 warns when date.timezone is unset; Surabaya -> Asia/Jakarta
RUN printf 'date.timezone = Asia/Jakarta\n' > /usr/local/etc/php/conf.d/timezone.ini

# Enable mod_rewrite and allow the app's .htaccess files to take effect
RUN a2enmod rewrite \
    && sed -ri -e 's!AllowOverride None!AllowOverride All!g' /etc/apache2/apache2.conf

# App root (index.php) is mounted at the default Apache document root /var/www/html
WORKDIR /var/www/html
