import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";

const API_BASE = window.location.port === "5000" ? "/api" : "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("nutriai_token");
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});
