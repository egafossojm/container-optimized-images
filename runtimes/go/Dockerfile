# syntax=docker/dockerfile:1
# The line above turns on BuildKit. This file uses it for a script written
# between <<'EOF' and EOF, Go caches that are not saved in the image, and COPY --link.

# Template: a Go HTTP server compiled to one static binary.
# Change the Go version on the first FROM. The second FROM is the small image
# that actually runs. Replace main.go (and go.mod) with yours, then:
#   docker build --progress=plain -t my-go .
#   docker run --rm -p 8080:8080 my-go

# --- stage 1: compile -------------------------------------------------------
# FROM starts from the official Go toolchain on Alpine.
# Alpine is enough because the binary is built without C libraries.
# AS build names the stage so the next one can copy the binary out.
FROM golang:1.27.1-alpine3.24 AS build

# ENV sets variables for the compile.
# CGO_ENABLED=0: do not link the C library. The binary then runs on an image
# that has no C library.
# GOFLAGS=-trimpath: omit local folder names from the binary.
ENV CGO_ENABLED=0 \
    GOFLAGS=-trimpath

# WORKDIR creates /src and uses it as the current directory.
WORKDIR /src

# COPY go.mod first, alone. --link puts it in its own layer.
# When you add dependencies, copy go.sum on this same line so downloads stay pinned.
COPY --link go.mod ./

# RUN downloads modules. --mount=type=cache keeps the module folder on the
# builder machine, not in the image. sharing=locked: one build at a time.
RUN --mount=type=cache,target=/go/pkg/mod,sharing=locked \
    go mod download

# The rest of the source comes after the download, so a code edit does not
# download modules again.
COPY --link . ./

# Compile. The second cache mount keeps compiled packages between builds.
# <<'EOF' is the script. set -eu stops on the first error.
# -ldflags='-s -w' drops debug symbols so the binary is smaller.
# The binary is written to /out, a normal folder that is saved in the image.
# The cache folders are not.
RUN --mount=type=cache,target=/go/pkg/mod,sharing=locked \
    --mount=type=cache,target=/root/.cache/go-build,sharing=locked \
    <<'EOF'
set -eu
mkdir -p /out
go build -ldflags='-s -w' -o /out/app .
EOF

# --- stage 2: the image you run ---------------------------------------------
# distroless/static has CA certificates, no shell, and no package manager.
# The nonroot tag already contains user id 65532, home /home/nonroot.
FROM gcr.io/distroless/static-debian13:nonroot AS runtime

# LABEL is a title and description stored on the image. It does not start a process.
LABEL org.opencontainers.image.title="go-runtime" \
      org.opencontainers.image.description="Production Go reference image. Static binary, distroless, uid 65532."

# COPY --from=build takes only the binary. --chown=65532:65532 gives it to
# that user. --link keeps the binary in its own layer: a newer distroless
# base can reuse this layer when the binary itself did not change.
COPY --link --from=build --chown=65532:65532 /out/app /app

# USER 65532: the process is not root. The number matches the account in this image.
USER 65532

# EXPOSE records port 8080. docker run -p publishes it.
EXPOSE 8080

# STOPSIGNAL SIGTERM: Docker asks the program to finish and exit when you stop the container.
STOPSIGNAL SIGTERM

# No HEALTHCHECK line. A health check is a command Docker runs inside the
# container. This image has no shell and no tool that can make an HTTP request,
# so the command cannot run here. Call http://<container>:8080/health from outside.

# ENTRYPOINT is the program. There is no CMD: the binary takes no required arguments.
# Square brackets start /app directly, so it is process 1 and receives SIGTERM.
ENTRYPOINT ["/app"]
