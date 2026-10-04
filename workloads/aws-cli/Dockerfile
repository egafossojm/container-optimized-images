# syntax=docker/dockerfile:1
# The line above turns on BuildKit. This file uses it for a script written
# between <<'EOF' and EOF.

# Template: AWS CLI v2, running as a normal user.
# The official image is Amazon Linux and starts as root. Change the version
# on FROM, then:
#   docker build --progress=plain -t my-aws .
#   docker run --rm my-aws
# Mount credentials at run time (a ~/.aws directory or a task role). Do not COPY keys into the image.

FROM amazon/aws-cli:2.37.9

LABEL org.opencontainers.image.title="aws-cli" \
      org.opencontainers.image.description="AWS CLI v2.37.9 running as uid 10001."

# This image has no useradd command. Installing a package only to create one
# account is unnecessary. These two lines append the account to the user database.
# app:x:10001: is the group. The passwd line is name, unused password field,
# user id 10001, group id 10001, empty comment, home, and a shell that cannot log in.
# mkdir creates the home. chown gives it to that user. chmod 0750 lets the user in
# and keeps other users out.
RUN <<'EOF'
set -eu
echo 'app:x:10001:' >> /etc/group
echo 'app:x:10001:10001::/home/app:/sbin/nologin' >> /etc/passwd
mkdir -p /home/app
chown 10001:10001 /home/app
chmod 0750 /home/app
EOF

# Every following command, including aws, runs as user id 10001.
USER 10001
WORKDIR /home/app

# HOME is the directory AWS CLI searches for config.
# AWS_PAGER empty: do not open a pager. A pager waits for a keyboard this container does not have.
# AWS_CLI_AUTO_PROMPT=off: do not ask questions. A prompt would hang the same way.
ENV HOME=/home/app \
    AWS_PAGER="" \
    AWS_CLI_AUTO_PROMPT=off

# ENTRYPOINT is the aws program. CMD prints the version.
# docker run my-aws s3 ls replaces CMD and still runs aws.
# Square brackets start aws directly, so it is process 1.
ENTRYPOINT ["/usr/local/bin/aws"]
CMD ["--version"]
