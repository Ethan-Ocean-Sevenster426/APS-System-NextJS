# Automatic Deployment Setup Guide

## What This Does

When you push code to the `master` branch on GitHub, it will **automatically**:
1. Connect to your server via SSH
2. Navigate to `~/Inspection-System`
3. Run `./deploy.sh` script
4. Deploy all your changes

**No manual SSH needed anymore!**

## How It Works

```
You push to GitHub (master branch)
         ↓
GitHub Actions starts workflow
         ↓
GitHub Actions SSHs into your server
         ↓
Runs deploy.sh automatically
         ↓
✅ Server updated!
```

## Setup Steps (One-time only)

### Step 1: Get Your SSH Private Key

On your **local machine** (the one you use to SSH to the server), find your SSH private key:

```bash
# Usually located at:
cat ~/.ssh/id_rsa
# or
cat ~/.ssh/id_ed25519
```

Copy the ENTIRE contents including:
```
-----BEGIN OPENSSH PRIVATE KEY-----
... (all the content) ...
-----END OPENSSH PRIVATE KEY-----
```

### Step 2: Add GitHub Secrets

1. Go to your GitHub repository: https://github.com/MOCDATA-PTY/Inspection-System
2. Click **Settings** (top right)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret** and add these 3 secrets:

#### Secret 1: SERVER_HOST
- **Name**: `SERVER_HOST`
- **Value**: Your server IP address or hostname (e.g., `123.456.789.0` or `food.yourdomain.com`)

#### Secret 2: SERVER_USER
- **Name**: `SERVER_USER`
- **Value**: `root` (the user that runs deploy.sh)

#### Secret 3: SERVER_SSH_KEY
- **Name**: `SERVER_SSH_KEY`
- **Value**: Your ENTIRE SSH private key (paste the full content from Step 1)

### Step 3: Push the Workflow File

Push the `.github/workflows/deploy.yml` file to GitHub (I'll do this for you)

### Step 4: Test It!

After setup, just push any change to master:
```bash
git push origin master
```

Then go to GitHub → Actions tab to watch the deployment happen!

## Viewing Deployment Status

1. Go to: https://github.com/MOCDATA-PTY/Inspection-System/actions
2. Click on the latest workflow run
3. Watch the deployment logs in real-time

## Troubleshooting

### If deployment fails:
- Check that all 3 secrets are set correctly
- Verify the SSH key has no passphrase (or remove it)
- Make sure the server allows SSH connections
- Check that deploy.sh has execute permissions: `chmod +x ~/Inspection-System/deploy.sh`

### To disable auto-deploy:
- Delete the `.github/workflows/deploy.yml` file from the repository

## Security Notes

- The SSH private key is stored securely in GitHub Secrets (encrypted)
- Only you (repo owner) can see or edit the secrets
- The key is never exposed in logs or workflow runs
