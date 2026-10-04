# syntax=docker/dockerfile:1
# The line above turns on BuildKit. This file uses it for COPY --link.

# Template: Apache httpd as a non-root server on port 8080.
# Change the version on FROM. Replace httpd.conf and index.html, then:
#   docker build --progress=plain -t my-apache .
#   docker run --rm -p 8080:8080 my-apache

# Official httpd on Alpine. User www-data already exists, id 82.
FROM httpd:2.4.69-alpine3.24

LABEL org.opencontainers.image.title="apache-proxy" \
      org.opencontainers.image.description="Production Apache httpd reference image. Runs as the existing www-data user (uid 82)."

# COPY replaces the stock config. That stock file listens on port 80 and
# starts as root so it can drop to another user. This config listens on 8080
# and does not switch user, because the process below is already www-data.
# --link stores each file in its own layer.
# --chown=82:82 is www-data's user id and group id.
COPY --link httpd.conf /usr/local/apache2/conf/httpd.conf
COPY --link --chown=82:82 index.html /usr/local/apache2/htdocs/index.html

USER www-data

EXPOSE 8080

# SIGWINCH is Apache's graceful stop. Docker sends it when the container stops.
STOPSIGNAL SIGWINCH

# HEALTHCHECK runs wget inside the container. Exit code 0 means /health responded.
# 127.0.0.1 is the container itself.
# --interval, --timeout, --start-period, --retries control the schedule.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/health"]

# ENTRYPOINT is httpd. CMD ["-D", "FOREGROUND"] keeps it in the foreground.
# The image's httpd-foreground helper is a shell script. Calling httpd directly
# makes httpd process 1, so it receives SIGWINCH. Square brackets mean no shell.
ENTRYPOINT ["httpd"]
CMD ["-D", "FOREGROUND"]
