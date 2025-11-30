# SSH Proxy Security & Configuration

This document outlines the security architecture and configuration for the DeepWiki SSH Proxy and Claude Code container.

## Overview

The SSH Proxy allows the DeepWiki web interface to communicate with a backend SSH container (Claude Code) via a WebSocket connection. To ensure security, especially when ports might be exposed, we implement a multi-layer security approach.

## Security Layers

### 1. WebSocket Authentication
The WebSocket connection between the Next.js frontend and the SSH Proxy server is protected by a shared secret token.

-   **Environment Variable**: `PROXY_AUTH_TOKEN`
-   **Mechanism**: The frontend sends this token in the Socket.IO handshake `auth` object. The proxy server verifies this token against its local environment variable.
-   **Behavior**: If the token is missing or incorrect, the connection is immediately rejected.

### 2. SSH Root Password
The SSH container (`claude-code`) uses a root password for SSH access. This password is **not hardcoded** in the Dockerfile.

-   **Environment Variable**: `SSH_ROOT_PASSWORD`
-   **Mechanism**: An `entrypoint.sh` script runs at container startup, reads this variable, and sets the root password dynamically.
-   **Behavior**: If the variable is not set, the container logs a warning.

## Configuration Guide

### Local Development

1.  **Frontend (`.env.local`)**:
    ```bash
    NEXT_PUBLIC_PROXY_AUTH_TOKEN="dev-secret-token"
    ```

2.  **Docker Container**:
    When running the container locally, pass the variables:
    ```bash
    docker run -d \
      -p 3001:3001 \
      -e PROXY_AUTH_TOKEN="dev-secret-token" \
      -e SSH_ROOT_PASSWORD="dev-root-password" \
      ghcr.io/charles1614/deepwiki/claude-code:latest
    ```

### Production Deployment

Ensure the following environment variables are set in your deployment environment (e.g., Portainer, Coolify, or `docker-compose.prod.yml`):

| Variable | Description | Location |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_PROXY_AUTH_TOKEN` | Shared secret for WebSocket auth | Next.js App |
| `PROXY_AUTH_TOKEN` | Shared secret for WebSocket auth | SSH Proxy Container |
| `SSH_ROOT_PASSWORD` | Root password for SSH access | SSH Proxy Container |

**Example `docker-compose.prod.yml` snippet:**

```yaml
services:
  claude-code:
    image: ghcr.io/charles1614/deepwiki/claude-code:latest
    environment:
      - SSH_ROOT_PASSWORD=${SSH_ROOT_PASSWORD}
      - PROXY_AUTH_TOKEN=${PROXY_AUTH_TOKEN}
    ports:
      - "2222:22"
      - "3001:3001"
```

## Troubleshooting

-   **"Authentication error" in Web Terminal**: Check that `NEXT_PUBLIC_PROXY_AUTH_TOKEN` in the web app matches `PROXY_AUTH_TOKEN` in the container.
-   **Cannot SSH into container**: Verify `SSH_ROOT_PASSWORD` was set correctly when the container started. You can check logs for "Setting root password...".

## GitHub Actions Configuration

If you are using GitHub Actions to deploy your application (e.g., via SSH to your server), you must add the security tokens as **Repository Secrets**.

1.  Go to your GitHub Repository -> **Settings** -> **Secrets and variables** -> **Actions**.
2.  Click **New repository secret**.
3.  Add the following secrets:
    *   `SSH_ROOT_PASSWORD`: Your secure root password.
    *   `PROXY_AUTH_TOKEN`: Your secure WebSocket token.

### Example Deployment Workflow

If you use a workflow to deploy via SSH, ensure you pass the secrets to the environment:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /path/to/app
            # Export secrets as environment variables before running docker-compose
            export SSH_ROOT_PASSWORD="${{ secrets.SSH_ROOT_PASSWORD }}"
            export PROXY_AUTH_TOKEN="${{ secrets.PROXY_AUTH_TOKEN }}"
            
            docker-compose -f docker-compose.prod.yml pull
            docker-compose -f docker-compose.prod.yml pull
            docker-compose -f docker-compose.prod.yml up -d

## Build Workflow

The Docker image is built automatically by the GitHub Action defined in `.github/workflows/build-claude-code.yml`.

-   **Triggers**: Pushes to `main` that modify:
    -   `claude-code.dockerfile`
    -   `entrypoint.sh`
-   **Secrets**: The build process **does not** require the `SSH_ROOT_PASSWORD` or `PROXY_AUTH_TOKEN` secrets, as these are provided only at runtime.
-   **Output**: Pushes `ghcr.io/charles1614/deepwiki/claude-code:latest`.

> [!NOTE]
> If you modify `entrypoint.sh`, the build workflow will automatically trigger to ensure the new script is included in the image.
```
