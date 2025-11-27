FROM alpine:latest

# Install minimal dependencies
# bash: required for install.sh
# curl: required for downloading
# git: often required by development tools
# openssh: for SSH access
RUN apk add --no-cache \
  bash \
  curl \
  git \
  openssh \
  libstdc++ \
  gcompat

# Configure SSH
RUN mkdir -p /var/run/sshd && \
  ssh-keygen -A && \
  echo 'root:$g7^pZxpgteixe' | chpasswd && \
  sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config && \
  sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config && \
  sed -i 's|root:/bin/ash|root:/bin/bash|' /etc/passwd || true && \
  sed -i 's|root:/bin/sh|root:/bin/bash|' /etc/passwd || true

# Install Claude Code
# The script installs to ~/.claude/bin
RUN curl -fsSL https://claude.ai/install.sh | bash

# Add Claude to PATH and source .env if it exists
ENV PATH="/root/.local/bin:/root/.claude/bin:${PATH}"
RUN echo 'export PATH="/root/.local/bin:/root/.claude/bin:$PATH"' >> /root/.bashrc && \
  echo 'export PROMPT_COMMAND='\''printf "\033]99;$(pwd)\007"'\''' >> /root/.bashrc && \
  echo 'if [ -f /root/.env ]; then set -a; source /root/.env; set +a; fi' >> /root/.bashrc && \
  echo 'if [ -f ~/.bashrc ]; then . ~/.bashrc; fi' > /root/.bash_profile

# Expose SSH port
EXPOSE 22

# Start SSH daemon
CMD ["/usr/sbin/sshd", "-D"]
