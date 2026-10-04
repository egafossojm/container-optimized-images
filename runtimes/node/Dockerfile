# syntax=docker/dockerfile:1
# The line above turns on BuildKit. This file uses it for a script written
# between <<'EOF' and EOF, an npm cache that is not saved in the image, and COPY --link.

# Template: a Node.js server. Node 24 is the current long-term support line.
# Change the version on both FROM lines together.
# Replace server.js and the package files with yours, then from this directory:
#   docker build --progress=plain -t my-node .
#   docker run --rm -p 8080:8080 my-node

# --- stage 1: install dependencies ------------------------------------------
# FROM starts from the official Node image. bookworm-slim is a small Debian.
# AS build names the stage so the next one can copy node_modules out of it.
# Native addons compiled here match the same Node build used at run time.
FROM node:24.21.0-bookworm-slim AS build

# WORKDIR creates /app and makes it the current directory for the commands below.
WORKDIR /app

# COPY copies the two manifest files from this directory into the image.
# --link stores them in their own layer, so Docker can reuse that layer
# when an earlier line changes.
# package-lock.json is the pin. npm ci fails if it does not match package.json.
COPY --link package.json package-lock.json ./

# NODE_ENV=production tells npm, and many libraries, to skip development-only behavior.
ENV NODE_ENV=production

# RUN executes the script and saves the result in the image.
# --mount=type=cache keeps npm's download folder on the builder, not in the image.
# sharing=locked means only one build uses that folder at a time.
# <<'EOF' is the script. The quotes stop Docker from editing it. set -eu stops on the first error.
# npm ci --omit=dev installs dependencies and skips devDependencies.
# npm does not create node_modules when dependencies is empty.
# The empty marker file keeps the next stage's COPY path valid until you add packages.
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    <<'EOF'
set -eu
npm ci --omit=dev
mkdir -p node_modules
touch node_modules/.keep
EOF

# --- stage 2: the image you run ---------------------------------------------
# A second FROM starts fresh. The npm cache and install tools stay in stage 1.
FROM node:24.21.0-bookworm-slim AS runtime

# LABEL is metadata (a title and a description). It does not change the process.
LABEL org.opencontainers.image.title="node-runtime" \
      org.opencontainers.image.description="Production Node.js reference image. The existing node user (uid 1000) runs the process."

# Set again for the running container. The official image already includes CA certificates.
ENV NODE_ENV=production

# The official image already has a user named node, id 1000. Reuse that account.
# /home/node is a writable home if a library needs a cache on a read-only filesystem.
WORKDIR /app

# COPY --from=build takes node_modules from stage 1.
# --chown=1000:1000 makes them owned by the node user (user id 1000, group id 1000).
# The number is required with --link: that copy cannot look up the name "node"
# in the base image's user list.
# server.js is a separate copy so a code edit does not re-copy node_modules.
COPY --link --from=build --chown=1000:1000 /app/node_modules ./node_modules
COPY --link --chown=1000:1000 package.json server.js ./

# USER node: the process starts as the node user, not as root.
USER node

# EXPOSE records port 8080. It does not open the port. docker run -p does.
EXPOSE 8080

# STOPSIGNAL SIGTERM: when you stop the container, Docker asks node to exit.
# server.js handles that signal.
STOPSIGNAL SIGTERM

# HEALTHCHECK runs this command inside the container on a timer.
# Exit code 0 means healthy. The node program requests /health on 127.0.0.1,
# which is the container itself, so the image does not need curl or wget.
# --interval, --timeout, --start-period, and --retries are how often, how long
# one try may take, how long startup is ignored, and how many failures count.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["node", "-e", "require('http').get('http://127.0.0.1:8080/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"]

# ENTRYPOINT is the program. CMD is the default argument (the script name).
# Square brackets start node directly, with no shell in front, so node is process 1
# and receives the stop signal.
ENTRYPOINT ["node"]
CMD ["server.js"]
