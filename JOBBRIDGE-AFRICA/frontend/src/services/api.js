import axios from 'axios';

const configuredBase = import.meta.env.VITE_API_URL?.trim()
  || import.meta.env.VITE_API_BASE?.trim();
const normalizedBase = configuredBase
  ?.replace(/\/+$/, '')
  .replace(/(?:\/api)+$/i, '');
if (!normalizedBase && import.meta.env.PROD) {
  throw new Error('VITE_API_URL or VITE_API_BASE must be configured for production builds.');
}
const baseURL = normalizedBase ? `${normalizedBase}/api` : 'http://localhost:4000/api';

const api = axios.create({
  baseURL,
  withCredentials: true, // allows cookies for JWT auth
});

export default api;
