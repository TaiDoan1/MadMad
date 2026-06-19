type DbProduct = {
  image: string;
  images: string | null;
  colorImages: string | null;
};

function parseJsonRecord(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

const COLOR_EQUIVALENTS: Record<string, string[]> = {
  "đen": ["black", "den"],
  black: ["đen", "den"],
  "trắng": ["white", "trang", "off-white"],
  white: ["trắng", "trang"],
  "xám": ["grey", "gray", "xam", "charcoal"],
  grey: ["xám", "xam", "gray"],
  gray: ["xám", "xam", "grey"],
  "đỏ": ["red", "do"],
  red: ["đỏ", "do"],
  navy: ["xanh navy", "blue"],
  be: ["beige"],
};

function normalizeColor(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function colorsEquivalent(a: string, b: string): boolean {
  const left = normalizeColor(a);
  const right = normalizeColor(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const leftAliases = COLOR_EQUIVALENTS[left] || [];
  const rightAliases = COLOR_EQUIVALENTS[right] || [];
  return leftAliases.includes(right) || rightAliases.includes(left);
}

function findColorImageUrl(colorImages: Record<string, string>, color: string): string | undefined {
  const cleanColor = color.trim();
  if (!cleanColor) return undefined;

  const directFront = colorImages[`${cleanColor}-front`];
  if (directFront) return directFront;

  const direct = colorImages[cleanColor];
  if (direct) return direct;

  let fallbackBack: string | undefined;

  for (const [key, url] of Object.entries(colorImages)) {
    if (!url) continue;
    const base = key.replace(/-front$|-back$/i, "");
    if (!colorsEquivalent(base, cleanColor)) continue;
    if (/-front$/i.test(key)) return url;
    if (!fallbackBack) fallbackBack = url;
  }

  return fallbackBack;
}

function parseImageList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getProductImageForColorFromDb(product: DbProduct, color: string): string {
  const colorImages = parseJsonRecord(product.colorImages);
  const matched = findColorImageUrl(colorImages, color);
  if (matched) return matched;

  return parseImageList(product.images)[0] || product.image || "";
}

export function isStoredImageMismatch(storedImage: string, expectedImage: string): boolean {
  const stored = storedImage.trim();
  const expected = expectedImage.trim();
  if (!stored || !expected) return false;
  return stored !== expected;
}
