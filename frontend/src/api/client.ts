import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";

const normalizeApiBase = (value: string) => {
  const baseUrl = value.replace(/\/$/, "");
  return baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;
};

const configuredApiBase = process.env.PARCEL_PUBLIC_API_BASE_URL?.trim();
const isLocalFrontend = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const localApiBase = window.location.port === "5000" ? "/api" : "http://localhost:5000/api";
const defaultApiBase = isLocalFrontend ? localApiBase : "/api";

export const API_BASE = configuredApiBase ? normalizeApiBase(configuredApiBase) : defaultApiBase;
export const API_ROOT = API_BASE.replace(/\/api$/, "");

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
