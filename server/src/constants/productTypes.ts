export const PRODUCT_TYPES = {
  ELECTRONIC: ['Kulkas', 'TV', 'Laptop', 'Speaker', 'Mesin Cuci', 'Lainnya'],
  FURNITURE: ['Springbed', 'Meja', 'Kursi', 'Lemari', 'Seprai', 'Lainnya'],
  VEHICLE: ['Sepeda Motor', 'Mobil', 'Sepeda Listrik', 'Lainnya']
} as const;

export type Category = keyof typeof PRODUCT_TYPES;
