# syntax=docker/dockerfile:1
# The line above turns on BuildKit. This file uses it for an apk cache,
# a script written between <<'EOF' and EOF, and COPY --link.

# Template: the kubectl client. Stage 1 downloads it. Stage 2 keeps only the binary.
# Change KUBECTL_VERSION and both checksums together, then:
#   docker build --progress=plain -t my-kubectl .
#   docker run --rm my-kubectl

# --- stage 1: download and verify -------------------------------------------
FROM alpine:3.24 AS fetch

# ARG is a variable that exists only during the build. It is not kept in the
# running container. Write it again after FROM; it does not carry over from outside.
# TARGETARCH is set by Docker to amd64 or arm64, so one file downloads the right binary.
ARG TARGETARCH
ARG KUBECTL_VERSION=1.37.0

# Install curl so the next RUN can download. The cache mount keeps the apk
# packages on the builder, not in this image. sharing=locked avoids two builds
# writing the same cache at once. Do not pass apk --no-cache; that disables the cache.
RUN --mount=type=cache,target=/var/cache/apk,sharing=locked \
    apk add --no-progress \
      ca-certificates=20260909-r0 \
      curl=8.22.0-r0

WORKDIR /out

# Download kubectl and check its sha256 before it is trusted.
# <<'EOF' is the script. The quotes keep Docker from editing $variables;
# the shell still fills in TARGETARCH and KUBECTL_VERSION.
# set -eu stops on the first error.
# The case picks the checksum for this CPU. An unknown CPU fails the build.
# printf writes "checksum  filename", which is the format sha256sum -c expects.
# chmod 0555: the file is readable and executable, and not writable.
RUN <<'EOF'
set -eu
case "${TARGETARCH}" in
  amd64) sum=6129359f4e1f3848a5572ccb0b26cf28b8ca08cef38c95a765b2f64a2c961a2f ;;
  arm64) sum=922df28df248cc00a9e025f947704f1d1482de64ece54cfe57e61f19eaf1eef3 ;;
  *) echo "unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;;
esac
curl -fsSL --retry 5 --retry-delay 2 \
  -o kubectl \
  "https://dl.k8s.io/release/v${KUBECTL_VERSION}/bin/linux/${TARGETARCH}/kubectl"
printf '%s  %s\n' "${sum}" "kubectl" > checksum.txt
sha256sum -c checksum.txt
chmod 0555 kubectl
EOF

# --- stage 2: the image you run ---------------------------------------------
# distroless/static has CA certificates, no shell, and no package manager.
# curl from stage 1 is not copied. The nonroot tag is user id 65532.
FROM gcr.io/distroless/static-debian13:nonroot AS runtime

LABEL org.opencontainers.image.title="kubectl" \
      org.opencontainers.image.description="kubectl v1.37.0 on distroless static, uid 65532. CA certificates included."

# COPY --from=fetch takes only the binary. --chown gives it to user 65532.
# --link stores it in its own layer.
COPY --link --from=fetch --chown=65532:65532 /out/kubectl /kubectl

USER 65532

# HOME and KUBECONFIG point at the writable home this image already has.
# Mount your kubeconfig there when you run the container. Do not COPY a kubeconfig into the image.
ENV HOME=/home/nonroot \
    KUBECONFIG=/home/nonroot/.kube/config

# ENTRYPOINT is kubectl. CMD prints the client version.
# docker run my-kubectl get pods replaces CMD and still runs kubectl.
ENTRYPOINT ["/kubectl"]
CMD ["version", "--client"]
