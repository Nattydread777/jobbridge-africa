import axios from 'axios';

const configuredBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE;
const normalizedBase = configuredBase?.trim().replace(/\/+$/, '');
if (!normalizedBase && import.meta.env.PROD) {
  throw new Error('VITE_API_URL must be configured for production builds.');
}
const baseURL = normalizedBase
  ? normalizedBase.endsWith('/api')
    ? normalizedBase
    : `${normalizedBase}/api`
  : 'http://localhost:4000/api';

const api = axios.create({
  baseURL,
  withCredentials: true, // allows cookies for JWT auth
});

export default api;
