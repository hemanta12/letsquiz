/** Group quiz session expiry (matches backend session timeout). */
export const GROUP_SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/** localStorage category cache TTL in the service layer. */
export const CATEGORY_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Redux in-memory quiz history cache duration. */
export const HISTORY_CACHE_DURATION_MS = 8 * 60 * 1000; // 8 minutes – just under backend cache

/** Redux in-memory categories cache duration. */
export const CATEGORIES_CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes – categories rarely change
