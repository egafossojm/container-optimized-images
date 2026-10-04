# syntax=docker/dockerfile:1
# The line above turns on BuildKit. This file uses it for an apk cache,
# a script written between <<'EOF' and EOF, and COPY --link.

# Template: Terraform. Stage 1 downloads the zip. Stage 2 keeps the binary.
# Change TERRAFORM_VERSION and both checksums together, then:
#   docker build --progress=plain -t my-terraform .
#   docker run --rm my-terraform

FROM alpine:3.24 AS fetch

ARG TARGETARCH
ARG TERRAFORM_VERSION=1.16.5

# unzip is installed because BusyBox on this Alpine does not include it.
# Versions are pinned. The cache mount is not saved in the image.
RUN --mount=type=cache,target=/var/cache/apk,sharing=locked \
    apk add --no-progress \
      ca-certificates=20260909-r0 \
      curl=8.22.0-r0 \
      unzip=6.0-r16

WORKDIR /out

# The sums come from the release file terraform_1.16.5_SHA256SUMS.
# sha256sum -c fails the build if the zip does not match. unzip runs only after that.
RUN <<'EOF'
set -eu
case "${TARGETARCH}" in
  amd64) sum=2bc2fcfff033265c9e02ca0351f01794eb122f62a9b2a49a3294b9e49eaab5e4 ;;
  arm64) sum=61a50b00485ee4810cf20581ef080fc54d34d666e175c58d9a10501c65c1ccde ;;
  *) echo "unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;;
esac
curl -fsSL --retry 5 --retry-delay 2 \
  -o terraform.zip \
  "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_${TARGETARCH}.zip"
printf '%s  %s\n' "${sum}" "terraform.zip" > checksum.txt
sha256sum -c checksum.txt
unzip -q terraform.zip
chmod 0555 terraform
EOF

FROM gcr.io/distroless/static-debian13:nonroot AS runtime

LABEL org.opencontainers.image.title="terraform" \
      org.opencontainers.image.description="Terraform v1.16.5 on distroless static, uid 65532. Checkpoint phone-home disabled."

COPY --link --from=fetch --chown=65532:65532 /out/terraform /terraform

USER 65532

# TF_IN_AUTOMATION=1: quieter logs, no prompts.
# CHECKPOINT_DISABLE=1: "terraform version" does not call HashiCorp.
# TF_PLUGIN_CACHE_DIR sits on /tmp, which this user can write. Mount a volume
# there if the cache should outlive the container.
ENV HOME=/home/nonroot \
    TF_IN_AUTOMATION=1 \
    CHECKPOINT_DISABLE=1 \
    TF_PLUGIN_CACHE_DIR=/tmp/terraform-plugins

ENTRYPOINT ["/terraform"]
CMD ["version"]
