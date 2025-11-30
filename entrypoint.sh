#!/bin/bash
set -e

# Set root password if SSH_ROOT_PASSWORD is provided
if [ -n "$SSH_ROOT_PASSWORD" ]; then
    echo "Setting root password..."
    echo "root:$SSH_ROOT_PASSWORD" | chpasswd
else
    echo "WARNING: SSH_ROOT_PASSWORD not set. SSH access may be disabled or use a default/random password depending on base image."
fi

# Start SSH daemon and Proxy
# We use exec to ensure signals are passed correctly
exec /bin/bash -c "/usr/sbin/sshd && node ssh-proxy.js"
