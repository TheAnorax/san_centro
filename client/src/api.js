import axios from 'axios';
import { agregarInterceptores } from './utils/authHeaders';

const API = axios.create({
  baseURL: 'http://66.232.105.107:3001/api', // Solo la raíz de la API
});

agregarInterceptores(API, { siempre: true });

export default API;
