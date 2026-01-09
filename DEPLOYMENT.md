# V4 Worksheet Demo Deployment

## Live URL
https://v4-project.moc-pty.com

## Server Details
- **IP:** 167.88.43.168
- **Path:** /var/www/v4-Worksheet-demo

## MySQL Database Credentials
- **Database:** v4_worksheet
- **User:** v4_user
- **Password:** v4_password
- **Host:** localhost
- **Port:** 3306

## Services
- **Gunicorn:** systemctl status v4worksheet
- **Nginx:** systemctl status nginx

## Useful Commands
```bash
# Restart app
sudo systemctl restart v4worksheet

# View logs
sudo journalctl -u v4worksheet -f

# Pull updates
cd /var/www/v4-Worksheet-demo
git pull
pip install -r requirements.txt
python manage.py migrate
sudo systemctl restart v4worksheet
```

## GitHub Repo
https://github.com/MOCDATA-PTY/v4-Worksheet-demo
