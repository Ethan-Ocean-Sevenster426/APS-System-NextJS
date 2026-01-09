from django.apps import AppConfig
import os


class MainConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'main'

    def ready(self):
        import main.signals

        # Auto-start sync service on server startup (only in main process)
        # Skip during migrations or when running management commands
        if os.environ.get('RUN_MAIN') == 'true' or os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
            # Use threading to defer sync service start until Django is fully loaded
            import threading
            threading.Thread(target=self._start_sync_service_on_startup, daemon=True).start()

    def _start_sync_service_on_startup(self):
        """Start the scheduled sync service automatically - ALWAYS ENABLED."""
        import time

        # Wait for Django to fully initialize
        time.sleep(3)

        try:
            from .models import SystemSettings
            from .services.scheduled_sync_service import start_scheduled_sync_service

            # Get settings for display purposes
            settings = SystemSettings.objects.first()

            print("\n" + "="*80)
            print("AUTO-START: Starting Background Sync Service (ALWAYS ENABLED)")
            print("   This service ALWAYS runs to prevent missing inspections")
            print("="*80)

            # ALWAYS start the sync service - no off switch
            success, message = start_scheduled_sync_service()

            if success:
                print(f"[OK] {message}")
                print("   The service will automatically sync:")
                print("   - SQL Server (inspection data)")
                print("   - Google Sheets (client data)")
                print("   - Compliance documents")
                if settings:
                    print(f"   Sync interval: {settings.sync_interval_hours} hours")
                print("   This service cannot be disabled to ensure data integrity")
            else:
                print(f"[WARNING] {message}")
                print("   CRITICAL: Sync service failed to start - inspections may not update!")

            print("="*80 + "\n")

        except Exception as e:
            # Don't crash the app if sync service fails to start
            print(f"\n[CRITICAL WARNING] Could not auto-start sync service: {e}")
            print("   Inspections will NOT automatically sync!")
            print("   Please check logs and restart the server.\n")