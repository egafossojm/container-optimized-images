# syntax=docker/dockerfile:1
# The line above turns on BuildKit. This file uses it for a script written
# between <<'EOF' and EOF, and for COPY --link.

# Template: Traefik. The official image runs as root. This file adds a user
# and a config file. Change the version on FROM, edit traefik.yml, then:
#   docker build --progress=plain -t my-traefik .
#   docker run --rm -p 8080:8080 my-traefik

FROM traefik:v3.7.13

LABEL org.opencontainers.image.title="traefik-proxy" \
      org.opencontainers.image.description="Production Traefik reference image. Listens on 8080 as uid 65532."

# The base image is Alpine and has addgroup/adduser.
# Create user id 65532. -S is a system account, -D skips a password,
# -H skips a home directory, -h /tmp is the home path, nologin blocks login.
RUN <<'EOF'
set -eu
addgroup -g 65532 -S traefik
adduser -S -D -H -u 65532 -G traefik -h /tmp -s /sbin/nologin traefik
EOF

# COPY the config and give it to that user. --link keeps it in its own layer.
COPY --link --chown=65532:65532 traefik.yml /etc/traefik/traefik.yml

USER traefik

EXPOSE 8080

STOPSIGNAL SIGTERM

# HEALTHCHECK runs Traefik's own ping command inside the container.
# Exit code 0 means the ping entrypoint answered. No extra download is required.
# --interval, --timeout, --start-period, --retries control the schedule.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["traefik", "healthcheck", "--ping"]

# /entrypoint.sh adjusts arguments, then replaces itself with the traefik binary.
# It does not need root. After that replacement, traefik is process 1.
# CMD points at the config file copied above.
ENTRYPOINT ["/entrypoint.sh"]
CMD ["--configFile=/etc/traefik/traefik.yml"]
