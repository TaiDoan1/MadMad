export interface SizeGuideRow {
  size: string;
  heightMin: number;
  heightMax: number;
  weightMin: number;
  weightMax: number;
}

export interface SizeGuideConfig {
  defaultRows: SizeGuideRow[];
  byCategory: Record<string, SizeGuideRow[]>;
}
