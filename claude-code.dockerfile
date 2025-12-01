FROM debian:stable-slim

# Install minimal dependencies
# bash: default in debian, but good to ensure
# curl: required for downloading
# git: often required by development tools
# openssh-server: for SSH access (note: openssh-server, not openssh)
# openssl: for SSL certificate generation
# Install Node.js and npm (for ssh-proxy.js)
# tmux: terminal multiplexer
# vim: text editor
RUN apt-get update && apt-get install -y --no-install-recommends \
  bash \
  curl \
  git \
  openssh-server \
  ca-certificates \
  nodejs \
  npm \
  passwd \
  openssl \
  tmux \
  vim \
  && rm -rf /var/lib/apt/lists/*

# Configure Aliyun Debian mirrors
RUN tee /etc/apt/sources.list.d/debian.sources <<'EOF'
Types: deb
URIs: https://mirrors.aliyun.com/debian
Suites: trixie trixie-updates
Components: main non-free contrib
Signed-By: /usr/share/keyrings/debian-archive-keyring.gpg

Types: deb
URIs: https://mirrors.aliyun.com/debian-security
Suites: trixie-security
Components: main
Signed-By: /usr/share/keyrings/debian-archive-keyring.gpg
EOF

# Install Zellij
ARG ZELLIJ_VERSION=0.43.1
RUN curl -L "https://github.com/zellij-org/zellij/releases/download/v${ZELLIJ_VERSION}/zellij-x86_64-unknown-linux-musl.tar.gz" \
    | tar -xz -C /usr/local/bin \
    && chmod +x /usr/local/bin/zellij

# Generate SSL certificate at build time
RUN mkdir -p /etc/nginx/ssl_ip && \
  openssl req -x509 -newkey rsa:4096 -keyout /etc/nginx/ssl_ip/ip.key -out /etc/nginx/ssl_ip/ip.crt -days 365 -nodes -subj "/CN=localhost"

# Configure SSH
RUN mkdir -p /var/run/sshd && \
  ssh-keygen -A && \
  echo 'PermitRootLogin yes' >> /etc/ssh/sshd_config && \
  echo 'PasswordAuthentication yes' >> /etc/ssh/sshd_config && \
  echo 'UsePAM no' >> /etc/ssh/sshd_config && \
  echo 'AcceptEnv ANTHROPIC_*' >> /etc/ssh/sshd_config

# Install Claude Code
# The script installs to ~/.claude/bin
RUN curl -fsSL https://claude.ai/install.sh | bash

# Add Claude to PATH and source .env if it exists
ENV PATH="/root/.local/bin:/root/.claude/bin:${PATH}"
# Pass PROXY_AUTH_TOKEN to the container environment
ENV PROXY_AUTH_TOKEN=""
RUN echo 'export PATH="/root/.local/bin:/root/.claude/bin:$PATH"' >> /root/.bashrc && \
  echo 'export PROMPT_COMMAND='\''printf "\033]99;$(pwd)\007"'\''' >> /root/.bashrc && \
  echo 'if [ -f /root/.env ]; then set -a; source /root/.env; set +a; fi' >> /root/.bashrc && \
  # Debian uses .bashrc for interactive non-login shells, and .profile for login shells.
  # Ensure .bashrc is sourced in .profile if it exists
  echo 'if [ -f ~/.bashrc ]; then . ~/.bashrc; fi' >> /root/.profile

# Setup SSH Proxy
WORKDIR /app
COPY ssh-proxy.js .
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Install proxy dependencies
RUN npm install socket.io ssh2 dotenv

# Expose SSH port and Proxy port
EXPOSE 22 3001

# Start via entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]
