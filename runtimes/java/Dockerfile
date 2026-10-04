# syntax=docker/dockerfile:1
# The line above turns on BuildKit. This file uses it for scripts written
# between <<'EOF' and EOF, and for COPY --link.

# Template: a small Java HTTP server. Java 25 is the current long-term support release.
# The first stage has the compiler (JDK). The second has only the runtime (JRE).
# Change both version tags together. Replace App.java, then:
#   docker build --progress=plain -t my-java .
#   docker run --rm -p 8080:8080 my-java

# --- stage 1: compile -------------------------------------------------------
# FROM starts from a JDK image. This compiler is not copied into the final image.
FROM eclipse-temurin:25-jdk-alpine-3.24 AS build

# WORKDIR creates /src and makes it the current directory.
WORKDIR /src

# COPY the source. --link stores it in its own layer.
# This sample is one file, so the source is the whole input.
# With Maven or Gradle, copy pom.xml or build.gradle first, download
# dependencies, then copy src/, so a code edit does not download again.
COPY --link App.java ./

# RUN compiles App.java into class files under /out.
# <<'EOF' is the script. set -eu stops if javac fails.
# --release 25 writes classes for Java 25.
RUN <<'EOF'
set -eu
mkdir -p /out
javac --release 25 -d /out App.java
EOF

# --- stage 2: the image you run ---------------------------------------------
# JRE means no javac and no JDK tools. Alpine keeps the image small.
FROM eclipse-temurin:25-jre-alpine-3.24 AS runtime

LABEL org.opencontainers.image.title="java-runtime" \
      org.opencontainers.image.description="Production Java reference image. Temurin JRE on Alpine, uid 10001."

# ENV sets variables in the running container.
# LANG=C.UTF-8 avoids pulling extra locale data.
# JAVA_TOOL_OPTIONS is read by the JVM on startup:
#   MaxRAMPercentage=75 keeps the heap inside the container memory limit.
#   ExitOnOutOfMemoryError makes the process exit instead of spinning.
#   UseContainerSupport tells the JVM to read the container's memory limit.
ENV LANG=C.UTF-8 \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError -XX:+UseContainerSupport"

# Alpine already has addgroup and adduser. Create user id 10001.
# -S marks a system account. -D -H skip a password and a home directory.
# -s /sbin/nologin means this account cannot log in.
# The server runs as this user, not as root.
RUN <<'EOF'
set -eu
addgroup -g 10001 -S app
adduser -S -D -H -u 10001 -G app -s /sbin/nologin app
EOF

WORKDIR /app

# COPY --from=build takes the class files. --chown makes user 10001 the owner
# in the same step. --link keeps them in their own layer.
COPY --link --from=build --chown=10001:10001 /out/ /app/

# USER applies to the process that starts. 10001 is the id created above.
USER 10001

# EXPOSE records port 8080. docker run -p publishes it.
EXPOSE 8080

# STOPSIGNAL SIGTERM: the JVM shuts down when Docker sends this signal.
STOPSIGNAL SIGTERM

# HEALTHCHECK runs wget inside the container on a timer.
# Exit code 0 means /health returned a page. wget comes with Alpine, so no extra package.
# --interval, --timeout, --start-period, --retries: how often, how long one try
# may take, how long startup is ignored, and how many failures mark it unhealthy.
# 127.0.0.1 is the container itself.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/health"]

# ENTRYPOINT is the program: java, with the class path and the class name.
# The base image's own entrypoint imports CA certificates and expects to start
# as root. This image already has those certificates, so java is started directly.
# Square brackets mean no shell in front. java is process 1 and receives SIGTERM.
ENTRYPOINT ["java", "-cp", "/app", "App"]
