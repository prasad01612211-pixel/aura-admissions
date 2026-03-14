const districtAliases: Record<string, string> = {
  ANANTHAPURAMU: "Anantapuramu",
  ANANTAPURAMU: "Anantapuramu",
  SRI_SATHYA_SAI: "Sri Sathya Sai",
  TIRUPATHI: "Tirupati",
  TIRUPATI: "Tirupati",
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function isMeaningfulValue(value: unknown) {
  if (value === null || value === undefined) {
    return false;
  }

  const normalized = normalizeWhitespace(String(value));
  return normalized.length > 0 && normalized.toUpperCase() !== "NA" && normalized.toUpperCase() !== "N/A";
}

export function cleanCell(value: unknown) {
  return isMeaningfulValue(value) ? normalizeWhitespace(String(value)) : "";
}

export function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function normalizeDistrict(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const compact = normalizeWhitespace(value).toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  return districtAliases[compact] ?? titleCase(compact.replace(/_/g, " "));
}

export function normalizePincode(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const digits = value.replace(/\D/g, "");
  return digits.length === 6 ? digits : null;
}

export function normalizePhoneNumber(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const digits = value.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  if (digits.length === 13 && digits.startsWith("091")) {
    return `+91${digits.slice(3)}`;
  }

  return null;
}

export function normalizeHeader(value: string) {
  return cleanCell(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function deriveCityFromDistrict(district: string | null) {
  return district;
}

export function slugifyFilename(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function inferCourseFromFilename(fileName: string) {
  const normalized = fileName.toUpperCase();
  if (normalized.includes("MPC")) return "MPC";
  if (normalized.includes("BIPC")) return "BiPC";
  if (normalized.includes("MEC")) return "MEC";
  if (normalized.includes("CEC")) return "CEC";
  return null;
}
