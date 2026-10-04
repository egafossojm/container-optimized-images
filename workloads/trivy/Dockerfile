# syntax=docker/dockerfile:1
# The line above turns on BuildKit. This file uses it for an apk cache,
# a script written between <<'EOF' and EOF, and COPY --link.

# Template: Trivy, for scanning images. This image does not mount the Docker socket.
# Pass a tarball or a remote image name when you run it. Change TRIVY_VERSION
# and both checksums together, then:
#   docker build --progress=plain -t my-trivy .
#   docker run --rm my-trivy

FROM alpine:3.24 AS fetch

ARG TARGETARCH
ARG TRIVY_VERSION=0.75.0

RUN --mount=type=cache,target=/var/cache/apk,sharing=locked \
    apk add --no-progress \
      ca-certificates=20260909-r0 \
      curl=8.22.0-r0

WORKDIR /out

# Trivy's file names use Linux-64bit and Linux-ARM64.
# Docker's TARGETARCH uses amd64 and arm64. The case maps one to the other
# and selects the matching checksum. sha256sum -c fails the build on a mismatch.
RUN <<'EOF'
set -eu
case "${TARGETARCH}" in
  amd64)
    asset=Linux-64bit
    sum=c6e65abddb348e25f10549df887045629cf28cc72453cd1c63acb717316b3f3f
    ;;
  arm64)
    asset=Linux-ARM64
    sum=a1ee9f6ffb7d112b64ff726a2a0717c21175c1114361391f4a132956751a13b3
    ;;
  *) echo "unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;;
esac
file="trivy_${TRIVY_VERSION}_${asset}.tar.gz"
curl -fsSL --retry 5 --retry-delay 2 \
  -o "${file}" \
  "https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/${file}"
printf '%s  %s\n' "${sum}" "${file}" > checksum.txt
sha256sum -c checksum.txt
tar -xzf "${file}"
chmod 0555 trivy
EOF

FROM gcr.io/distroless/static-debian13:nonroot AS runtime

LABEL org.opencontainers.image.title="trivy" \
      org.opencontainers.image.description="Trivy v0.75.0 on distroless static, uid 65532."

COPY --link --from=fetch --chown=65532:65532 /out/trivy /trivy

USER 65532

# TRIVY_SKIP_VERSION_CHECK=1: "trivy --version" does not call the network.
# A real scan downloads the vulnerability database into TRIVY_CACHE_DIR.
# That path is under the writable home. Mount a volume if the database should be kept.
ENV HOME=/home/nonroot \
    TRIVY_CACHE_DIR=/home/nonroot/.cache/trivy \
    TRIVY_SKIP_VERSION_CHECK=1

ENTRYPOINT ["/trivy"]
CMD ["--version"]
