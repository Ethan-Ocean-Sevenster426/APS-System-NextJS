#!/bin/bash
# Run this ONCE on the server to allow passwordless sudo for deployment

echo "Setting up passwordless sudo for deployment..."

# Get the current username
DEPLOY_USER=$(whoami)

# Create sudoers file for passwordless deployment
sudo tee /etc/sudoers.d/deploy-inspection-system > /dev/null <<EOF
# Allow $DEPLOY_USER to restart services without password
$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/systemctl restart gunicorn
$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/systemctl restart nginx
$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/systemctl status gunicorn
$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/systemctl status nginx
EOF

# Set correct permissions
sudo chmod 0440 /etc/sudoers.d/deploy-inspection-system

# Validate sudoers file
sudo visudo -c

echo "Done! You can now restart gunicorn and nginx without password."
echo "Test with: sudo systemctl restart gunicorn"
