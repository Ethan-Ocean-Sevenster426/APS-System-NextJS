"""
Django management command to run OneDrive auto-upload as a background scheduler
Runs the upload process every hour
"""

import time
import signal
import sys
from django.core.management.base import BaseCommand
from django.utils import timezone
from main.utils.onedrive_auto_upload import process_inspections_for_upload


class Command(BaseCommand):
    help = 'Run OneDrive auto-upload scheduler as a background service'

    def add_arguments(self, parser):
        parser.add_argument(
            '--interval',
            type=int,
            default=3600,  # 1 hour in seconds
            help='Interval between upload checks in seconds (default: 3600)',
        )
        parser.add_argument(
            '--max-runs',
            type=int,
            default=0,  # 0 means unlimited
            help='Maximum number of runs before stopping (0 = unlimited)',
        )

    def handle(self, *args, **options):
        interval = options['interval']
        max_runs = options['max_runs']
        
        self.stdout.write(
            self.style.SUCCESS(f'🔄 Starting OneDrive auto-upload scheduler')
        )
        self.stdout.write(f'   Interval: {interval} seconds ({interval/60:.1f} minutes)')
        self.stdout.write(f'   Max runs: {"Unlimited" if max_runs == 0 else max_runs}')
        self.stdout.write('   Press Ctrl+C to stop')
        
        # Set up signal handler for graceful shutdown
        def signal_handler(sig, frame):
            self.stdout.write(
                self.style.WARNING('\n🛑 Received interrupt signal. Shutting down gracefully...')
            )
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        run_count = 0
        
        try:
            while True:
                run_count += 1
                current_time = timezone.now().strftime('%Y-%m-%d %H:%M:%S')
                
                self.stdout.write(f'\n[{current_time}] Run #{run_count} - Checking for uploads...')
                
                try:
                    success = process_inspections_for_upload()
                    
                    if success:
                        self.stdout.write(f'[{current_time}] ✅ Upload check completed successfully')
                    else:
                        self.stdout.write(f'[{current_time}] ⚠️ Upload check completed with warnings')
                        
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'[{current_time}] ❌ Upload check failed: {str(e)}')
                    )
                
                # Check if we've reached max runs
                if max_runs > 0 and run_count >= max_runs:
                    self.stdout.write(
                        self.style.SUCCESS(f'[{current_time}] 🏁 Reached maximum runs ({max_runs}). Stopping.')
                    )
                    break
                
                # Wait for next interval
                self.stdout.write(f'[{current_time}] ⏰ Waiting {interval} seconds until next check...')
                time.sleep(interval)
                
        except KeyboardInterrupt:
            self.stdout.write(
                self.style.WARNING('\n🛑 Scheduler stopped by user')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'\n❌ Scheduler error: {str(e)}')
            )
            raise
