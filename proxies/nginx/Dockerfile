# syntax=docker/dockerfile:1
# The line above turns on BuildKit. This file uses it for a script written
# between <<'EOF' and EOF, and for COPY --link.

# Template: Nginx as a non-root reverse proxy, stable branch 1.30.
# Change the version on FROM. Replace nginx.conf and index.html with yours, then:
#   docker build --progress=plain -t my-nginx .
#   docker run --rm -p 8080:8080 my-nginx

# Official Nginx on Alpine. The image already has user nginx, id 101, and wget.
# One stage is enough: nothing here needs a compiler.
FROM nginx:1.30.5-alpine3.24

LABEL org.opencontainers.image.title="nginx-proxy" \
      org.opencontainers.image.description="Production Nginx reference image. Master process runs as the existing nginx user on port 8080."

# Nginx writes temporary files and a pid file. User 101 cannot write the
# default directories, which are owned by root. /tmp is writable.
# This RUN creates those directories and gives them to nginx before USER below.
# <<'EOF' is the script. set -eu stops if mkdir or chown fails.
RUN <<'EOF'
set -eu
mkdir -p /tmp/nginx/client /tmp/nginx/proxy /tmp/nginx/fastcgi /tmp/nginx/uwsgi /tmp/nginx/scgi
chown -R nginx:nginx /tmp/nginx /var/cache/nginx /usr/share/nginx/html
EOF

# COPY replaces the config. --link stores it in its own layer, so an edit of
# the config does not repeat the mkdir above.
# index.html is owned by 101:101 (the nginx user) as it is copied.
COPY --link nginx.conf /etc/nginx/nginx.conf
COPY --link --chown=101:101 index.html /usr/share/nginx/html/index.html

# The official image's user nginx already exists. The process starts as that user.
USER nginx

# EXPOSE records 8080. Port 80 needs root. docker run -p publishes 8080.
EXPOSE 8080

# SIGQUIT is Nginx's graceful stop. Docker sends it when the container stops.
STOPSIGNAL SIGQUIT

# HEALTHCHECK runs wget inside the container on a timer.
# Exit code 0 means /health responded. 127.0.0.1 is the container itself.
# --interval, --timeout, --start-period, --retries: how often, how long one try
# may take, how long startup is ignored, and how many failures mark it unhealthy.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/health"]

# ENTRYPOINT is nginx. CMD turns the daemon mode off so nginx stays in the foreground.
# The image's /docker-entrypoint.sh is skipped. That script edits files as root.
# This config is already final. Square brackets start nginx directly, so it is
# process 1 and receives SIGQUIT.
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
