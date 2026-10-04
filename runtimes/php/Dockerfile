# syntax=docker/dockerfile:1
# The line above turns on BuildKit. This file uses it for a Composer cache
# that is not saved in the image, and for COPY --link.

# Template: PHP-FPM. This process speaks FastCGI on port 9000. It is not a website.
# Put the nginx template in front of it. Change the PHP and Composer versions, then:
#   docker build --progress=plain -t my-php .
#   docker run --rm -p 9000:9000 my-php

# --- stage 1: install PHP libraries -----------------------------------------
# Composer is only in this stage. The image you run does not contain it.
FROM composer:2.9.8 AS vendor

WORKDIR /app

# composer.json lists the packages. composer.lock pins the exact versions.
COPY --link composer.json composer.lock ./

# --mount=type=cache keeps Composer's downloads on the builder, not in the image.
# sharing=locked: one build uses that folder at a time.
# --no-dev skips development packages. --no-scripts does not run code from those packages.
# dump-autoload writes a class map so PHP does not scan the filesystem on each request.
RUN --mount=type=cache,target=/tmp/composer-cache,sharing=locked \
    COMPOSER_CACHE_DIR=/tmp/composer-cache \
    composer install --no-dev --no-interaction --no-progress --no-scripts --prefer-dist --no-autoloader \
 && composer dump-autoload --no-dev --classmap-authoritative --no-interaction

# --- stage 2: the image you run ---------------------------------------------
# Official PHP-FPM on Alpine. The image already has user www-data, id 82.
FROM php:8.5.11-fpm-alpine3.24 AS runtime

LABEL org.opencontainers.image.title="php-runtime" \
      org.opencontainers.image.description="Production PHP-FPM reference image. Runs as the existing www-data user (uid 82)."

# PHP reads extra ini files from this directory. The next COPY puts one there.
ENV PHP_INI_SCAN_DIR=/usr/local/etc/php/conf.d

WORKDIR /app

# Config files change less often than application code, so they are copied first.
# --link stores each file in its own layer.
# www.conf does not switch user: the process below is already www-data.
COPY --link php/zz-production.ini /usr/local/etc/php/conf.d/zz-production.ini
COPY --link php-fpm.d/docker.conf /usr/local/etc/php-fpm.d/docker.conf
COPY --link php-fpm.d/www.conf /usr/local/etc/php-fpm.d/www.conf

# vendor/ comes from stage 1. public/ is your PHP code and comes last.
# --chown=82:82 is www-data's user id and group id.
COPY --link --from=vendor --chown=82:82 /app/vendor /app/vendor
COPY --link --chown=82:82 public /app/public

# The official image already created www-data. Reuse it. Do not add a second user.
USER www-data

# EXPOSE records port 9000 (FastCGI), not 80 or 8080.
EXPOSE 9000

STOPSIGNAL SIGTERM

# HEALTHCHECK runs "php-fpm -t", which only checks that the config file is valid.
# Exit code 0 means the config loaded. This is not an HTTP check: nginx, in front,
# is the process that answers HTTP.
# --interval, --timeout, --start-period, --retries control the schedule.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["php-fpm", "-t"]

# ENTRYPOINT is php-fpm. CMD ["-F"] means stay in the foreground.
# The image's docker-php-entrypoint script is skipped so php-fpm itself is process 1
# and receives the stop signal. Square brackets mean no shell in front.
ENTRYPOINT ["php-fpm"]
CMD ["-F"]
