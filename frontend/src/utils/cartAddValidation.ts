import type { Product, Size } from "../types";
import { getNormalizedVariants } from "./product";

const FALLBACK: Size = { size: "M", stock: 10 };

/** Сколько опций цвета у товара (0 — плоский товар / один наследуемый цвет). */
export function countColorOptions(product: Product): number {
  if (product.variants && product.variants.length > 0) {
    return product.variants.length;
  }
  if (product.colors && product.colors.length > 0) {
    return product.colors.length;
  }
  return 0;
}

/**
 * Список размеров для выбранного цвета (для `product.sizes` `colorKey` не используется).
 */
export function getSizesListForSelection(
  product: Product,
  colorKey: string | null
): Size[] {
  if (product.sizes && product.sizes.length > 0) {
    return product.sizes;
  }
  if (product.variants && product.variants.length > 0) {
    if (!colorKey) return [];
    const v = product.variants.find((x) => x.color === colorKey);
    return v?.sizes ?? [];
  }
  const v0 = getNormalizedVariants(product)[0];
  if (v0?.sizes?.length) return v0.sizes;
  return [FALLBACK];
}

/** Нужен явный выбор цвета (несколько вариантов). */
export function needsColorUserChoice(product: Product): boolean {
  return countColorOptions(product) > 1;
}

/**
 * Нужен явный выбор размера. Пока не выбран цвет (при нескольких цветах) — false,
 * сначала сработает проверка цвета. Иначе — больше одного размера у текущего варианта.
 */
export function needsSizeUserChoice(
  product: Product,
  selectedColor: string | null
): boolean {
  if (needsColorUserChoice(product) && selectedColor == null) {
    return false;
  }
  const c = getEffectiveColorKey(product, selectedColor);
  if (c == null) {
    return false;
  }
  return getSizesListForSelection(product, c).length > 1;
}

/**
 * Один итоговый ключ цвета для корзины: при одном варианте — без клика по свотчу.
 */
export function getEffectiveColorKey(
  product: Product,
  selectedColor: string | null
): string | null {
  const n = countColorOptions(product);
  if (n === 0) {
    return getNormalizedVariants(product)[0]?.color ?? "default";
  }
  if (n === 1) {
    if (product.variants?.[0]) return product.variants[0]!.color;
    if (product.colors?.[0]) return product.colors[0]!.name;
  }
  return selectedColor;
}

/**
 * Один итоговый размер: при одном варианте — без клика по кнопке.
 */
export function getEffectiveSizeKey(
  product: Product,
  selectedColor: string | null,
  selectedSize: string | null
): string | null {
  const c = getEffectiveColorKey(product, selectedColor);
  if (c == null) return null;
  const list = getSizesListForSelection(product, c);
  if (list.length === 0) return null;
  if (list.length === 1) return list[0]!.size;
  return selectedSize;
}

export type ValidateAddToCartResult =
  | { ok: true; size: string; color: string; stock: number }
  | { ok: false; message: string };

/**
 * Проверка перед «Добавить в корзину».
 * @param isOut — `isOutOfStock(product)`; при true кнопка обычно disabled, вызов не ожидается.
 */
export function validateAddToCartInput(
  product: Product,
  selectedSize: string | null,
  selectedColor: string | null,
  isOut: boolean
): ValidateAddToCartResult {
  if (isOut) {
    return { ok: false, message: "Нет в наличии" };
  }
  if (needsColorUserChoice(product) && selectedColor == null) {
    return { ok: false, message: "Пожалуйста, выберите цвет" };
  }
  if (needsSizeUserChoice(product, selectedColor) && selectedSize == null) {
    return { ok: false, message: "Пожалуйста, выберите размер" };
  }
  const color = getEffectiveColorKey(product, selectedColor);
  if (color == null) {
    return { ok: false, message: "Пожалуйста, выберите цвет" };
  }
  const size = getEffectiveSizeKey(product, selectedColor, selectedSize);
  if (size == null) {
    return { ok: false, message: "Пожалуйста, выберите размер" };
  }
  const list = getSizesListForSelection(product, color);
  const line = list.find((s) => s.size === size);
  if (!line || line.stock <= 0) {
    return { ok: false, message: "Нет в наличии" };
  }
  return { ok: true, size, color, stock: line.stock };
}
