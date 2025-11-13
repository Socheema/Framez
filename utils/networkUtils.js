/**
 * Network utility functions for handling timeouts and retries
 */

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry configuration
 * @returns {Promise} Result of the function
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
    onRetry = null,
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on certain errors
      if (error.code === '23505' || error.code === 'PGRST116') {
        throw error;
      }

      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        console.error(`Failed after ${maxRetries + 1} attempts:`, error);
        throw error;
      }

      // Log retry attempt
      console.log(`Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
      
      if (onRetry) {
        onRetry(attempt + 1, delay, error);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Increase delay for next attempt (exponential backoff)
      delay = Math.min(delay * factor, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Execute a Supabase query with retry logic
 * @param {Function} queryFn - Supabase query function
 * @param {Object} options - Retry options
 * @returns {Promise} Query result
 */
export async function executeWithRetry(queryFn, options = {}) {
  return retryWithBackoff(async () => {
    const result = await queryFn();
    
    // Check for Supabase error
    if (result.error) {
      throw result.error;
    }
    
    return result;
  }, options);
}

/**
 * Cache for storing query results
 */
const queryCache = new Map();

/**
 * Execute query with caching
 * @param {string} key - Cache key
 * @param {Function} queryFn - Query function
 * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
 * @returns {Promise} Query result
 */
export async function executeWithCache(key, queryFn, ttl = 5 * 60 * 1000) {
  const cached = queryCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < ttl) {
    console.log(`Cache hit for key: ${key}`);
    return cached.data;
  }

  const data = await queryFn();
  
  queryCache.set(key, {
    data,
    timestamp: Date.now(),
  });

  return data;
}

/**
 * Clear cache for a specific key or all cache
 * @param {string} key - Cache key (optional, clears all if not provided)
 */
export function clearCache(key = null) {
  if (key) {
    queryCache.delete(key);
  } else {
    queryCache.clear();
  }
}

/**
 * Batch multiple requests and execute them in parallel
 * @param {Array<Function>} requests - Array of async functions
 * @param {number} batchSize - Number of requests to execute at once
 * @returns {Promise<Array>} Array of results
 */
export async function batchRequests(requests, batchSize = 5) {
  const results = [];
  
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(fn => fn()));
    
    results.push(...batchResults.map(result => 
      result.status === 'fulfilled' ? result.value : null
    ));
  }
  
  return results;
}

/**
 * Add timeout to a promise
 * @param {Promise} promise - Promise to add timeout to
 * @param {number} timeout - Timeout in milliseconds
 * @param {string} errorMessage - Error message for timeout
 * @returns {Promise}
 */
export function withTimeout(promise, timeout = 15000, errorMessage = 'Request timeout') {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeout)
    ),
  ]);
}

/**
 * Check if error is a network error
 * @param {Error} error - Error to check
 * @returns {boolean}
 */
export function isNetworkError(error) {
  return (
    error.message?.includes('fetch failed') ||
    error.message?.includes('Network') ||
    error.message?.includes('timeout') ||
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT'
  );
}

/**
 * Get user-friendly error message
 * @param {Error} error - Error object
 * @returns {string} User-friendly error message
 */
export function getErrorMessage(error) {
  if (isNetworkError(error)) {
    return 'Network connection issue. Please check your internet connection and try again.';
  }
  
  return error.message || 'An unexpected error occurred';
}
