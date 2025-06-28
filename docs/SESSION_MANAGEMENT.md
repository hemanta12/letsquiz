# Session Management Implementation

This document describes the comprehensive session management system implemented to handle user authentication, activity tracking, and session expiration with proper user warnings.

## Overview

The session management system consists of several components working together to provide a secure and user-friendly authentication experience:

1. **Activity Tracking** - Monitors user interaction to detect inactivity
2. **Session Warning System** - Warns users before automatic logout
3. **JWT Token Management** - Handles automatic token refresh
4. **Event-driven Architecture** - Manages session events across the app

## Key Features

### ✅ Implemented Features

- **15-minute inactivity timeout** for authenticated users
- **2-minute warning** before automatic logout
- **User activity detection** (mouse, keyboard, touch events)
- **Session continuation option** with "Continue Session" button
- **Automatic JWT token refresh** 5 minutes before expiration
- **Guest user exclusion** - Only applies to signed-in users
- **Event-driven session management** for loose coupling

### ⚠️ Important Behaviors

- **Guest users are not affected** by inactivity timeouts
- **Only authenticated users** see session warnings and timeouts
- **Activity resets the timer** - any user interaction extends the session
- **Modal prevents dismissal** - Users must choose to continue or logout
- **Automatic logout** occurs if no action is taken within the warning period

## Architecture

### Components

1. **`useActivityTracker` Hook** (`src/hooks/useActivityTracker.ts`)

   - Tracks user activity with configurable timeouts
   - Dispatches warning and expiry events
   - Handles cleanup and memory management

2. **`SessionWarningModal` Component** (`src/components/auth/SessionWarningModal/`)

   - Displays countdown timer and action buttons
   - Prevents accidental dismissal
   - Responsive design for mobile devices

3. **`SessionManager` Component** (`src/components/common/SessionManager/`)

   - Orchestrates activity tracking and warning display
   - Integrates with Redux state management
   - Only active for authenticated non-guest users

4. **`sessionEventManager` Utility** (`src/utils/sessionEventManager.ts`)
   - Centralized event handling for session events
   - Provides clean event dispatcher methods
   - Manages event listener lifecycle

### Configuration

```typescript
const DEFAULT_SESSION_CONFIG = {
  inactivityTimeout: 15 * 60 * 1000, // 15 minutes
  warningTime: 2 * 60 * 1000, // 2 minutes warning
};
```

### JWT Token Settings

**Backend (Django):**

- Access token lifetime: 30 minutes
- Refresh token lifetime: 1 day
- Token rotation enabled
- Blacklisting enabled after rotation

**Frontend:**

- Auto-refresh threshold: 5 minutes before expiration
- Session check interval: 60 seconds
- Token validation on each API request

## User Experience Flow

### Normal Session Flow

1. User logs in → Session tracking starts
2. User interacts → Activity timer resets
3. Token approaching expiry → Auto-refresh (transparent)
4. User remains active → Session continues indefinitely

### Inactivity Warning Flow

1. 13 minutes of inactivity → Warning countdown starts
2. Warning modal appears → 2-minute countdown
3. User clicks "Continue" → Session extends, modal closes
4. User clicks "Logout" → Immediate logout
5. No action taken → Automatic logout after countdown

### Session Expiration Flow

1. JWT tokens expire → Automatic refresh attempted
2. Refresh fails → Session marked as expired
3. User redirected to login page
4. Session data cleared from storage

## Implementation Details

### Activity Detection Events

```typescript
const events = [
  "mousedown",
  "mousemove",
  "keypress",
  "scroll",
  "touchstart",
  "click",
];
```

### State Management Integration

- Uses Redux for authentication state
- Integrates with existing auth slice
- Maintains session state consistency

### Security Considerations

- Encrypted token storage using AES
- Secure session data handling
- Proper cleanup on logout
- Guest session isolation

## Error Handling

### Token Refresh Failures

- Automatic fallback to logout
- User notification of session expiry
- Clean state reset

### Network Issues

- Retry logic for token refresh
- Graceful degradation
- User feedback on connection issues

### Edge Cases

- Browser tab switching (activity continues)
- System sleep/wake (session validation)
- Multiple tab synchronization (shared storage)

## Testing Scenarios

### Manual Testing

1. **Inactivity Timeout**: Stay idle for 13+ minutes, verify warning appears
2. **Continue Session**: Click continue button, verify session extends
3. **Automatic Logout**: Let warning countdown expire, verify logout
4. **Guest User**: Ensure guests are not affected by timeouts
5. **Token Refresh**: Verify automatic refresh works transparently

### Activity Detection

- Mouse movement and clicks
- Keyboard input
- Touch interactions on mobile
- Scroll events

## Debugging

### Console Logs

Activity tracker and session events log to console with `[Session]` prefix:

```
[Session] Token approaching expiration, attempting refresh
[Session] Token refreshed successfully
[Activity] Session expired due to inactivity
```

### Redux DevTools

Monitor auth state changes:

- `isAuthenticated` status
- `tokenExpiresAt` timestamps
- Session expiry actions

## Configuration Options

All timeouts are configurable via props:

```typescript
useActivityTracker({
  inactivityTimeout: 15 * 60 * 1000, // 15 minutes
  warningTime: 2 * 60 * 1000, // 2 minutes
  onInactivityWarning: handleWarning,
  onSessionExpired: handleExpiry,
});
```

## Future Enhancements

### Potential Improvements

1. **Server-side session validation** - Verify session status with backend
2. **Persistent activity tracking** - Store activity across browser sessions
3. **Configurable timeouts per user type** - Different timeouts for premium users
4. **Session analytics** - Track session duration and activity patterns
5. **Progressive warnings** - Multiple warning levels (5min, 2min, 30sec)

### Security Enhancements

1. **Device fingerprinting** - Detect session hijacking
2. **IP validation** - Verify session from same IP
3. **Concurrent session limits** - Limit active sessions per user
4. **Enhanced encryption** - More robust token encryption methods

## Troubleshooting

### Common Issues

**Warning doesn't appear:**

- Check if user is authenticated (not guest)
- Verify activity tracking is enabled
- Check browser console for errors

**Session not extending:**

- Ensure activity events are firing
- Check token refresh is working
- Verify backend session is valid

**Frequent logouts:**

- Check system clock synchronization
- Verify token expiration times
- Review network connectivity issues

### Debug Commands

```javascript
// Check auth state
console.log(store.getState().auth);

// Manual activity reset
window.dispatchEvent(new Event("mousedown"));

// Check token expiration
console.log("Token expires:", new Date(tokenExpiresAt));
```

This implementation provides a robust, user-friendly session management system that balances security with usability, ensuring users are properly warned before being logged out due to inactivity.
