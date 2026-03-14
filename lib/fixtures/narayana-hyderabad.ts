import {
  buildPartnerBranchNormalizedKey,
  normalizeBranchLookupValue,
} from "@/lib/partner-branch-master";
import type {
  Branch,
  BranchCourse,
  BranchFeeSnapshot,
  BranchProfile,
  BranchReview,
  SeatInventorySnapshot,
  BranchTrustAsset,
  BranchContact,
  PartnerBranchVerificationRow,
} from "@/types/domain";

type NarayanaHyderabadSeedBranch = {
  branch_name: string;
  locality: string;
  pincode: string;
  cluster: NonNullable<Branch["geo_cluster"]>;
};

const narayanaInstitutionId = "11000000-0000-4000-8000-000000000001";
const branchSeedBaseDate = new Date("2026-03-13T08:30:00.000Z");

export const NARAYANA_HYDERABAD_PILOT_SCOPE = "NARAYANA_HYDERABAD";
export const NARAYANA_HYDERABAD_ONLY_MODE = "NARAYANA_HYDERABAD_ONLY";
export const NARAYANA_HYDERABAD_INSTITUTION_NAME = "Narayana Junior Colleges";
export const NARAYANA_HYDERABAD_CITY = "Hyderabad";
export const NARAYANA_HYDERABAD_STATE = "Telangana";
export const NARAYANA_HYDERABAD_DISTRICT = "Hyderabad";
export const narayanaHyderabadStarterTrustAssets = [
  "Intermediate admissions support",
  "Competitive exam oriented academic environment",
  "Parent counseling support",
  "Structured study schedule",
] as const;
export const narayanaHyderabadDefaultGroups = ["MPC", "BiPC", "MEC", "CEC"] as const;

const hyderabadDataset = [
  { branch_name: "Narayana Junior College - Chintalkunta", locality: "L.B. Nagar", pincode: "500070" },
  { branch_name: "Narayana Junior College - Madhapur", locality: "Madhapur", pincode: "500081" },
  { branch_name: "Narayana Junior College - Madinaguda", locality: "PJR Enclave", pincode: "500055" },
  { branch_name: "Narayana Junior College - Kukatpally", locality: "Behind JNTU", pincode: "500072" },
  { branch_name: "Narayana Junior College - Dilsukhnagar", locality: "Gaddiannaram", pincode: "500060" },
  { branch_name: "Narayana Junior College - Hayathnagar", locality: "Bhagyala Colony", pincode: "500070" },
  { branch_name: "Narayana Junior College - Saroornagar", locality: "Cherukuthota Colony", pincode: "500035" },
  { branch_name: "Narayana Junior College - Moosarambagh", locality: "Dilsukhnagar", pincode: "500036" },
  { branch_name: "Narayana Junior College - ECIL", locality: "Secunderabad", pincode: "500062" },
  { branch_name: "Narayana Junior College - Narayanaguda", locality: "Narayanaguda", pincode: "500029" },
  { branch_name: "Narayana Junior College - Kondapur", locality: "Kondapur", pincode: "500084" },
  { branch_name: "Narayana Junior College - Bachupally", locality: "Bachupally", pincode: "500090" },
  { branch_name: "Narayana Junior College - Narsingi", locality: "Narsingi", pincode: "500075" },
  { branch_name: "Narayana Junior College - Serilingampally", locality: "Serilingampally", pincode: "500019" },
  { branch_name: "Narayana Junior College - Chanda Nagar", locality: "Chanda Nagar", pincode: "500050" },
  { branch_name: "Narayana Junior College - Kothaguda", locality: "Kothaguda", pincode: "500084" },
  { branch_name: "Narayana Junior College - Himayatnagar", locality: "Himayatnagar", pincode: "500029" },
  { branch_name: "Narayana Junior College - Tarnaka", locality: "Tarnaka", pincode: "500007" },
  { branch_name: "Narayana Junior College - Uppal", locality: "Uppal", pincode: "500039" },
  { branch_name: "Narayana Junior College - Mehdipatnam", locality: "Mehdipatnam", pincode: "500028" },
  { branch_name: "Narayana Junior College - Abids", locality: "Abids", pincode: "500001" },
  { branch_name: "Narayana Junior College - Secunderabad", locality: "Clock Tower", pincode: "500003" },
  { branch_name: "Narayana Junior College - Bowenpally", locality: "Bowenpally", pincode: "500011" },
  { branch_name: "Narayana Junior College - Malkajgiri", locality: "Malkajgiri", pincode: "500047" },
  { branch_name: "Narayana Junior College - Kushaiguda", locality: "Kushaiguda", pincode: "500062" },
  { branch_name: "Narayana Junior College - Nagole", locality: "Nagole", pincode: "500068" },
  { branch_name: "Narayana Junior College - Vanasthalipuram", locality: "Vanasthalipuram", pincode: "500070" },
  { branch_name: "Narayana Junior College - Attapur", locality: "Attapur", pincode: "500048" },
  { branch_name: "Narayana Junior College - Rajendra Nagar", locality: "Rajendra Nagar", pincode: "500052" },
  { branch_name: "Narayana Junior College - Gachibowli", locality: "Gachibowli", pincode: "500032" },
  { branch_name: "Narayana Junior College - Miyapur", locality: "Miyapur", pincode: "500049" },
  { branch_name: "Narayana Junior College - Patancheru", locality: "Patancheru", pincode: "502319" },
  { branch_name: "Narayana Junior College - Shapur Nagar", locality: "Shapur Nagar", pincode: "500055" },
  { branch_name: "Narayana Junior College - Jeedimetla", locality: "Jeedimetla", pincode: "500055" },
  { branch_name: "Narayana Junior College - Kompally", locality: "Kompally", pincode: "500014" },
  { branch_name: "Narayana Junior College - Alwal", locality: "Alwal", pincode: "500010" },
  { branch_name: "Narayana Junior College - Balanagar", locality: "Balanagar", pincode: "500037" },
  { branch_name: "Narayana Junior College - Sanathnagar", locality: "Sanathnagar", pincode: "500018" },
  { branch_name: "Narayana Junior College - Somajiguda", locality: "Somajiguda", pincode: "500082" },
  { branch_name: "Narayana Junior College - Ameerpet", locality: "Ameerpet", pincode: "500016" },
] as const;

const clusterAliases: Record<NonNullable<Branch["geo_cluster"]>, string[]> = {
  WEST_HYDERABAD: [
    "madhapur",
    "kondapur",
    "gachibowli",
    "kothaguda",
    "miyapur",
    "kukatpally",
    "behind jntu",
    "bachupally",
    "madinaguda",
    "pjr enclave",
    "chanda nagar",
    "narsingi",
    "serilingampally",
    "patancheru",
    "jeedimetla",
    "shapur nagar",
    "balanagar",
    "sanathnagar",
    "ameerpet",
    "somajiguda",
    "mehdipatnam",
    "attapur",
    "rajendra nagar",
  ],
  EAST_HYDERABAD: [
    "chintalkunta",
    "l b nagar",
    "lb nagar",
    "hayathnagar",
    "bhagyala colony",
    "saroornagar",
    "cherukuthota colony",
    "moosarambagh",
    "dilsukhnagar",
    "gaddiannaram",
    "uppal",
    "nagole",
    "vanasthalipuram",
    "pedda amberpet",
  ],
  CENTRAL_HYDERABAD: ["narayanaguda", "himayatnagar", "abids"],
  NORTH_HYDERABAD: [
    "ecil",
    "secunderabad",
    "clock tower",
    "bowenpally",
    "malkajgiri",
    "kushaiguda",
    "tarnaka",
    "kompally",
    "alwal",
  ],
};

const aliasToCluster = new Map<string, NonNullable<Branch["geo_cluster"]>>();

Object.entries(clusterAliases).forEach(([cluster, aliases]) => {
  aliases.forEach((alias) =>
    aliasToCluster.set(normalizeBranchLookupValue(alias), cluster as NonNullable<Branch["geo_cluster"]>),
  );
});

function timestamp(daysAgo: number, hourOffset = 0) {
  return new Date(
    branchSeedBaseDate.getTime() - daysAgo * 24 * 60 * 60 * 1000 + hourOffset * 60 * 60 * 1000,
  ).toISOString();
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hashString(input: string, seed: number) {
  let hash = seed >>> 0;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

function stableUuid(input: string) {
  const part1 = hashString(input, 0x811c9dc5).toString(16).padStart(8, "0");
  const part2 = (hashString(input, 0x27d4eb2d) & 0xffff).toString(16).padStart(4, "0");
  const part3 = ((hashString(input, 0x85ebca6b) & 0x0fff) | 0x5000).toString(16).padStart(4, "0");
  const part4 = ((hashString(input, 0xc2b2ae35) & 0x3fff) | 0x8000).toString(16).padStart(4, "0");
  const tail = `${hashString(input, 0x165667b1).toString(16).padStart(8, "0")}${hashString(input, 0x9e3779b9)
    .toString(16)
    .padStart(8, "0")}`.slice(0, 12);

  return `${part1}-${part2}-${part3}-${part4}-${tail}`;
}

function createCourse(code: (typeof narayanaHyderabadDefaultGroups)[number]): BranchCourse {
  const stream = code === "MEC" || code === "CEC" ? "Commerce" : "Science";

  return {
    code,
    name: code,
    stream,
    seats_available: 0,
    duration: "2 years",
  };
}

function getBranchShortName(branchName: string) {
  return branchName.replace(/^Narayana Junior College - /, "").trim();
}

function buildBranchCode(branchName: string) {
  return `NAR-HYD-${toSlug(getBranchShortName(branchName)).toUpperCase()}`;
}

export function getNarayanaHyderabadBranchStableKey(entry: {
  branch_name: string;
  pincode: string;
}) {
  return `${NARAYANA_HYDERABAD_PILOT_SCOPE}:${normalizeBranchLookupValue(entry.branch_name)}:${entry.pincode}`;
}

export function getBranchCluster(localityOrPincode?: string | null): NonNullable<Branch["geo_cluster"]> | null {
  if (!localityOrPincode) {
    return null;
  }

  const normalized = normalizeBranchLookupValue(localityOrPincode);
  if (!normalized) {
    return null;
  }

  if (normalized === "west hyderabad") return "WEST_HYDERABAD";
  if (normalized === "east hyderabad") return "EAST_HYDERABAD";
  if (normalized === "central hyderabad") return "CENTRAL_HYDERABAD";
  if (normalized === "north hyderabad") return "NORTH_HYDERABAD";

  const aliasCluster = aliasToCluster.get(normalized);
  if (aliasCluster) {
    return aliasCluster;
  }

  const matchingBranch = narayanaHyderabadDataset.find(
    (entry) =>
      normalizeBranchLookupValue(entry.locality) === normalized ||
      normalizeBranchLookupValue(getBranchShortName(entry.branch_name)) === normalized ||
      entry.pincode === localityOrPincode,
  );

  return matchingBranch?.cluster ?? null;
}

function resolveCluster(entry: { branch_name: string; locality: string; pincode: string }): NonNullable<Branch["geo_cluster"]> {
  return (
    getBranchCluster(entry.locality) ??
    getBranchCluster(getBranchShortName(entry.branch_name)) ??
    getBranchCluster(entry.pincode) ??
    "CENTRAL_HYDERABAD"
  );
}

export const narayanaHyderabadDataset: NarayanaHyderabadSeedBranch[] = hyderabadDataset.map((entry) => ({
  ...entry,
  cluster: resolveCluster(entry),
}));

const defaultPilotOrder = narayanaHyderabadDataset.map((entry) => entry.branch_name);

function buildBranchRecord(entry: NarayanaHyderabadSeedBranch, index: number): BranchProfile {
  const stableKey = getNarayanaHyderabadBranchStableKey(entry);
  const branchId = stableUuid(`branch:${stableKey}`);

  return {
    id: branchId,
    institution_id: narayanaInstitutionId,
    name: entry.branch_name,
    code: buildBranchCode(entry.branch_name),
    branch_name: entry.branch_name,
    locality: entry.locality,
    district: NARAYANA_HYDERABAD_DISTRICT,
    city: NARAYANA_HYDERABAD_CITY,
    state: NARAYANA_HYDERABAD_STATE,
    pincode: entry.pincode,
    address: `${entry.locality}, ${NARAYANA_HYDERABAD_CITY}, ${NARAYANA_HYDERABAD_STATE} ${entry.pincode}`,
    latitude: null,
    longitude: null,
    maps_url: null,
    google_maps_url: null,
    contact_phone: null,
    contact_email: null,
    hostel_available: true,
    transport_available: true,
    pilot_scope: NARAYANA_HYDERABAD_PILOT_SCOPE,
    geo_cluster: entry.cluster,
    groups_available: [...narayanaHyderabadDefaultGroups],
    photos_json: { items: [] },
    reviews_json: { items: [] },
    trust_assets_json: { trust_points: [...narayanaHyderabadStarterTrustAssets] },
    trust_score: null,
    verification_status: "pending",
    verification_notes:
      "Imported from the Hyderabad Narayana pilot dataset. Coordinates, maps link, contacts, and detailed fee inputs are pending manual verification.",
    courses: narayanaHyderabadDefaultGroups.map((group) => createCourse(group)),
    capacity_total: 0,
    capacity_available: 0,
    priority_rank: defaultPilotOrder.indexOf(entry.branch_name) + 50,
    active: true,
    created_at: timestamp(40 - Math.min(index, 35)),
    updated_at: timestamp(0, index % 6),
    highlights: [...narayanaHyderabadStarterTrustAssets],
    assets: [],
  };
}

export const narayanaHyderabadBranchProfiles: BranchProfile[] = narayanaHyderabadDataset.map(buildBranchRecord);

export const narayanaHyderabadBranches: Branch[] = narayanaHyderabadBranchProfiles.map((branch) => {
  const { assets, highlights, ...branchRow } = branch;
  void assets;
  void highlights;
  return branchRow;
});

export const narayanaHyderabadBranchContacts: BranchContact[] = [];
export const narayanaHyderabadBranchTrustAssets: BranchTrustAsset[] = [];
export const narayanaHyderabadBranchReviews: BranchReview[] = [];

export const narayanaHyderabadBranchFeeSnapshots: BranchFeeSnapshot[] = narayanaHyderabadBranchProfiles.map(
  (branch, index) => ({
    id: stableUuid(`fee:${branch.id}`),
    branch_id: branch.id,
    academic_year: 2026,
    course_code: null,
    tuition_fee: null,
    hostel_fee: null,
    transport_fee: null,
    application_fee: null,
    seat_lock_amount: 1000,
    other_fee_notes:
      "Only the pilot seat-lock default is configured. Tuition, hostel, transport, and application fee details must be added after branch verification.",
    currency: "INR",
    effective_from: "2026-03-13",
    effective_to: null,
    created_at: timestamp(8, index % 5),
    updated_at: timestamp(0, index % 5),
  }),
);

export const narayanaHyderabadSeatInventorySnapshots: SeatInventorySnapshot[] = [];

function buildVerificationDedupeKey(row: {
  institution_name: string;
  pincode: string | null;
  area: string;
  city: string;
}) {
  return [
    normalizeBranchLookupValue(row.institution_name),
    row.pincode ?? "",
    normalizeBranchLookupValue(row.area),
    normalizeBranchLookupValue(row.city),
  ].join("|");
}

export function mergeVerificationRows(rows: PartnerBranchVerificationRow[]) {
  const map = new Map<string, PartnerBranchVerificationRow>();
  rows.forEach((row) => map.set(buildVerificationDedupeKey(row), row));

  return [...map.values()].sort((left, right) => {
    const leftPilot = left.import_batch_source_name?.includes("Hyderabad Narayana pilot") ? 0 : 1;
    const rightPilot = right.import_batch_source_name?.includes("Hyderabad Narayana pilot") ? 0 : 1;

    if (leftPilot !== rightPilot) {
      return leftPilot - rightPilot;
    }

    return `${left.institution_display_name ?? left.institution_name} ${left.city} ${left.area}`.localeCompare(
      `${right.institution_display_name ?? right.institution_name} ${right.city} ${right.area}`,
    );
  });
}

export function buildNarayanaHyderabadVerificationRows(branches: Array<
  Pick<
    Branch,
    | "id"
    | "institution_id"
    | "name"
    | "code"
    | "locality"
    | "district"
    | "city"
    | "state"
    | "pincode"
    | "address"
    | "pilot_scope"
    | "geo_cluster"
    | "verification_status"
    | "verification_notes"
    | "created_at"
    | "updated_at"
  >
>, options?: {
  sourceName?: string;
  institutionName?: string;
}) {
  const institutionName = options?.institutionName ?? NARAYANA_HYDERABAD_INSTITUTION_NAME;
  const sourceName = options?.sourceName ?? "Hyderabad Narayana pilot seed";

  return branches
    .filter((branch) => branch.pilot_scope === NARAYANA_HYDERABAD_PILOT_SCOPE)
    .map((branch) => {
      const area = branch.locality ?? getBranchShortName(branch.name);
      const normalizedKey = buildPartnerBranchNormalizedKey({
        institution: institutionName,
        state: branch.state ?? NARAYANA_HYDERABAD_STATE,
        district: branch.district,
        city: branch.city,
        area,
        pincode: branch.pincode,
        address: branch.address,
        location_type: "branch_seed",
        confidence: "high",
        source_url: null,
        notes: null,
      });

      return {
        id: `pilot-${branch.id}`,
        import_batch_id: "narayana-hyd-pilot",
        institution_name: institutionName,
        institution_id: branch.institution_id,
        state: branch.state ?? NARAYANA_HYDERABAD_STATE,
        district: branch.district,
        city: branch.city,
        area,
        pincode: branch.pincode,
        address: branch.address,
        location_type: "branch_seed",
        confidence: "high",
        source_url: null,
        notes: `Pilot scope ${branch.pilot_scope}; cluster ${branch.geo_cluster ?? "unassigned"}.`,
        normalized_key: normalizedKey,
        existing_branch_id: branch.id,
        verification_status: "imported",
        verification_notes: branch.verification_notes ?? "Pending manual verification.",
        reviewed_by_user_id: null,
        reviewed_at: null,
        promoted_at: null,
        raw_payload: {
          code: branch.code,
          pilot_scope: branch.pilot_scope,
          geo_cluster: branch.geo_cluster,
          stable_key: getNarayanaHyderabadBranchStableKey({
            branch_name: branch.name,
            pincode: branch.pincode,
          }),
        },
        created_at: branch.created_at,
        updated_at: branch.updated_at,
        import_batch_source_name: sourceName,
        existing_branch_name: branch.name,
        existing_branch_code: branch.code,
        institution_display_name: institutionName,
        branch_verification_status: branch.verification_status ?? "pending",
      } satisfies PartnerBranchVerificationRow;
    });
}

export function getHyderabadPilotDefaultOrder() {
  return [...defaultPilotOrder];
}
