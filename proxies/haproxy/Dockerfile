# syntax=docker/dockerfile:1
# The line above turns on BuildKit. This file uses it for COPY --link.

# Template: HAProxy. The official image already runs as user haproxy, id 99.
# Change the version on FROM, replace haproxy.cfg, then:
#   docker build --progress=plain -t my-haproxy .
#   docker run --rm -p 8080:8080 my-haproxy

FROM haproxy:3.4.6-alpine3.24

LABEL org.opencontainers.image.title="haproxy-proxy" \
      org.opencontainers.image.description="Production HAProxy reference image. Uses the existing haproxy user (uid 99)."

# COPY replaces the config. COPY itself runs as root even when the image's
# default user is haproxy. The file is world-readable, which user 99 can read.
# --link stores the config in its own layer.
COPY --link haproxy.cfg /usr/local/etc/haproxy/haproxy.cfg

# Repeat the user so this file states who the process is. The account already exists.
USER haproxy

EXPOSE 8080

STOPSIGNAL SIGTERM

# HEALTHCHECK runs wget inside the container. Exit code 0 means /health responded.
# 127.0.0.1 is the container itself.
# --interval, --timeout, --start-period, --retries control the schedule.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/health"]

# ENTRYPOINT is the official script. It only adds -W -db (master-worker mode,
# stay in the foreground) and then replaces itself with haproxy.
# That replacement is why haproxy becomes process 1 and receives SIGTERM.
# CMD is the config path. You can pass a different config on docker run.
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["haproxy", "-f", "/usr/local/etc/haproxy/haproxy.cfg"]
