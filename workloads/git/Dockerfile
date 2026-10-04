# syntax=docker/dockerfile:1
# The line above turns on BuildKit. This file uses it for an apk cache that
# is not saved in the image, and for a script written between <<'EOF' and EOF.

# Template: a git client for clone and fetch. One tool, not a full CI image.
# Change the Alpine version and the package versions together, then:
#   docker build --progress=plain -t my-git .
#   docker run --rm my-git
# Pass any git command after the image name: docker run --rm my-git clone https://...

# Alpine 3.24 is the base. The package versions below pin what this minor ships.
# A floating "latest" tag would change the packages without an edit here.
FROM alpine:3.24

LABEL org.opencontainers.image.title="git" \
      org.opencontainers.image.description="Git client on Alpine for non-root clone and fetch jobs."

# RUN installs packages and creates the user.
# --mount=type=cache keeps apk's download folder on the builder, not in the image.
# sharing=locked: one build uses that folder at a time.
# Do not add apk --no-cache. That flag turns the cache off.
# <<'EOF' is the script. set -eu stops on the first error.
# The two package versions are exact. HTTPS remotes need ca-certificates.
# OpenSSH is not installed. Add it in a new stage if you need SSH remotes.
# addgroup/adduser create user id 10001. The process runs as that user, not root.
RUN --mount=type=cache,target=/var/cache/apk,sharing=locked \
    <<'EOF'
set -eu
apk add --no-progress \
  ca-certificates=20260909-r0 \
  git=2.54.0-r0
addgroup -g 10001 app
adduser -D -u 10001 -G app -h /home/app -s /sbin/nologin app
EOF

# USER 10001 is the id created above. Later commands, including git, use it.
USER 10001

# HOME is the writable directory for git config.
# GIT_CONFIG_NOSYSTEM=1 ignores /etc/gitconfig, which this user does not own.
ENV HOME=/home/app \
    GIT_CONFIG_NOSYSTEM=1

WORKDIR /home/app

# ENTRYPOINT is git. CMD is the default arguments, so a plain docker run prints the version.
# Square brackets start git directly, with no shell in front, so git is process 1.
# docker run my-git status replaces CMD and still runs git.
ENTRYPOINT ["git"]
CMD ["--version"]
