import { api } from "./api";
import type { Product } from "../types";

export const adminService = {
  async getProducts(): Promise<Product[]> {
    const res = await api.get<Product[]>("/products");
    return res.data;
  },

  async createProduct(data: Product): Promise<Product> {
    try {
      const res = await api.post<Product>("/products", data);
      console.log("CREATED:", res.data);
      return res.data;
    } catch (e: unknown) {
      if (e instanceof Error) {
        console.error("CREATE ERROR:", e.message);
      }
      throw e;
    }
  },

  async deleteProduct(id: number): Promise<void> {
    await api.delete(`/products/${id}`);
  },
};