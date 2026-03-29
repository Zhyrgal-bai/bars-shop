export type Size = {
  size: string;
  stock: number;
};

export type Variant = {
  color: string;
  sizes: Size[];
};

export type Product = {
  id: number;
  name: string;
  price: number;
  image: string;
  variants: Variant[];
};
