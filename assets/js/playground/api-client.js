/**
 * Lightweight API helper for playground requests
 * @module playground/api-client
 */

import { CONFIG } from './config.js';

const buildUrl = (route) => {
  const base = CONFIG.api.baseUrl.replace(/\/+$/, '');
  const path = (route || '').replace(/^\/+/, '');
  return `${base}/${path}`;
};

export const ApiClient = {
  /**
   * POST JSON payload to API and return a normalized response
   */
  async post(route, payload) {
    try {
      const response = await fetch(buildUrl(route), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload ?? {}),
      });

      const isJson = (response.headers.get('content-type') || '').includes('application/json');
      const data = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const message = typeof data === 'object' && data !== null && 'error' in data
          ? data.error
          : `HTTP ${response.status}: ${response.statusText}`;
        return { ok: false, error: message, data: isJson ? data : null };
      }

      return { ok: true, data };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  },
};
