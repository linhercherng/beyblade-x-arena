import data from "./product-images.json" with { type: "json" };
export interface ProductImage {
  src: string;
  source: string;
  imageSource: string;
  kind: string;
  label: string;
  note: string;
  width: number;
  height: number;
  transparent: boolean;
  imageBounds: number[];
  shape: number[];
  primaryColor: string;
  secondaryColor: string;
  teeth: number;
  sha256: string;
}
export const PRODUCT_IMAGES: Record<string, ProductImage> = data;
