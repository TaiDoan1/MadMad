export type AddressOption = { code: string; name: string };

type Province = { code: string; name: string; unit: string };
type District = { code: string; name: string; unit: string; province_code: string };
type Ward = { code: string; name: string; unit: string; district_code: string; province_code: string };

type PcVnModule = {
  getProvinces: () => Province[];
  getDistricts: () => District[];
  getWards: () => Ward[];
  getDistrictsByProvinceCode: (provinceCode: string) => District[];
  getWardsByDistrictCode: (districtCode: string) => Ward[];
};

let pcVnPromise: Promise<PcVnModule> | null = null;
let provincesCache: Province[] | null = null;
let districtsCache: District[] | null = null;
let wardsCache: Ward[] | null = null;

async function loadPcVn(): Promise<PcVnModule> {
  if (!pcVnPromise) {
    pcVnPromise = import("pc-vn").then((mod) => (mod.default ?? mod) as PcVnModule);
  }
  return pcVnPromise;
}

async function ensureCaches() {
  const pcVn = await loadPcVn();
  if (!provincesCache) provincesCache = pcVn.getProvinces();
  if (!districtsCache) districtsCache = pcVn.getDistricts();
  if (!wardsCache) wardsCache = pcVn.getWards();
  return { pcVn, PROVINCES: provincesCache, DISTRICTS: districtsCache, WARDS: wardsCache };
}

export async function getProvinces(): Promise<AddressOption[]> {
  const { PROVINCES } = await ensureCaches();
  return PROVINCES.map((p) => ({ code: p.code, name: p.name }));
}

export async function getDistrictsByProvinceCode(provinceCode: string): Promise<AddressOption[]> {
  if (!provinceCode) return [];
  const { pcVn } = await ensureCaches();
  return pcVn.getDistrictsByProvinceCode(provinceCode).map((d) => ({ code: d.code, name: d.name }));
}

export async function getWardsByDistrictCode(districtCode: string): Promise<AddressOption[]> {
  if (!districtCode) return [];
  const { pcVn } = await ensureCaches();
  return pcVn.getWardsByDistrictCode(districtCode).map((w) => ({ code: w.code, name: w.name }));
}

export async function getProvinceNameByCode(code: string) {
  const { PROVINCES } = await ensureCaches();
  return PROVINCES.find((p) => p.code === code)?.name ?? "";
}

export async function getDistrictNameByCode(code: string) {
  const { DISTRICTS } = await ensureCaches();
  return DISTRICTS.find((d) => d.code === code)?.name ?? "";
}

export async function getWardNameByCode(code: string) {
  const { WARDS } = await ensureCaches();
  return WARDS.find((w) => w.code === code)?.name ?? "";
}

