import axios from "axios";

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

const envUrl =
  typeof import.meta.env.VITE_API_URL === "string"
    ? import.meta.env.VITE_API_URL.trim()
    : "";

/** База API: `VITE_API_URL` из .env или запасной хост. */
export const API_BASE_URL =
  envUrl !== "" ? normalizeBaseUrl(envUrl) : "https://bars-shop.onrender.com";

export const api = axios.create({
  baseURL: API_BASE_URL,
});
