import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api`;

console.log(API_BASE_URL)
console.log(import.meta.env)

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});
