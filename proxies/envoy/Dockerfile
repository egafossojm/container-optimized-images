# syntax=docker/dockerfile:1
# The line above turns on BuildKit. This file uses it for COPY --link.

# Template: Envoy. The distroless image already runs as user id 65532 and has
# no shell, so this file only adds a config. Change the version on FROM, then:
#   docker build --progress=plain -t my-envoy .
#   docker run --rm -p 8080:8080 my-envoy

FROM envoyproxy/envoy:distroless-v1.39.2

LABEL org.opencontainers.image.title="envoy-proxy" \
      org.opencontainers.image.description="Production Envoy reference image. Distroless, uid 65532, listener on 8080."

# COPY the config over the path the official image already uses.
# The file is world-readable, which user 65532 can read.
# --link stores it in its own layer, so a newer Envoy base can reuse this
# config layer when the yaml did not change.
COPY --link envoy.yaml /etc/envoy/envoy.yaml

# The number matches the non-root account already in the distroless image.
USER 65532

EXPOSE 8080

STOPSIGNAL SIGTERM

# No HEALTHCHECK. That instruction runs a command inside the container.
# This image has no shell and no wget, so the command cannot run here.
# Call http://<container>:8080/ from outside.
# The admin port in the config is 127.0.0.1:9901, reachable only inside the container.

# ENTRYPOINT is the envoy binary. CMD is the config path and the log level.
# Square brackets start envoy directly, so it is process 1 and receives SIGTERM.
ENTRYPOINT ["/usr/local/bin/envoy"]
CMD ["-c", "/etc/envoy/envoy.yaml", "--log-level", "info"]
