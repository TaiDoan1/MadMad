export interface SizeGuideRow {
  size: string;
  heightMin: number;
  heightMax: number;
  weightMin: number;
  weightMax: number;
}

export interface SizeGuideConfig {
  defaultRows: SizeGuideRow[];
  /** Bảng theo danh mục (Áo Thun, Áo Khoác…) */
  byCategory: Record<string, SizeGuideRow[]>;
  /** Bảng theo kiểu/form riêng — gán từng sản phẩm qua sizeGuideProfile */
  byProfile: Record<string, SizeGuideRow[]>;
}
