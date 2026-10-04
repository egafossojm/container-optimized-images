# syntax=docker/dockerfile:1
# The line above turns on BuildKit. This file uses it for a script written
# between <<'EOF' and EOF, and for COPY --link.

# Template: Caddy on port 8080, as a user you create.
# The official image has no unprivileged user. Change the version on FROM,
# replace the Caddyfile, then:
#   docker build --progress=plain -t my-caddy .
#   docker run --rm -p 8080:8080 my-caddy

FROM caddy:2.11.6-alpine

LABEL org.opencontainers.image.title="caddy-proxy" \
      org.opencontainers.image.description="Production Caddy reference image. Listens on 8080 as uid 65532."

# Create user id 65532, the id Caddy has used for a non-root account.
# -S is a system account. -D skips a password. -H skips creating a home,
# because -h /config points the home at a directory the image already has.
# -s /sbin/nologin means this account cannot log in.
# chown runs now, as root, before USER. The Caddyfile copy below uses --chown
# instead of a second chown, which would store the file twice.
RUN <<'EOF'
set -eu
addgroup -g 65532 -S caddy
adduser -S -D -H -u 65532 -G caddy -h /config -s /sbin/nologin caddy
chown -R caddy:caddy /data /config /srv
EOF

# COPY the config. --link keeps it in its own layer. --chown sets the owner.
COPY --link --chown=65532:65532 Caddyfile /etc/caddy/Caddyfile

USER caddy

# ENV tells Caddy where it may write. With automatic HTTPS off, these stay empty.
# A deployment that turns TLS on still needs them writable.
ENV XDG_DATA_HOME=/data \
    XDG_CONFIG_HOME=/config

EXPOSE 8080

STOPSIGNAL SIGTERM

# HEALTHCHECK runs wget inside the container. Exit code 0 means /health responded.
# --interval, --timeout, --start-period, --retries control the schedule.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/health"]

# ENTRYPOINT is caddy. CMD is "run this config file".
# Square brackets start caddy directly, so it is process 1 and receives SIGTERM.
ENTRYPOINT ["caddy"]
CMD ["run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
