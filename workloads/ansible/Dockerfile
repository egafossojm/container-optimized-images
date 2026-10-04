# syntax=docker/dockerfile:1
# The line above turns on BuildKit. This file uses it for scripts written
# between <<'EOF' and EOF, download caches that are not saved in the image, and COPY --link.

# Template: ansible-core plus an OpenSSH client.
# Change the Python version on both FROM lines together.
# requirements.txt holds the pinned packages and their hashes.
# Edit requirements.in, then refresh requirements.txt with pip-compile
# --generate-hashes before you build:
#   docker build --progress=plain -t my-ansible .
#   docker run --rm my-ansible

# --- stage 1: install Python packages ---------------------------------------
FROM python:3.14.8-slim-bookworm AS build

# Same pip settings as the Python template. The download cache stays on the
# cache mount below, so PIP_NO_CACHE_DIR is not set.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_ROOT_USER_ACTION=ignore

WORKDIR /build

# Only the hashed requirements file. --link stores it in its own layer.
COPY --link requirements.txt ./

# Create a virtualenv and install exactly the hashed packages.
# --only-binary=:all: uses wheels, so this stage needs no compiler.
# pip is removed so the running image cannot install more packages.
RUN --mount=type=cache,target=/root/.cache/pip \
    <<'EOF'
set -eu
python -m venv /opt/venv
/opt/venv/bin/pip install --require-hashes --only-binary=:all: -r requirements.txt
/opt/venv/bin/pip uninstall -y pip setuptools
EOF

# --- stage 2: the image you run ---------------------------------------------
# Same Python tag as stage 1 so the virtualenv's python path still exists.
FROM python:3.14.8-slim-bookworm AS runtime

LABEL org.opencontainers.image.title="ansible" \
      org.opencontainers.image.description="ansible-core on Debian slim with OpenSSH client, uid 10001."

# PATH puts the virtualenv's ansible programs first.
# ANSIBLE_LOCAL_TEMP is a writable directory for Ansible's scratch files.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:${PATH}" \
    DEBIAN_FRONTEND=noninteractive \
    ANSIBLE_LOCAL_TEMP=/tmp/ansible

# OpenSSH is installed here because Ansible uses it when the container runs.
# It is not needed to build the virtualenv, so it is not in stage 1.
# Cache mounts keep apt's files on the builder. Do not delete /var/lib/apt/lists:
# that folder is the mount, and deleting it would wipe the cache. It is not
# saved in the image either.
# The last lines create user id 10001 with a home directory, because Ansible
# writes under the home. nologin means the account cannot log in.
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    <<'EOF'
set -eu
apt-get update
apt-get install -y --no-install-recommends \
    openssh-client=1:9.2p1-2+deb12u10
groupadd --gid 10001 app
useradd --uid 10001 --gid 10001 --home-dir /home/app --create-home --shell /usr/sbin/nologin app
EOF

COPY --link --from=build --chown=10001:10001 /opt/venv /opt/venv

USER 10001
WORKDIR /work
ENV HOME=/home/app

# There is no ENTRYPOINT on purpose. ansible, ansible-playbook, and
# ansible-galaxy are all valid programs. CMD is the default: print the version.
# docker run my-ansible ansible-playbook site.yml replaces that default.
# Square brackets start the program directly, with no shell in front.
CMD ["ansible", "--version"]
