/**
 * Session event manager for handling session expiration and activity tracking
 */

export interface SessionEventHandlers {
  onSessionExpired?: () => void;
  onInactivityWarning?: () => void;
  onTokenRefresh?: () => void;
  onSessionRestored?: () => void;
}

class SessionEventManager {
  private handlers: SessionEventHandlers = {};
  private eventListeners: Map<string, EventListener> = new Map();

  constructor() {
    this.initializeEventListeners();
  }

  private initializeEventListeners() {
    // Listen for custom session events
    const sessionExpiredListener = () => {
      this.handlers.onSessionExpired?.();
    };

    const inactivityWarningListener = () => {
      this.handlers.onInactivityWarning?.();
    };

    const tokenRefreshListener = () => {
      this.handlers.onTokenRefresh?.();
    };

    const sessionRestoredListener = () => {
      this.handlers.onSessionRestored?.();
    };

    // Add event listeners
    window.addEventListener('sessionExpired', sessionExpiredListener);
    window.addEventListener('inactivityWarning', inactivityWarningListener);
    window.addEventListener('tokenRefresh', tokenRefreshListener);
    window.addEventListener('sessionRestored', sessionRestoredListener);

    // Store listeners for cleanup
    this.eventListeners.set('sessionExpired', sessionExpiredListener);
    this.eventListeners.set('inactivityWarning', inactivityWarningListener);
    this.eventListeners.set('tokenRefresh', tokenRefreshListener);
    this.eventListeners.set('sessionRestored', sessionRestoredListener);
  }

  public setHandlers(handlers: SessionEventHandlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  public dispatchSessionExpired() {
    window.dispatchEvent(new CustomEvent('sessionExpired'));
  }

  public dispatchInactivityWarning() {
    window.dispatchEvent(new CustomEvent('inactivityWarning'));
  }

  public dispatchTokenRefresh() {
    window.dispatchEvent(new CustomEvent('tokenRefresh'));
  }

  public dispatchSessionRestored() {
    window.dispatchEvent(new CustomEvent('sessionRestored'));
  }

  public cleanup() {
    this.eventListeners.forEach((listener, eventName) => {
      window.removeEventListener(eventName, listener);
    });
    this.eventListeners.clear();
  }
}

// Export singleton instance
export const sessionEventManager = new SessionEventManager();

// Export utility functions
export const dispatchSessionExpired = () => sessionEventManager.dispatchSessionExpired();
export const dispatchInactivityWarning = () => sessionEventManager.dispatchInactivityWarning();
export const dispatchTokenRefresh = () => sessionEventManager.dispatchTokenRefresh();
export const dispatchSessionRestored = () => sessionEventManager.dispatchSessionRestored();

export default sessionEventManager;
