# Quiz Session Caching Implementation

## Overview

This implementation adds efficient caching for quiz session details to reduce unnecessary API calls when users click on quiz sessions multiple times in the dashboard.

## Key Features

### 1. **Intelligent Caching**

- Session details are cached for 5 minutes after first fetch
- Subsequent clicks within this window use cached data
- Automatic cache invalidation when data might be stale

### 2. **Memory Management**

- Periodic cleanup of expired cache entries (every 2 minutes)
- Cache is cleared when quiz history is refreshed
- Manual cache management methods available

### 3. **Developer Experience**

- Custom hook `useSessionCache` for easy integration
- Debug component to monitor cache performance
- Comprehensive cache statistics and utilities

## Implementation Details

### Cache Structure

```typescript
interface CachedSessionDetail {
  data: SessionDetail; // The actual session data
  timestamp: number; // When it was cached
  sessionId: number; // Session identifier
}
```

### Cache Duration

- **Default**: 5 minutes (300,000 ms)
- **Configurable**: Can be adjusted in `userSlice.ts`
- **Reasoning**: Balances data freshness with performance

### Automatic Cache Invalidation

1. **Quiz History Updates**: Cache is cleared when quiz history is refreshed
2. **Time-based Expiration**: Entries older than 5 minutes are ignored
3. **Manual Invalidation**: Specific sessions can be invalidated

## Usage Examples

### Basic Usage (Existing Component)

```tsx
// Existing code continues to work - no changes needed
const openDetail = useCallback(
  (id: number) => {
    dispatch(fetchSingleDetailedQuizSession(id)); // Now uses cache automatically
    setShowModal(true);
  },
  [dispatch]
);
```

### Advanced Usage with Custom Hook

```tsx
import { useSessionCache } from "../../hooks/useSessionCache";

const MyComponent = () => {
  const { fetchSession, isCached, getCachedSession, clearCache } =
    useSessionCache();

  const handleSessionClick = async (sessionId: number) => {
    // Check if already cached
    if (isCached(sessionId)) {
      const cachedData = getCachedSession(sessionId);
      console.log("Using cached data:", cachedData);
      return;
    }

    // Fetch fresh data
    const sessionData = await fetchSession(sessionId);
    console.log("Fetched fresh data:", sessionData);
  };

  return (
    <div>
      <button onClick={() => handleSessionClick(123)}>Load Session 123</button>
      <button onClick={clearCache}>Clear Cache</button>
    </div>
  );
};
```

### Cache Management

```tsx
import { useAppDispatch } from "../hooks/reduxHooks";
import {
  clearSessionCache,
  invalidateSessionCache,
  cleanExpiredCache,
} from "../store/slices/userSlice";

const CacheManager = () => {
  const dispatch = useAppDispatch();

  return (
    <div>
      <button onClick={() => dispatch(clearSessionCache())}>
        Clear All Cache
      </button>
      <button onClick={() => dispatch(invalidateSessionCache(123))}>
        Invalidate Session 123
      </button>
      <button onClick={() => dispatch(cleanExpiredCache())}>
        Clean Expired
      </button>
    </div>
  );
};
```

## Performance Benefits

### Before Caching

- Every session click = API call
- 100 clicks on same session = 100 API calls
- Network latency on every interaction
- Unnecessary server load

### After Caching

- First click = API call + cache storage
- Subsequent clicks within 5 minutes = instant response
- 100 clicks on same session = 1 API call (if within cache window)
- Improved user experience with faster responses

## Cache Statistics

Use the debug component to monitor cache performance:

```tsx
import CacheDebugInfo from '../components/common/CacheDebugInfo';

// In development, shows automatically
<CacheDebugInfo />

// In production, enable explicitly
<CacheDebugInfo enabled={true} />
```

## Configuration

### Adjusting Cache Duration

```typescript
// In userSlice.ts
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes instead of 5
```

### Adjusting Cleanup Frequency

```typescript
// In DashboardContent.tsx
useEffect(() => {
  const cleanup = setInterval(
    () => dispatch(cleanExpiredCache()),
    5 * 60 * 1000 // 5 minutes instead of 2
  );
  return () => clearInterval(cleanup);
}, [dispatch]);
```

## Best Practices

1. **Cache Invalidation**: Always invalidate cache when related data changes
2. **Memory Usage**: Monitor cache size in production applications
3. **Error Handling**: Fallback to API call if cache operations fail
4. **Testing**: Test both cached and non-cached scenarios

## Troubleshooting

### Common Issues

1. **Stale Data**: If you see old data, cache might not be invalidating properly

   - Solution: Check cache invalidation logic in relevant actions

2. **Memory Growth**: Cache growing indefinitely

   - Solution: Ensure cleanup intervals are running

3. **API Still Called**: Cache not working
   - Solution: Check cache duration and timestamp logic

### Debug Commands

```javascript
// In browser console
window.__REDUX_DEVTOOLS_EXTENSION__ &&
  window.store.getState().user.cachedSessionDetails;
```

## Future Enhancements

1. **Persistent Cache**: Store cache in localStorage for cross-session persistence
2. **Cache Versioning**: Invalidate cache when app updates
3. **Selective Invalidation**: More granular cache invalidation strategies
4. **Cache Metrics**: Detailed analytics on cache hit/miss rates
5. **Background Refresh**: Refresh cache in background before expiration

## Files Modified

- `src/store/slices/userSlice.ts` - Main caching logic
- `src/components/Dashboard/DashboardContent.tsx` - Cleanup integration
- `src/hooks/useSessionCache.ts` - Custom hook (new)
- `src/utils/cacheUtils.ts` - Utility functions (new)
- `src/components/common/CacheDebugInfo.tsx` - Debug component (new)

## Backward Compatibility

This implementation is fully backward compatible. Existing code continues to work without changes, while new features are available for components that want to use them.
