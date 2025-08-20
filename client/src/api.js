import axios from 'axios';

const API = axios.create({
  baseURL: 'http://66.232.105.107:3001/api', // Solo la raíz de la API
});

export default API;
