# syntax=docker/dockerfile:1
# The line above turns on BuildKit. This file uses it for a script written
# between <<'EOF' and EOF, a pip cache that is not saved in the image, and COPY --link.

# Template: a Python app served by Gunicorn.
# Change the version on both FROM lines together when you want a newer Python.
# Replace app.py and requirements.txt with yours, then from this directory:
#   docker build --progress=plain -t my-python .
#   docker run --rm -p 8080:8080 my-python

# --- stage 1: install dependencies ------------------------------------------
# FROM starts this stage from a published Python image.
# 3.14.8 is the exact patch. slim-bookworm is a small Debian. AS build names
# the stage so the next one can copy the virtualenv out of it.
# Avoid the tag "latest": it can change without any edit to this file.
FROM python:3.14.8-slim-bookworm AS build

# ENV sets variables for the commands below.
# PYTHONDONTWRITEBYTECODE=1: do not write .pyc files.
# PIP_DISABLE_PIP_VERSION_CHECK=1: do not phone home to see if pip is old.
# PIP_ROOT_USER_ACTION=ignore: do not warn that pip is running as root during the build.
# DEBIAN_FRONTEND=noninteractive: if apt runs, it must not ask questions.
# The pip download cache is left on purpose. The cache mount below keeps it
# out of the image. Setting PIP_NO_CACHE_DIR would turn that cache off.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_ROOT_USER_ACTION=ignore \
    DEBIAN_FRONTEND=noninteractive

# WORKDIR creates /build and makes it the current directory.
# Later paths are relative to /build, not to whatever directory the base image used.
WORKDIR /build

# COPY copies requirements.txt from this directory into /build.
# --link stores that file in its own layer. If you later change an earlier
# line, Docker can keep this layer instead of copying the file again.
# Only the dependency list is copied here. Editing app.py does not reinstall packages.
COPY --link requirements.txt ./

# RUN executes this script while building and saves the result.
# --mount=type=cache attaches /root/.cache/pip on the builder machine.
# pip reuses wheels stored there. That folder is not written into the image.
# <<'EOF' starts a shell script. The quotes mean Docker does not edit the script.
# set -eu stops the script on the first error or the first empty variable.
# python -m venv creates an isolated package folder at /opt/venv.
# --require-hashes: pip refuses a package whose checksum is not in requirements.txt.
# --only-binary=:all:: install prebuilt wheels only, so no C compiler is needed.
# uninstall pip: the running app cannot install more packages later.
RUN --mount=type=cache,target=/root/.cache/pip \
    <<'EOF'
set -eu
python -m venv /opt/venv
/opt/venv/bin/pip install --require-hashes --only-binary=:all: -r requirements.txt
/opt/venv/bin/pip uninstall -y pip setuptools
EOF

# --- stage 2: the image you run ---------------------------------------------
# A second FROM starts a fresh image. pip and the build files stay behind.
# The same Python version is required so /opt/venv/bin/python still points
# at /usr/local/bin/python inside this image.
FROM python:3.14.8-slim-bookworm AS runtime

# LABEL stores a name and a description on the image. It does not change the process.
LABEL org.opencontainers.image.title="python-runtime" \
      org.opencontainers.image.description="Production Python reference image running Gunicorn as a non-root user"

# These variables are set in the running container.
# PYTHONUNBUFFERED=1 sends logs straight out, instead of holding them in a buffer.
# PATH lets later commands find gunicorn inside the virtualenv.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:${PATH}"

# Create a Linux user and group with id 10001. The server will run as this user.
# Root can change any file; this user cannot.
# 10001 is an ordinary user id (system accounts are usually below 1000).
# --no-create-home and nologin: nobody logs in as this account.
# set -eu again: stop if groupadd or useradd fails.
RUN <<'EOF'
set -eu
groupadd --gid 10001 app
useradd --uid 10001 --gid 10001 --home-dir /app --no-create-home --shell /usr/sbin/nologin app
EOF

WORKDIR /app

# COPY --from=build reads /opt/venv from stage 1, not from your project folder.
# --chown=10001:10001 makes user 10001 the owner as the files are copied.
# A later "chown" command would store a second full copy and make the image larger.
# --link keeps the virtualenv in its own layer, reusable when other lines change.
COPY --link --from=build --chown=10001:10001 /opt/venv /opt/venv

# Application code is last because it changes most often.
# Docker then rebuilds only this layer and reuses the virtualenv layer above.
COPY --link --chown=10001:10001 app.py ./

# USER applies to every following command, including the process that starts.
# The number is the user id. It still works if a future base image has no /etc/passwd.
USER 10001

# EXPOSE records that the app listens on 8080. It does not publish the port.
# Publishing happens at run time: docker run -p 8080:8080 my-python
EXPOSE 8080

# STOPSIGNAL is the signal Docker sends when the container should stop.
# SIGTERM asks Gunicorn to finish in-flight requests and exit.
STOPSIGNAL SIGTERM

# HEALTHCHECK is a command Docker runs inside the container on a timer.
# Exit code 0 means healthy. Any other code is a failed check.
# --interval: wait this long between checks.
# --timeout: give up on one check after this long.
# --start-period: ignore failures while the server is still starting.
# --retries: this many failures in a row mark the container unhealthy.
# The Python one-liner requests http://127.0.0.1:8080/health.
# 127.0.0.1 is this container, not your computer.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health', timeout=2)"]

# ENTRYPOINT is the program. CMD is the default list of arguments.
# The JSON form (square brackets) starts gunicorn directly, with no shell in front.
# Docker sends the stop signal to process 1. Gunicorn is process 1, so it receives SIGTERM.
# You can replace CMD when you run the container. ENTRYPOINT stays.
ENTRYPOINT ["gunicorn"]
CMD ["--bind", "0.0.0.0:8080", "--workers", "2", "--timeout", "30", "--graceful-timeout", "10", "--keep-alive", "5", "--access-logfile", "-", "--error-logfile", "-", "app:app"]
