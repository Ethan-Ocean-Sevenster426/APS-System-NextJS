import time
import requests
from django.core.management.base import BaseCommand
from django.core.cache import cache


class Command(BaseCommand):
    help = 'Test performance of the inspections page'

    def handle(self, *args, **options):
        self.stdout.write('Testing inspections page performance...')
        
        # Clear cache first to get fresh measurements
        cache.clear()
        self.stdout.write('✓ Cache cleared')
        
        # Test first load (no cache)
        start_time = time.time()
        try:
            response = requests.get('http://127.0.0.1:8000/inspections/', timeout=30)
            first_load_time = time.time() - start_time
            self.stdout.write(f'✓ First load (no cache): {first_load_time:.2f} seconds')
        except Exception as e:
            self.stdout.write(f'✗ First load failed: {e}')
            return
        
        # Test second load (with cache)
        start_time = time.time()
        try:
            response = requests.get('http://127.0.0.1:8000/inspections/', timeout=30)
            second_load_time = time.time() - start_time
            self.stdout.write(f'✓ Second load (with cache): {second_load_time:.2f} seconds')
        except Exception as e:
            self.stdout.write(f'✗ Second load failed: {e}')
            return
        
        # Calculate improvement
        improvement = ((first_load_time - second_load_time) / first_load_time) * 100
        self.stdout.write(f'✓ Performance improvement: {improvement:.1f}%')
        
        # Check cache statistics
        cache_stats = cache.get('cache_stats', {})
        if cache_stats:
            self.stdout.write('Cache Statistics:')
            for key, value in cache_stats.items():
                self.stdout.write(f'  {key}: {value}')
        
        self.stdout.write(self.style.SUCCESS('Performance test completed!'))
