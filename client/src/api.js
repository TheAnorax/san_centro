import axios from 'axios';

const API = axios.create({
  baseURL: 'http://192.168.3.154:3001/api', // Solo la raíz de la API
});

export default API;
