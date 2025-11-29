FROM debian:stable-slim

# Install minimal dependencies
# bash: default in debian, but good to ensure
# curl: required for downloading
# git: often required by development tools
# openssh-server: for SSH access (note: openssh-server, not openssh)
RUN apt-get update && apt-get install -y --no-install-recommends \
  bash \
  curl \
  git \
  openssh-server \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Configure SSH
RUN mkdir -p /var/run/sshd && \
  ssh-keygen -A && \
  echo 'root:$g7^pZxpgteixe' | chpasswd && \
  sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config && \
  sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config && \
  echo 'AcceptEnv ANTHROPIC_*' >> /etc/ssh/sshd_config

# Install Claude Code
# The script installs to ~/.claude/bin
RUN curl -fsSL https://claude.ai/install.sh | bash

# Add Claude to PATH and source .env if it exists
ENV PATH="/root/.local/bin:/root/.claude/bin:${PATH}"
RUN echo 'export PATH="/root/.local/bin:/root/.claude/bin:$PATH"' >> /root/.bashrc && \
  echo 'export PROMPT_COMMAND='\''printf "\033]99;$(pwd)\007"'\''' >> /root/.bashrc && \
  echo 'if [ -f /root/.env ]; then set -a; source /root/.env; set +a; fi' >> /root/.bashrc && \
  # Debian uses .bashrc for interactive non-login shells, and .profile for login shells.
  # Ensure .bashrc is sourced in .profile if it exists
  echo 'if [ -f ~/.bashrc ]; then . ~/.bashrc; fi' >> /root/.profile

# Expose SSH port
EXPOSE 22

# Start SSH daemon
CMD ["/usr/sbin/sshd", "-D"]
