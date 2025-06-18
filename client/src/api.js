import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:3001/api', // Solo la raíz de la API
});

export default API;
