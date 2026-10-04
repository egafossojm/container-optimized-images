# syntax=docker/dockerfile:1
# The line above turns on BuildKit. This file uses it for scripts written
# between <<'EOF' and EOF, Cargo caches that are not saved in the image, and COPY --link.

# Template: a Rust HTTP server.
# The binary links the C library, so the runtime image is distroless/cc
# (it has that library). distroless/static would be wrong for this binary.
# Change the Rust version on the first FROM. Replace src/ and Cargo.toml, then:
#   docker build --progress=plain -t my-rust .
#   docker run --rm -p 8080:8080 my-rust

# --- stage 1: compile -------------------------------------------------------
# FROM starts from the official Rust image on Debian slim. AS build names the stage.
FROM rust:1.99.0-slim-bookworm AS build

# Do not colorize Cargo logs. A container log has no terminal colors.
ENV CARGO_TERM_COLOR=never

WORKDIR /src

# COPY the manifest and the lockfile before the source code.
# --link stores them in their own layer.
# cargo fetch can then stay cached when only src/ changes.
COPY --link Cargo.toml Cargo.lock ./

# cargo refuses a package that has no source file. This stub exists only so
# the next command can download dependencies. The real src/ replaces it afterward.
# <<'EOF' is the script. set -eu stops if the write fails.
RUN <<'EOF'
set -eu
mkdir -p src
printf 'fn main() {}\n' > src/main.rs
EOF

# Download crates listed in Cargo.lock. --locked refuses to change the lockfile.
# The cache mounts keep the crate downloads on the builder, not in the image.
# sharing=locked: one build uses each cache folder at a time.
RUN --mount=type=cache,target=/usr/local/cargo/registry,sharing=locked \
    --mount=type=cache,target=/usr/local/cargo/git,sharing=locked \
    cargo fetch --locked

# Real source, after the download, so an edit here does not download crates again.
COPY --link src ./src

# Build the release binary. The target directory is a cache mount, so it is
# not saved in the image. cp copies the binary to /out while the mount is
# still visible. strip removes debug symbols.
RUN --mount=type=cache,target=/usr/local/cargo/registry,sharing=locked \
    --mount=type=cache,target=/usr/local/cargo/git,sharing=locked \
    --mount=type=cache,target=/tmp/cargo-target,sharing=locked \
    <<'EOF'
set -eu
mkdir -p /out
cargo build --locked --release --target-dir /tmp/cargo-target
cp /tmp/cargo-target/release/app /out/app
strip /out/app
EOF

# --- stage 2: the image you run ---------------------------------------------
# distroless/cc has the C library and CA certificates, and no shell.
# The nonroot tag is user id 65532.
FROM gcr.io/distroless/cc-debian13:nonroot AS runtime

LABEL org.opencontainers.image.title="rust-runtime" \
      org.opencontainers.image.description="Production Rust reference image. glibc-linked binary on distroless/cc, uid 65532."

# Only the binary is copied. --chown gives it to user 65532.
# --link keeps it in its own layer.
COPY --link --from=build --chown=65532:65532 /out/app /app

USER 65532

# EXPOSE records port 8080. docker run -p publishes it.
EXPOSE 8080

# STOPSIGNAL SIGTERM asks the program to exit when the container stops.
STOPSIGNAL SIGTERM

# No HEALTHCHECK. That instruction is a command Docker runs inside the container.
# This image has no shell, so the command cannot run here.
# Call http://<container>:8080/health from outside.

# ENTRYPOINT starts /app directly (square brackets, no shell), so it is process 1.
ENTRYPOINT ["/app"]
