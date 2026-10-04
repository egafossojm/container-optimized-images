# syntax=docker/dockerfile:1
# The line above turns on BuildKit. This file uses it for a NuGet cache
# that is not saved in the image, and for COPY --link.

# Template: an ASP.NET Core app.
# The first stage is the SDK (it can compile). The second is only the runtime.
# Change the SDK tag and the runtime tag when you move .NET versions.
# Replace the project files, then:
#   docker build --progress=plain -t my-dotnet .
#   docker run --rm -p 8080:8080 my-dotnet

# --- stage 1: restore and publish -------------------------------------------
# SDK images use a band number (10.0.200). Runtime images use a patch (10.0.12).
# Those numbers are not the same tag. AS build names this stage.
FROM mcr.microsoft.com/dotnet/sdk:10.0.200-alpine3.23 AS build

WORKDIR /src

# Copy the project file and the lockfile before the source code.
# --link stores them in their own layer. A later edit of Program.cs
# does not restore packages again.
COPY --link App.csproj packages.lock.json ./

# --locked-mode refuses to change the lockfile.
# The cache mount keeps NuGet packages on the builder, not in the image.
RUN --mount=type=cache,target=/root/.nuget/packages,sharing=locked \
    dotnet restore App.csproj --locked-mode

COPY --link Program.cs ./

# dotnet publish writes the app to /out.
# -c Release is the production build.
# --no-restore uses the restore above.
# UseAppHost=false skips a native launcher. The runtime image starts the dll with dotnet.
# The SDK itself is not copied to the next stage.
RUN --mount=type=cache,target=/root/.nuget/packages,sharing=locked \
    dotnet publish App.csproj \
      -c Release \
      -o /out \
      --no-restore \
      -p:UseAppHost=false

# --- stage 2: the image you run ---------------------------------------------
# The ASP.NET runtime on Alpine. It already has user "app", id 1654,
# and it listens on the port in ASPNETCORE_HTTP_PORTS.
FROM mcr.microsoft.com/dotnet/aspnet:10.0.12-alpine3.23 AS runtime

LABEL org.opencontainers.image.title="dotnet-runtime" \
      org.opencontainers.image.description="Production ASP.NET Core reference image. Uses the existing app user (uid 1654)."

# ENV for the running container. Repeated here so the settings are visible in this file.
# Production: no developer exception pages.
# HTTP_PORTS=8080: the listen port. Unprivileged users cannot bind port 80.
# RUNNING_IN_CONTAINER: the runtime reads container memory limits.
# NOLOGO: do not print the .NET banner.
# INVARIANT: Alpine has no ICU locale library, so use invariant culture.
ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_HTTP_PORTS=8080 \
    DOTNET_RUNNING_IN_CONTAINER=true \
    DOTNET_NOLOGO=1 \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=true

WORKDIR /app

# Copy the published app from stage 1. 1654:1654 is the app user's id.
COPY --link --from=build --chown=1654:1654 /out/ ./

# Reuse the account Microsoft already created. Do not add a second user.
USER app

EXPOSE 8080

STOPSIGNAL SIGTERM

# HEALTHCHECK runs wget inside the container. Exit code 0 means /health responded.
# wget is already in the Alpine image. 127.0.0.1 is the container itself.
# --interval, --timeout, --start-period, --retries control the schedule.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/health"]

# ENTRYPOINT starts the app. Square brackets: dotnet is process 1 and receives SIGTERM.
ENTRYPOINT ["dotnet", "App.dll"]
