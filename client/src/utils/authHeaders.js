// Agrega automáticamente "Authorization: Bearer <token>" a TODAS las llamadas
// (axios y fetch) que van al backend web (puerto 3001 /api). Las llamadas a
// otros servidores NO reciben el token.
//
// Si el backend responde 401 (sesión vencida), limpia la sesión y manda al login.
import axios from 'axios';

const ES_API_PROPIA = (url) => typeof url === 'string' && url.includes(':3001/api');
const ES_LOGIN = (url) => typeof url === 'string' && url.includes('/auth/login');

const sesionVencida = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
};

// Se usa también en api.js (las instancias de axios no heredan los interceptores globales)
export const agregarInterceptores = (instancia, { siempre = false } = {}) => {
  instancia.interceptors.request.use((config) => {
    const url = `${config.baseURL || ''}${config.url || ''}`;
    if (siempre || ES_API_PROPIA(url)) {
      const token = localStorage.getItem('token');
      if (token && !config.headers?.Authorization) {
        config.headers = { ...(config.headers || {}), Authorization: `Bearer ${token}` };
      }
    }
    return config;
  });

  instancia.interceptors.response.use(
    (r) => r,
    (error) => {
      const url = `${error?.config?.baseURL || ''}${error?.config?.url || ''}`;
      if (error?.response?.status === 401 && ES_API_PROPIA(url) && !ES_LOGIN(url)) {
        sesionVencida();
      }
      return Promise.reject(error);
    }
  );
};

agregarInterceptores(axios);

// fetch
const fetchOriginal = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input?.url;
  if (!ES_API_PROPIA(url)) return fetchOriginal(input, init);

  const token = localStorage.getItem('token');
  if (token) {
    const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));
    if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    init = { ...init, headers };
  }
  const res = await fetchOriginal(input, init);
  if (res.status === 401 && !ES_LOGIN(url)) sesionVencida();
  return res;
};
