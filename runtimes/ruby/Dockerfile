# syntax=docker/dockerfile:1
# The line above turns on BuildKit. This file uses it for a script written
# between <<'EOF' and EOF, download caches that are not saved in the image, and COPY --link.

# Template: a Ruby app served by Puma.
# Compilers stay in the first stage. The second stage only runs Puma.
# Change both Ruby versions together. Replace the Gemfile and config.ru, then:
#   docker build --progress=plain -t my-ruby .
#   docker run --rm -p 8080:8080 my-ruby

# --- stage 1: install gems --------------------------------------------------
FROM ruby:3.4.11-slim-bookworm AS build

# ENV for the install.
# DEBIAN_FRONTEND=noninteractive: apt must not ask questions.
# BUNDLE_PATH: where gems are installed.
# BUNDLE_WITHOUT=development:test: skip gems in those groups.
# BUNDLE_DEPLOYMENT=1: install exactly what Gemfile.lock says.
# BUNDLE_JOBS and MAKEFLAGS limit parallel work.
ENV DEBIAN_FRONTEND=noninteractive \
    BUNDLE_PATH=/usr/local/bundle \
    BUNDLE_WITHOUT=development:test \
    BUNDLE_DEPLOYMENT=1 \
    BUNDLE_JOBS=4 \
    MAKEFLAGS=-j2

WORKDIR /app

# Some gems (Puma's nio4r) compile C code, so this stage needs a compiler.
# The versions are pinned. They are not installed again in the runtime stage.
# Cache mounts keep apt's download folders on the builder, not in the image.
# sharing=locked: apt corrupts those folders if two builds use them at once.
# There is no "rm" of the apt lists: they live on the mount, so they are
# already absent from the saved layer. Deleting them would wipe the cache.
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    <<'EOF'
set -eu
apt-get update
apt-get install -y --no-install-recommends \
    g++=4:12.2.0-3 \
    gcc=4:12.2.0-3 \
    libc6-dev=2.36-9+deb12u14 \
    make=4.3-4.1
EOF

# Gemfile and lockfile before application code, so a code edit does not reinstall gems.
COPY --link Gemfile Gemfile.lock ./

# Mount only Bundler's download cache. Do not mount all of /usr/local/bundle:
# a mount disappears when RUN ends, and the installed gems would disappear with it.
RUN --mount=type=cache,target=/usr/local/bundle/cache,sharing=locked \
    bundle install

# --- stage 2: the image you run ---------------------------------------------
FROM ruby:3.4.11-slim-bookworm AS runtime

LABEL org.opencontainers.image.title="ruby-runtime" \
      org.opencontainers.image.description="Production Ruby reference image. Puma on Debian slim, uid 10001."

# Bundler installs executables under ruby/3.4.0/bin. 3.4.0 is the ABI folder
# for every 3.4 patch, including 3.4.11.
# GEM_HOME and GEM_PATH must point there or the puma program cannot find its gem.
# RACK_ENV=production turns off development reloading.
ENV BUNDLE_PATH=/usr/local/bundle \
    BUNDLE_WITHOUT=development:test \
    BUNDLE_DEPLOYMENT=1 \
    GEM_HOME=/usr/local/bundle/ruby/3.4.0 \
    GEM_PATH=/usr/local/bundle/ruby/3.4.0 \
    PATH="/usr/local/bundle/ruby/3.4.0/bin:${PATH}" \
    RACK_ENV=production

# Create user id 10001. The server runs as this user, not as root.
# nologin and --no-create-home: this account is not a login.
RUN <<'EOF'
set -eu
groupadd --gid 10001 app
useradd --uid 10001 --gid 10001 --home-dir /app --no-create-home --shell /usr/sbin/nologin app
EOF

WORKDIR /app

# Copy the installed gems from stage 1, then the app files.
# --chown sets the owner while copying. --link keeps each copy in its own layer.
COPY --link --from=build --chown=10001:10001 /usr/local/bundle /usr/local/bundle
COPY --link --chown=10001:10001 Gemfile Gemfile.lock config.ru ./

USER 10001

EXPOSE 8080

# SIGTERM asks Puma to finish requests and exit.
STOPSIGNAL SIGTERM

# HEALTHCHECK runs this Ruby command inside the container on a timer.
# It requests /health on 127.0.0.1 (the container itself) and exits 0 only on HTTP 200.
# --interval, --timeout, --start-period, --retries control the schedule.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD ["ruby", "-e", "require 'net/http'; require 'uri'; r = Net::HTTP.get_response(URI('http://127.0.0.1:8080/health')); exit(r.code == '200' ? 0 : 1)"]

# ENTRYPOINT is puma. CMD is the default bind address, environment, and thread count.
# Square brackets start puma directly, so it is process 1 and receives SIGTERM.
ENTRYPOINT ["puma"]
CMD ["-b", "tcp://0.0.0.0:8080", "-e", "production", "--threads", "2:4", "config.ru"]
