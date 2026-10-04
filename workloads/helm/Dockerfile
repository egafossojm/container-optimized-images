# syntax=docker/dockerfile:1
# The line above turns on BuildKit. This file uses it for an apk cache,
# a script written between <<'EOF' and EOF, and COPY --link.

# Template: the Helm client. Stage 1 downloads the archive. Stage 2 keeps the binary.
# Change HELM_VERSION and both checksums together, then:
#   docker build --progress=plain -t my-helm .
#   docker run --rm my-helm

FROM alpine:3.24 AS fetch

# ARG exists only during the build. TARGETARCH is amd64 or arm64, set by Docker.
# Declare it in this stage. An ARG from before FROM is not visible here.
ARG TARGETARCH
ARG HELM_VERSION=4.3.0

# curl is needed for the download. The cache mount is not saved in the image.
RUN --mount=type=cache,target=/var/cache/apk,sharing=locked \
    apk add --no-progress \
      ca-certificates=20260909-r0 \
      curl=8.22.0-r0

WORKDIR /out

# Download the release tarball and check sha256 before unpacking it.
# The case selects the checksum for this CPU. An unknown CPU fails the build.
# sha256sum -c reads checksum.txt and exits non-zero if the file was altered.
# install -m 0555 copies the binary out of the tarball and marks it executable.
RUN <<'EOF'
set -eu
case "${TARGETARCH}" in
  amd64) sum=86584a54def73570558f66f5111cc53dfed56689637ae32c1201205d494f54fb ;;
  arm64) sum=31c5794dd55c66a51e6b7d2e2ac7a114ae8b1de41ff1d9ba51748ac973b06a08 ;;
  *) echo "unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;;
esac
curl -fsSL --retry 5 --retry-delay 2 \
  -o helm.tgz \
  "https://get.helm.sh/helm-v${HELM_VERSION}-linux-${TARGETARCH}.tar.gz"
printf '%s  %s\n' "${sum}" "helm.tgz" > checksum.txt
sha256sum -c checksum.txt
tar -xzf helm.tgz
install -m 0555 "linux-${TARGETARCH}/helm" /out/helm
EOF

# The runtime image has no shell and no curl. Only the helm binary is copied in.
FROM gcr.io/distroless/static-debian13:nonroot AS runtime

LABEL org.opencontainers.image.title="helm" \
      org.opencontainers.image.description="Helm v4.3.0 on distroless static, uid 65532."

COPY --link --from=fetch --chown=65532:65532 /out/helm /helm

USER 65532

# Helm writes cache and config under the home directory, which this user can write.
ENV HOME=/home/nonroot \
    HELM_CACHE_HOME=/home/nonroot/.cache/helm \
    HELM_CONFIG_HOME=/home/nonroot/.config/helm \
    HELM_DATA_HOME=/home/nonroot/.local/share/helm

ENTRYPOINT ["/helm"]
CMD ["version"]
