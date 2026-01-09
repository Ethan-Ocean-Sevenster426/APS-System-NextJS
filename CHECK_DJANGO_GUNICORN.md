# Commands to Check Django/Gunicorn Status

## On Production Server (SSH into your server first)

### 1. Check Gunicorn Process Status

```bash
# Check if Gunicorn is running
ps aux | grep gunicorn

# Check Gunicorn systemd service status (if using systemd)
sudo systemctl status gunicorn

# Check Gunicorn service logs
sudo journalctl -u gunicorn -n 100 --no-pager

# Real-time logs
sudo journalctl -u gunicorn -f
```

### 2. Check Nginx Status

```bash
# Check if Nginx is running
ps aux | grep nginx

# Check Nginx service status
sudo systemctl status nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### 3. Check Ports and Network Connections

```bash
# Check what's listening on port 8000 (Gunicorn default)
sudo netstat -tlnp | grep :8000

# Check what's listening on port 80/443 (Nginx)
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# Or use ss (modern alternative)
sudo ss -tlnp | grep :8000
```

### 4. Check Python/Django Processes

```bash
# Find all Python processes
ps aux | grep python

# Find Django manage.py processes
ps aux | grep manage.py

# Check if any Django runserver is running (shouldn't be in production)
ps aux | grep runserver
```

### 5. Check Application Logs

```bash
# Check Django application logs (location varies)
sudo tail -f /var/log/gunicorn/error.log
sudo tail -f /var/log/gunicorn/access.log

# Or if logs are in project directory
tail -f ~/path/to/your/project/logs/gunicorn-error.log
```

### 6. Check Database Connections

```bash
# Check PostgreSQL connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity WHERE datname = 'your_database_name';"

# Count active connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'your_database_name';"
```

### 7. Restart Services (if needed)

```bash
# Restart Gunicorn
sudo systemctl restart gunicorn

# Restart Nginx
sudo systemctl restart nginx

# Reload Gunicorn (graceful restart)
sudo systemctl reload gunicorn

# Check if restart was successful
sudo systemctl status gunicorn
sudo systemctl status nginx
```

### 8. Check for Multiple Gunicorn Instances

```bash
# Count Gunicorn worker processes
ps aux | grep gunicorn | wc -l

# Show all Gunicorn processes with details
ps aux | grep gunicorn | grep -v grep
```

### 9. Check System Resources

```bash
# Check CPU and memory usage
top

# Check memory usage specifically
free -h

# Check disk usage
df -h
```

### 10. Django-specific Diagnostics

```bash
# Go to your project directory
cd /path/to/your/project

# Check Django database connection
python manage.py dbshell

# Check migrations status
python manage.py showmigrations

# Run system check
python manage.py check

# Check installed apps
python manage.py showmigrations | grep main
```

## Common Issues and Solutions

### Issue: Too Many Inspections (6160 instead of expected count)

**Diagnostic Steps:**
1. Run the diagnostic script on the server:
   ```bash
   python diagnose_system.py
   ```

2. Check for duplicates:
   ```bash
   python manage.py shell -c "from main.models import FoodSafetyAgencyInspection; from django.db.models import Count; dups = FoodSafetyAgencyInspection.objects.values('remote_id').annotate(count=Count('remote_id')).filter(count__gt=1); print(f'Duplicates: {dups.count()}')"
   ```

3. Check sync service status:
   ```bash
   # In Django shell
   python manage.py shell
   ```
   ```python
   from main.services.scheduled_sync_service import ScheduledSyncService
   service = ScheduledSyncService()
   status = service.get_service_status()
   print(status)
   ```

**Possible Causes:**
- Sync ran multiple times
- Product splitting created duplicates
- Database wasn't cleared before re-sync
- Concurrent sync processes running

**Solution:**
1. Stop all sync processes
2. Back up database
3. Run a fresh sync with "Sync Everything"

### Issue: Gunicorn Not Responding

```bash
# Kill all Gunicorn processes
sudo pkill -9 gunicorn

# Restart Gunicorn
sudo systemctl start gunicorn

# Check status
sudo systemctl status gunicorn
```

### Issue: Database Connection Timeout

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check database connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Restart PostgreSQL if needed
sudo systemctl restart postgresql
```

## Quick Diagnostic Script (Run on Server)

```bash
#!/bin/bash
echo "=== DJANGO/GUNICORN DIAGNOSTICS ==="
echo ""
echo "1. Gunicorn Processes:"
ps aux | grep gunicorn | grep -v grep
echo ""
echo "2. Nginx Status:"
sudo systemctl status nginx --no-pager | head -10
echo ""
echo "3. Gunicorn Status:"
sudo systemctl status gunicorn --no-pager | head -10
echo ""
echo "4. Port 8000 (Gunicorn):"
sudo ss -tlnp | grep :8000
echo ""
echo "5. Recent Gunicorn Errors:"
sudo journalctl -u gunicorn -n 20 --no-pager | tail -10
echo ""
echo "6. Database Connections:"
python3 manage.py shell -c "from django.db import connection; print(f'DB: {connection.settings_dict[\"NAME\"]} on {connection.settings_dict[\"HOST\"]}')"
```

Save this as `check_django.sh`, make it executable (`chmod +x check_django.sh`), and run it.
