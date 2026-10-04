# syntax=docker/dockerfile:1
# The line above turns on BuildKit. This file uses it for an apk cache,
# a script written between <<'EOF' and EOF, and COPY --link.

# Template: Prometheus. Stage 1 downloads the binary. Stage 2 runs it.
# Change PROMETHEUS_VERSION and both checksums together. Edit prometheus.yml
# for your scrape targets, then:
#   docker build --progress=plain -t my-prometheus .
#   docker run --rm -p 9090:9090 my-prometheus

FROM alpine:3.24 AS fetch

ARG TARGETARCH
ARG PROMETHEUS_VERSION=3.15.0

RUN --mount=type=cache,target=/var/cache/apk,sharing=locked \
    apk add --no-progress \
      ca-certificates=20260909-r0 \
      curl=8.22.0-r0

WORKDIR /tmp

# Download the official tarball, check sha256, then copy just the prometheus binary to /tmp.
# The case fails the build on a CPU that has no checksum in this file.
RUN <<'EOF'
set -eu
case "${TARGETARCH}" in
  amd64) sum=2a542df32eac02ee17b9d844fb2aa1de00dafa5476579ba8a3ba862e9d572ea0 ;;
  arm64) sum=f1f90ec08e849d494ca66c611470afc50192f0355f1a61c33f2cbde02d067823 ;;
  *) echo "unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;;
esac
file="prometheus-${PROMETHEUS_VERSION}.linux-${TARGETARCH}.tar.gz"
curl -fsSL --retry 5 --retry-delay 2 \
  -o "${file}" \
  "https://github.com/prometheus/prometheus/releases/download/v${PROMETHEUS_VERSION}/${file}"
printf '%s  %s\n' "${sum}" "${file}" > checksum.txt
sha256sum -c checksum.txt
tar -xzf "${file}"
install -m 0555 "prometheus-${PROMETHEUS_VERSION}.linux-${TARGETARCH}/prometheus" /tmp/prometheus-bin
EOF

FROM gcr.io/distroless/static-debian13:nonroot AS runtime

LABEL org.opencontainers.image.title="prometheus" \
      org.opencontainers.image.description="Prometheus v3.15.0 on distroless static, uid 65532."

# The binary comes from stage 1. The config comes from this directory.
# --chown=65532:65532 matches the user below. --link keeps each file in its own layer.
COPY --link --from=fetch --chown=65532:65532 /tmp/prometheus-bin /prometheus
COPY --link --chown=65532:65532 prometheus.yml /etc/prometheus/prometheus.yml

USER 65532

# EXPOSE records 9090. docker run -p publishes it.
EXPOSE 9090

STOPSIGNAL SIGTERM

# No HEALTHCHECK. This image has no shell and no HTTP client, so Docker cannot
# run a check command inside it. Call http://<container>:9090/-/healthy from outside.
# The database directory in CMD is /home/nonroot/data, which user 65532 can create.

# ENTRYPOINT is the binary. CMD is the config path, the database path, a 24 hour
# retention (so a demo does not fill the disk), and the listen address.
ENTRYPOINT ["/prometheus"]
CMD ["--config.file=/etc/prometheus/prometheus.yml", "--storage.tsdb.path=/home/nonroot/data", "--storage.tsdb.retention.time=24h", "--web.listen-address=:9090"]
