import React from 'react';
import { apiFetch, adminFetch } from './apiFetch';

/**
 * Custom hook for API data fetching with loading and error states
 * Reduces code duplication across components
 * 
 * @param {string} endpoint - API endpoint to fetch from
 * @param {object} options - Options object
 * @param {string} options.method - HTTP method (default: 'GET')
 * @param {object} options.body - Request body
 * @param {object} options.headers - Custom headers
 * @param {string} options.fetchFn - Which fetch to use ('api' or 'admin', default: 'api')
 * @param {boolean} options.skip - Skip fetching (default: false)
 * @param {array} options.dependencies - Dependency array for re-fetch
 * @param {function} options.onSuccess - Success callback
 * @param {function} options.onError - Error callback
 * 
 * @returns {object} { data, loading, error, refetch }
 */
export function useApiData(endpoint, options = {}) {
  const {
    method = 'GET',
    body = null,
    headers = {},
    fetchFn = 'api',
    skip = false,
    dependencies = [],
    onSuccess = null,
    onError = null
  } = options;

  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(!skip);
  const [error, setError] = React.useState('');
  const abortControllerRef = React.useRef(null);

  const fetchFnToUse = fetchFn === 'admin' ? adminFetch : apiFetch;

  const refetch = React.useCallback(async () => {
    if (!endpoint) return;

    try {
      setLoading(true);
      setError('');
      abortControllerRef.current = new AbortController();

      const fetchOptions = {
        method,
        signal: abortControllerRef.current.signal
      };

      if (headers && Object.keys(headers).length > 0) {
        fetchOptions.headers = headers;
      }

      if (body && method !== 'GET') {
        fetchOptions.body = JSON.stringify(body);
        if (!headers['Content-Type']) {
          fetchOptions.headers = { ...headers, 'Content-Type': 'application/json' };
        }
      }

      const res = await fetchFnToUse(endpoint, fetchOptions);
      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorMsg = result?.error || `Failed to fetch from ${endpoint}`;
        throw new Error(errorMsg);
      }

      setData(result);
      if (onSuccess) onSuccess(result);
    } catch (err) {
      if (err.name !== 'AbortError') {
        const errorMsg = err.message || 'An error occurred';
        setError(errorMsg);
        if (onError) onError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }, [endpoint, method, body, headers, fetchFn, onSuccess, onError]);

  React.useEffect(() => {
    if (skip) return;
    refetch();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [skip, refetch, ...dependencies]);

  return { data, loading, error, refetch, setData };
}

/**
 * Hook for paginated API data fetching
 */
export function usePaginatedApiData(endpoint, options = {}) {
  const {
    itemsPerPage = 20,
    fetchFn = 'api',
    skip = false,
    ...restOptions
  } = options;

  const [page, setPage] = React.useState(1);
  const [allItems, setAllItems] = React.useState([]);
  const [totalPages, setTotalPages] = React.useState(1);

  const pageEndpoint = `${endpoint}${endpoint.includes('?') ? '&' : '?'}page=${page}&limit=${itemsPerPage}`;
  const { data, loading, error, refetch } = useApiData(pageEndpoint, {
    fetchFn,
    skip,
    ...restOptions
  });

  React.useEffect(() => {
    if (data) {
      if (page === 1) {
        setAllItems(data.items || []);
      } else {
        setAllItems(prev => [...prev, ...(data.items || [])]);
      }
      setTotalPages(data.totalPages || 1);
    }
  }, [data, page]);

  const loadMore = () => {
    if (page < totalPages) {
      setPage(p => p + 1);
    }
  };

  return {
    items: allItems,
    page,
    totalPages,
    loading,
    error,
    hasMore: page < totalPages,
    loadMore,
    refetch
  };
}
