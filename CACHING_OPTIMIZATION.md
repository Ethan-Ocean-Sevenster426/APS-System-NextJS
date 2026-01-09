# Compliance Documents Caching Optimization

## Overview
The compliance document pulling system has been optimized with **Redis caching** to dramatically speed up retrieval from Google Workspace (Google Drive).

## Key Optimizations

### 1. Automatic Caching
- **Function**: `load_drive_files_real(request, use_cache=True)`
- **Default behavior**: Automatically checks Redis cache first
- **Cache duration**: 60 minutes (3600 seconds)
- **Cache key**: `drive_files_lookup_v3`

### 2. How It Works

#### First Call (Cold Start)
```
1. Checks Redis cache → Not found
2. Connects to Google Drive
3. Retrieves ALL files from folder (takes time)
4. Parses and builds file lookup dictionary
5. Stores in Redis cache for 60 minutes
6. Returns file lookup
```

#### Subsequent Calls (Cached)
```
1. Checks Redis cache → Found!
2. Returns cached data immediately
3. No Google Drive API calls
4. No network latency
5. Instant retrieval!
```

### 3. Performance Improvement

**Before Caching:**
- Every call: 30-120+ seconds (depends on network and number of files)

**After Caching:**
- First call: 30-120+ seconds (loads and caches)
- Subsequent calls: **< 1 second** (uses cache)

**Speedup: 30-120x faster!**

## Usage Examples

### Using Cached Data (Default)
```python
from main.views.core_views import load_drive_files_real
from django.http import HttpRequest

request = HttpRequest()

# Uses cache by default
file_lookup = load_drive_files_real(request)
# Fast! Returns cached data if available
```

### Force Refresh (No Cache)
```python
# Force reload from Google Drive
file_lookup = load_drive_files_real(request, use_cache=False)
# Slow! Always loads from Google Drive
```

### Clear Cache Manually
```python
from django.core.cache import cache

# Clear the cache
cache.delete('drive_files_lookup_v3')

# Next call will reload from Google Drive
file_lookup = load_drive_files_real(request)
```

## Configuration

### Cache Duration
Located in `main/views/core_views.py` line 6269:
```python
cache.set(cache_key, file_lookup, 3600)  # 60 minutes
```

To change cache duration, modify the `3600` value:
- 3600 seconds = 60 minutes (current)
- 1800 seconds = 30 minutes
- 7200 seconds = 120 minutes

### Cache Key
Current cache key: `drive_files_lookup_v3`
- Located in `main/views/core_views.py` line 6196

## Testing

Run the speed test:
```bash
python test_fast_compliance.py
```

This will show:
1. Time for first call (no cache)
2. Time for second call (with cache)
3. Performance improvement achieved

## Benefits

1. **Speed**: Subsequent calls are 30-120x faster
2. **Reliability**: Reduces dependency on Google Drive API
3. **Cost**: Reduces API quota usage
4. **User Experience**: Much faster page loads
5. **Flexibility**: Can force refresh when needed

## Maintenance

### When to Clear Cache
- New compliance documents uploaded to Google Drive
- Files renamed or moved in Google Drive
- Corrupted cache data
- Scheduled cache refresh needed

### Automatic Cache Refresh
The system automatically refreshes the cache after 60 minutes. The next request will reload fresh data from Google Drive.

## Technical Details

### Cache Storage
- **Backend**: Redis (via Django cache framework)
- **Format**: Python dictionary stored as serialized data
- **Size**: Varies based on number of files in Google Drive
- **Memory**: Cached in Redis RAM for fast access

### File Lookup Structure
```python
{
    'commodity|account_code|date': {
        'url': 'https://drive.google.com/file/d/...',
        'name': 'RAW-RE-IND-RAW-NA-1000-2025-01-15.zip',
        'commodity': 'RAW',
        'accountCode': 'RE-IND-RAW-NA-1000',
        'zipDate': datetime.datetime(...),
        'zipDateStr': '2025-01-15',
        'file_id': '...'
    },
    ...
}
```

## Implementation Notes

1. **Thread Safety**: Redis handles concurrent access safely
2. **Memory Efficiency**: Only stores file metadata, not file contents
3. **Compression**: Django's cache framework handles serialization
4. **Error Handling**: Falls back to Google Drive if cache fails

## Monitoring

To check cache status:
```python
from django.core.cache import cache

# Check if cached
cache_key = 'drive_files_lookup_v3'
cached_data = cache.get(cache_key)
if cached_data:
    print(f"Cache has {len(cached_data)} files")
else:
    print("No cache, will load from Google Drive")
```

