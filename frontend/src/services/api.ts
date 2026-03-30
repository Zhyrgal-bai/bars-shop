import axios from "axios";

export const api = axios.create({
  baseURL: "https://bars-shop.onrender.com", // 👈 ВАЖНО
});