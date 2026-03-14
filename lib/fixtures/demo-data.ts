import type {
  AdmissionForm,
  AdmissionAttribution,
  Branch,
  BranchAsset,
  BranchContact,
  BranchCourse,
  BranchFeeSnapshot,
  BranchProfile,
  BranchReview,
  BranchTrustAsset,
  Campaign,
  CommissionRule,
  Conversation,
  Institution,
  LeadOptIn,
  Lead,
  LeadEvent,
  Payment,
  PayoutLedger,
  SeatInventorySnapshot,
  Task,
  User,
} from "@/types/domain";
import {
  narayanaHyderabadBranchContacts,
  narayanaHyderabadBranchFeeSnapshots,
  narayanaHyderabadBranchProfiles,
  narayanaHyderabadBranchReviews,
  narayanaHyderabadSeatInventorySnapshots,
  narayanaHyderabadBranchTrustAssets,
  narayanaHyderabadBranches,
} from "@/lib/fixtures/narayana-hyderabad";
import { leadStages } from "@/types/domain";

const pilotBaseDate = new Date("2026-03-10T08:30:00.000Z");
const seatLockAmount = 1000;
const stageIndex = new Map(leadStages.map((stage, index) => [stage, index]));

const timestamp = (daysAgo: number, hourOffset = 0) =>
  new Date(pilotBaseDate.getTime() - daysAgo * 24 * 60 * 60 * 1000 + hourOffset * 60 * 60 * 1000).toISOString();

const makeUuid = (namespace: number, index: number) =>
  `${namespace.toString(16).padStart(8, "0")}-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;

function mergeById<T extends { id: string }>(...collections: T[][]) {
  const map = new Map<string, T>();
  collections.flat().forEach((row) => map.set(row.id, row));
  return [...map.values()];
}

const hasReachedStage = (currentStage: Lead["stage"], targetStage: Lead["stage"]) =>
  (stageIndex.get(currentStage) ?? 0) >= (stageIndex.get(targetStage) ?? 0);

const course = (code: string, stream: string, seats_available: number): BranchCourse => ({
  code,
  name: code,
  stream,
  seats_available,
  duration: "2 years",
});

const userIds = {
  admin: makeUuid(0x10000000, 1),
  counselor: makeUuid(0x10000000, 2),
  operations: makeUuid(0x10000000, 3),
} as const;

const institutionIds = {
  narayana: makeUuid(0x11000000, 1),
  srichaitanya: makeUuid(0x11000000, 2),
  dhanikbharat: makeUuid(0x11000000, 3),
} as const;

const branchIds = {
  kukatpally: makeUuid(0x20000000, 1),
  dilsukhnagar: makeUuid(0x20000000, 2),
  hanamkonda: makeUuid(0x20000000, 3),
  karimnagar: makeUuid(0x20000000, 4),
  khammam: makeUuid(0x20000000, 5),
  jubileehills: makeUuid(0x20000000, 6),
  hayathnagar: makeUuid(0x20000000, 7),
  hydernagar: makeUuid(0x20000000, 8),
  nizampet: makeUuid(0x20000000, 9),
} as const;

type UserKey = keyof typeof userIds;
type InstitutionKey = keyof typeof institutionIds;
type BranchKey = keyof typeof branchIds;

export const users: User[] = [
  { id: userIds.admin, name: "Ananya Rao", role: "admin", phone: "+919900000111", email: "ananya.rao@admissions.local", active: true, created_at: timestamp(30) },
  { id: userIds.counselor, name: "Raghav Goud", role: "counselor", phone: "+919900000112", email: "raghav.goud@admissions.local", active: true, created_at: timestamp(24) },
  { id: userIds.operations, name: "Fatima Khan", role: "operations", phone: "+919900000113", email: "fatima.khan@admissions.local", active: true, created_at: timestamp(21) },
];

export const institutions: Institution[] = [
  {
    id: institutionIds.narayana,
    name: "Narayana Junior Colleges",
    slug: "narayana-junior-colleges",
    short_name: "Narayana",
    website_url: "https://www.narayanajuniorcolleges.com/",
    contact_email: "info@narayanajuniorcolleges.com",
    contact_phone: "18001023344",
    hq_address: "Melange Towers, Madhapur, Hyderabad",
    status: "active",
    active: true,
    created_at: timestamp(120),
    updated_at: timestamp(3),
  },
  {
    id: institutionIds.srichaitanya,
    name: "Sri Chaitanya Junior College",
    slug: "sri-chaitanya-junior-college",
    short_name: "Sri Chaitanya",
    website_url: "https://srichaitanyajuniorcollege.com/",
    contact_email: "admission@srichaitanyajuniorcollege.com",
    contact_phone: "9014901936",
    hq_address: "Upperpally, Rajendranagar, Hyderabad",
    status: "active",
    active: true,
    created_at: timestamp(118),
    updated_at: timestamp(2),
  },
  {
    id: institutionIds.dhanikbharat,
    name: "Dhanik Bharat Educational Institutions",
    slug: "dhanik-bharat-educational-institutions",
    short_name: "Dhanik Bharat",
    website_url: "https://dhanikbharat.org/",
    contact_email: "care@dhanikbharat.org",
    contact_phone: "9555825559",
    hq_address: "KPHB Colony, Kukatpally, Hyderabad",
    status: "active",
    active: true,
    created_at: timestamp(116),
    updated_at: timestamp(1),
  },
];

const branchInstitutionByKey: Record<BranchKey, InstitutionKey> = {
  kukatpally: "narayana",
  dilsukhnagar: "srichaitanya",
  hanamkonda: "srichaitanya",
  karimnagar: "narayana",
  khammam: "dhanikbharat",
  jubileehills: "narayana",
  hayathnagar: "narayana",
  hydernagar: "srichaitanya",
  nizampet: "srichaitanya",
};

const branchBlueprints = [
  {
    key: "kukatpally",
    name: "Narayana Junior College - Kukatpally Housing Board",
    code: "NAR-KPHB",
    district: "Hyderabad",
    city: "Hyderabad",
    pincode: "500072",
    address: "Near Bus Stop, Behind Tabla Restaurant, Opposite Shiva Parvathi Theatre, Bhagya Nagar Colony, Kukatpally Housing Board, Hyderabad",
    latitude: 17.4948,
    longitude: 78.3996,
    hostel_available: false,
    transport_available: true,
    capacity_total: 1200,
    capacity_available: 180,
    priority_rank: 1,
    courses: [course("MPC", "Science", 64), course("BiPC", "Science", 42)],
    highlights: [
      "Strong public trust around structured academic practice and test readiness.",
      "Well-known city branch for board plus entrance-oriented intermediate programs.",
      "Useful for parents prioritizing brand recognition and Hyderabad city access.",
    ],
    assets: [["campus", "Kukatpally campus frontage"], ["labs", "Kukatpally academic block"]],
    contact_name: "Narayana Central Admissions",
    contact_phone: "+9118001023344",
    contact_email: "info@narayanajuniorcolleges.com",
    contact_whatsapp: null,
    photo_source_url: "https://www.narayanajuniorcolleges.com/",
    results_source_url: "https://narayanajuniorcolleges.com/results",
    review_source: "justdial",
    review_url:
      "https://www.justdial.com/Hyderabad/Narayana-Junior-College-Near-Bus-Stop-Behind-Tabla-Restaurant-Opposite-Shiva-Parvathi-Theatre-Bhagya-Nagar-Colony-Kukatpally-Housing-Board/040PXX40-XX40-000556552474-W1X2_BZDET/reviews",
  },
  {
    key: "dilsukhnagar",
    name: "Sri Chaitanya Junior College - Dilsukhnagar",
    code: "SCJ-DLSK",
    district: "Hyderabad",
    city: "Hyderabad",
    pincode: "500060",
    address: "Opposite FIITJEE School, Gaddiannaram, Dilsukhnagar, Hyderabad",
    latitude: 17.3688,
    longitude: 78.5247,
    hostel_available: true,
    transport_available: true,
    capacity_total: 900,
    capacity_available: 120,
    priority_rank: 2,
    courses: [course("MPC", "Science", 35), course("BiPC", "Science", 28)],
    highlights: [
      "Strong review volume and established local recall in the east Hyderabad belt.",
      "Useful for parents comparing academic reputation with day or residential convenience.",
      "Public reviews consistently mention academic rigor, with pressure concerns to handle transparently.",
    ],
    assets: [["campus", "Dilsukhnagar campus block"], ["hostel", "Dilsukhnagar hostel study hall"]],
    contact_name: "Sri Chaitanya Admissions Desk",
    contact_phone: "+919014901936",
    contact_email: "admission@srichaitanyajuniorcollege.com",
    contact_whatsapp: "+919398391594",
    photo_source_url: "https://srichaitanya.net/",
    results_source_url: "https://srichaitanyajuniorcollege.com/results/",
    review_source: "justdial",
    review_url:
      "https://www.justdial.com/Hyderabad/Sri-Chaitanya-Junior-College-Opposite-FIITJEE-School-Gaddi-Annaram-Dilsukh-Nagar/040PXX40-XX40-090804150622-Q8P4_BZDET/reviews",
  },
  {
    key: "hanamkonda",
    name: "Sri Chaitanya Junior College - Upperpally",
    code: "SCJ-UPLY",
    district: "Ranga Reddy",
    city: "Hyderabad",
    pincode: "500048",
    address:
      "House No. 2-4-14/1/2, Plot No. 101/P & 104, Pillar No. 179, New Friends Colony, Upperpally Village, Rajendranagar Mandal, RR District, Telangana 500048",
    latitude: 17.3433,
    longitude: 78.4281,
    hostel_available: false,
    transport_available: true,
    capacity_total: 750,
    capacity_available: 140,
    priority_rank: 1,
    courses: [course("MPC", "Science", 52), course("BiPC", "Science", 44), course("MEC", "Commerce", 24), course("CEC", "Commerce", 22)],
    highlights: [
      "Most complete public branch profile in the current research set.",
      "Official site publishes address, gallery, transport cues, and results proof.",
      "Useful for parents who need a concrete trust pack before committing to a visit.",
    ],
    assets: [["campus", "Upperpally academic block"], ["lounge", "Upperpally learning lounge"]],
    contact_name: "Sri Chaitanya Upperpally Admissions",
    contact_phone: "+919014901936",
    contact_email: "admission@srichaitanyajuniorcollege.com",
    contact_whatsapp: "+919063645199",
    photo_source_url: "https://srichaitanyajuniorcollege.com/gallery/",
    results_source_url: "https://srichaitanyajuniorcollege.com/results/",
    review_source: "justdial",
    review_url:
      "https://www.justdial.com/Hyderabad/Sri-Chaitanya-Junior-College-Rajendranagar-Mandal-Upparpally/040PXX40-XX40-211215153313-K2X1_BZDET/reviews",
  },
  {
    key: "karimnagar",
    name: "Narayana Junior College - Tarnaka",
    code: "NAR-TRNK",
    district: "Hyderabad",
    city: "Hyderabad",
    pincode: "500017",
    address: "Near St. Ann's School, Tarnaka, Hyderabad",
    latitude: 17.4283,
    longitude: 78.5386,
    hostel_available: false,
    transport_available: true,
    capacity_total: 680,
    capacity_available: 90,
    priority_rank: 2,
    courses: [course("MPC", "Science", 31), course("BiPC", "Science", 26)],
    highlights: [
      "Known Narayana branch with substantial public review volume in Hyderabad.",
      "Useful for families that value established exam-orientation and city accessibility.",
      "Counselors should proactively address fee and infra concerns from public reviews.",
    ],
    assets: [["campus", "Tarnaka campus"], ["classrooms", "Tarnaka classrooms"]],
    contact_name: "Narayana Central Admissions",
    contact_phone: "+9118001023344",
    contact_email: "info@narayanajuniorcolleges.com",
    contact_whatsapp: null,
    photo_source_url: "https://www.narayanajuniorcolleges.com/",
    results_source_url: "https://narayanajuniorcolleges.com/results",
    review_source: "justdial",
    review_url:
      "https://www.justdial.com/Hyderabad/Narayana-Junior-College-Near-St-Anns-School-Tarnaka/040P8209580_BZDET/reviews",
  },
  {
    key: "jubileehills",
    name: "Narayana Junior College - Jubilee Hills",
    code: "NAR-JHLS",
    district: "Hyderabad",
    city: "Hyderabad",
    pincode: "500033",
    address: "Near Film Nagar Club, Jubilee Hills, Hyderabad",
    latitude: 17.4322,
    longitude: 78.4071,
    hostel_available: false,
    transport_available: true,
    capacity_total: 620,
    capacity_available: 84,
    priority_rank: 3,
    courses: [course("MPC", "Science", 34), course("BiPC", "Science", 22)],
    highlights: [
      "Verified urban Narayana branch with stable public visibility.",
      "Useful for parents preferring central-west Hyderabad connectivity and brand familiarity.",
      "Counseling should proactively frame fee value and branch-specific consistency.",
    ],
    assets: [["campus", "Jubilee Hills campus"], ["classrooms", "Jubilee Hills classrooms"]],
    contact_name: "Narayana Central Admissions",
    contact_phone: "+9118001023344",
    contact_email: "info@narayanajuniorcolleges.com",
    contact_whatsapp: null,
    photo_source_url: "https://www.narayanajuniorcolleges.com/",
    results_source_url: "https://narayanajuniorcolleges.com/results",
    review_source: "justdial",
    review_url:
      "https://www.justdial.com/Hyderabad/Narayana-Junior-College-Near-Film-Nagar-Club-Jubilee-Hills/040PXX40-XX40-120328103111-L9P3_BZDET/reviews",
  },
  {
    key: "hayathnagar",
    name: "Narayana Junior College - Hayath Nagar",
    code: "NAR-HYNG",
    district: "Ranga Reddy",
    city: "Hyderabad",
    pincode: "501505",
    address: "Beside Bus Depot, Bhagyalatha Colony, Shanthi Nagar, Hayath Nagar, Hyderabad",
    latitude: 17.3272,
    longitude: 78.5995,
    hostel_available: false,
    transport_available: true,
    capacity_total: 560,
    capacity_available: 110,
    priority_rank: 4,
    courses: [course("MPC", "Science", 41), course("BiPC", "Science", 27)],
    highlights: [
      "Relevant feeder-market branch for east Hyderabad and peri-urban parent catchments.",
      "Public reviews point to mentoring value when counselor expectations are set clearly.",
      "Suitable for families comparing city-brand trust with local commute practicality.",
    ],
    assets: [["campus", "Hayath Nagar campus"], ["transport", "Hayath Nagar transport bay"]],
    contact_name: "Narayana Central Admissions",
    contact_phone: "+9118001023344",
    contact_email: "info@narayanajuniorcolleges.com",
    contact_whatsapp: null,
    photo_source_url: "https://www.narayanajuniorcolleges.com/",
    results_source_url: "https://narayanajuniorcolleges.com/results",
    review_source: "justdial",
    review_url:
      "https://www.justdial.com/Hyderabad/Narayana-Junior-College-Beside-Bus-Depot-Bhagyalatha-Colony-Shanthi-Nagar-Hayath-Nagar/040PXX40-XX40-110910134618-W6D7_BZDET/reviews",
  },
  {
    key: "hydernagar",
    name: "Sri Chaitanya Junior College - Hyder Nagar",
    code: "SCJ-HYDN",
    district: "Hyderabad",
    city: "Hyderabad",
    pincode: "500072",
    address: "Behind Chillies Restaurant, Near Kalvary Temple, Balaji Nagar, Hyder Nagar, Kukatpally, Hyderabad",
    latitude: 17.5165,
    longitude: 78.3914,
    hostel_available: true,
    transport_available: true,
    capacity_total: 860,
    capacity_available: 132,
    priority_rank: 2,
    courses: [course("MPC", "Science", 46), course("BiPC", "Science", 33)],
    highlights: [
      "One of the strongest public-review Sri Chaitanya branches in the current set.",
      "Useful for parents who respond strongly to faculty perception and local branch familiarity.",
      "A good high-trust option when Kukatpally belt parents want residential or integrated coaching cues.",
    ],
    assets: [["campus", "Hyder Nagar campus"], ["hostel", "Hyder Nagar hostel block"]],
    contact_name: "Sri Chaitanya Admissions Desk",
    contact_phone: "+919014901936",
    contact_email: "admission@srichaitanyajuniorcollege.com",
    contact_whatsapp: "+919063645199",
    photo_source_url: "https://srichaitanya.net/",
    results_source_url: "https://srichaitanyajuniorcollege.com/results/",
    review_source: "justdial",
    review_url:
      "https://www.justdial.com/Hyderabad/Sri-Chaitanya-Junior-College-Behind-Chillies-Restaurant-Near-Kalvary-Temple-Balaji-Nagar-Hyder-Nagar-kukatpally/040PXX40-XX40-170504143010-W2J8_BZDET/reviews",
  },
  {
    key: "nizampet",
    name: "Sri Chaitanya Junior College - Nizampet",
    code: "SCJ-NZPT",
    district: "Hyderabad",
    city: "Hyderabad",
    pincode: "500090",
    address: "Behind Chillies Restaurant, Nizampet, Hyderabad",
    latitude: 17.5234,
    longitude: 78.3849,
    hostel_available: false,
    transport_available: true,
    capacity_total: 780,
    capacity_available: 128,
    priority_rank: 3,
    courses: [course("MPC", "Science", 44), course("BiPC", "Science", 29)],
    highlights: [
      "Large public review volume gives this branch a strong trust signal for the Nizampet belt.",
      "Useful for parents comparing accessible day-scholar options with a known academic brand.",
      "Counselors should answer pressure and hygiene concerns directly during follow-up.",
    ],
    assets: [["campus", "Nizampet campus"], ["transport", "Nizampet transport bay"]],
    contact_name: "Sri Chaitanya Admissions Desk",
    contact_phone: "+919014901936",
    contact_email: "admission@srichaitanyajuniorcollege.com",
    contact_whatsapp: "+919398391594",
    photo_source_url: "https://srichaitanya.net/",
    results_source_url: "https://srichaitanyajuniorcollege.com/results/",
    review_source: "justdial",
    review_url:
      "https://www.justdial.com/Hyderabad/Sri-Chaitanya-Junior-College-Behind-Chillies-Restaurant-Nizampet/040PXX40-XX40-180308135221-R9T1_BZDET/reviews",
  },
  {
    key: "khammam",
    name: "Dhanik Bharat Junior College - Guntur",
    code: "DB-GNTR",
    district: "Guntur",
    city: "Guntur",
    pincode: "522034",
    address: "Guntur 522034 (exact campus address pending partner verification)",
    latitude: 16.3067,
    longitude: 80.4365,
    hostel_available: true,
    transport_available: false,
    capacity_total: 540,
    capacity_available: 150,
    priority_rank: 3,
    courses: [course("MPC", "Science", 54), course("BiPC", "Science", 31)],
    highlights: [
      "Highest payout partner, but branch-level public proof is still thin.",
      "Official institution sources confirm Guntur city presence and application process clarity.",
      "Use this branch only with counselor explanation until you collect your own photos and testimonials.",
    ],
    assets: [["campus", "Guntur campus"], ["transport", "Guntur admissions support"]],
    contact_name: "Dhanik Bharat Central Admissions",
    contact_phone: "+919555825559",
    contact_email: "care@dhanikbharat.org",
    contact_whatsapp: "+919555825559",
    photo_source_url: "https://dhanikbharat.org/",
    results_source_url: "https://squarefeetproperties.co.in/results-achievements/",
    review_source: "justdial",
    review_url: "https://www.justdial.com/Guntur/DHANIK-BHARAT-JUNIOR-COLLEGE/9999PX863-X863-260209164846-Z5T2_BZDET",
  },
] as const;

const coreBranchProfiles: BranchProfile[] = branchBlueprints.map((branch, branchIndex) => ({
  id: branchIds[branch.key],
  institution_id: institutionIds[branchInstitutionByKey[branch.key]],
  name: branch.name,
  code: branch.code,
  district: branch.district,
  city: branch.city,
  pincode: branch.pincode,
  address: branch.address,
  latitude: branch.latitude,
  longitude: branch.longitude,
  maps_url: `https://maps.google.com/?q=${branch.latitude},${branch.longitude}`,
  hostel_available: branch.hostel_available,
  transport_available: branch.transport_available,
  courses: branch.courses.map((item) => ({ ...item })),
  capacity_total: branch.capacity_total,
  capacity_available: branch.capacity_available,
  priority_rank: branch.priority_rank,
  active: true,
  created_at: timestamp(120 - branchIndex * 2),
  updated_at: timestamp(5 + branchIndex),
  highlights: [...branch.highlights],
  assets: branch.assets.map(([suffix, title], assetIndex) => ({
    id: makeUuid(0x30000000, branchIndex * 2 + assetIndex + 1),
    branch_id: branchIds[branch.key],
    asset_type: "image",
    title,
    file_url: `/branches/${branch.key}-${suffix}.svg`,
    sort_order: assetIndex + 1,
    active: true,
    created_at: timestamp(20 - branchIndex - assetIndex),
  })),
}));

const coreBranches: Branch[] = coreBranchProfiles.map((branch) => {
  const { assets, highlights, ...branchRow } = branch;
  void assets;
  void highlights;
  return branchRow;
});
const coreBranchAssets: BranchAsset[] = coreBranchProfiles.flatMap((branch) => branch.assets);

const coreBranchContacts: BranchContact[] = coreBranchProfiles.map((branch, index) => ({
  id: makeUuid(0x31000000, index + 1),
  branch_id: branch.id,
  institution_id: branch.institution_id,
  contact_name: branchBlueprints[index].contact_name,
  role: "branch_spoc",
  phone: branchBlueprints[index].contact_phone,
  email: branchBlueprints[index].contact_email,
  whatsapp_phone: branchBlueprints[index].contact_whatsapp,
  primary_contact: true,
  active: true,
  created_at: timestamp(20 - index),
  updated_at: timestamp(1),
}));

const branchReviewBlueprints: Record<
  BranchKey,
  { rating: number; review_count: number; positive: string; negative: string; confidence_score: number }
> = {
  kukatpally: {
    rating: 3.9,
    review_count: 1301,
    positive: "Strong public perception around academics, test practice, and results.",
    negative: "Complaints focus on staff tone and maintenance variation.",
    confidence_score: 78,
  },
  dilsukhnagar: {
    rating: 4.0,
    review_count: 553,
    positive: "High local trust, strong academic brand recall, and large public review volume.",
    negative: "Pressure, hygiene, and hostel quality concerns appear in public reviews.",
    confidence_score: 81,
  },
  hanamkonda: {
    rating: 3.7,
    review_count: 74,
    positive: "Well-documented branch with official gallery, results page, and transport proof.",
    negative: "Lower public review volume means counselor explanation still matters.",
    confidence_score: 72,
  },
  karimnagar: {
    rating: 3.8,
    review_count: 654,
    positive: "Known Narayana branch with strong brand visibility and established review volume.",
    negative: "Parents flag fee pressure, facilities, and security concerns in mixed reviews.",
    confidence_score: 76,
  },
  jubileehills: {
    rating: 3.8,
    review_count: 242,
    positive: "Some parents praise faculty quality and the branch's established city presence.",
    negative: "Mixed feedback on pricing and branch consistency needs counselor framing.",
    confidence_score: 70,
  },
  hayathnagar: {
    rating: 3.7,
    review_count: 294,
    positive: "Public reviews mention mentoring support and practical local access.",
    negative: "Facilities and administration concerns appear often enough to address upfront.",
    confidence_score: 68,
  },
  hydernagar: {
    rating: 4.1,
    review_count: 521,
    positive: "One of the strongest faculty and academic perception signals in the current branch set.",
    negative: "Some fee pressure and student-pressure concerns need transparent handling.",
    confidence_score: 83,
  },
  nizampet: {
    rating: 3.9,
    review_count: 662,
    positive: "Strong review volume and local parent familiarity make this branch easier to trust quickly.",
    negative: "Complaints cluster around pressure and hygiene, so visit guidance matters.",
    confidence_score: 79,
  },
  khammam: {
    rating: 0,
    review_count: 0,
    positive: "Institution-level facilities and application-form clarity are usable trust points.",
    negative: "Branch-level public reviews are too thin and need your own testimonials.",
    confidence_score: 38,
  },
};

const coreBranchReviews: BranchReview[] = coreBranchProfiles.map((branch, index) => {
  const review = branchReviewBlueprints[branchBlueprints[index].key];
  const blueprint = branchBlueprints[index];

  return {
    id: makeUuid(0x32000000, index + 1),
    branch_id: branch.id,
    source: blueprint.review_source,
    source_url: blueprint.review_url,
    rating: review.rating > 0 ? review.rating : null,
    review_count: review.review_count,
    review_summary_positive: review.positive,
    review_summary_negative: review.negative,
    confidence_score: review.confidence_score,
    last_checked_at: timestamp(0, index + 8),
    created_at: timestamp(10 - index),
    updated_at: timestamp(0, index + 8),
  };
});

const coreBranchTrustAssets: BranchTrustAsset[] = coreBranchProfiles.flatMap((branch, index) => {
  const blueprint = branchBlueprints[index];

  return [
    {
      id: makeUuid(0x33000000, index * 2 + 1),
      branch_id: branch.id,
      asset_type: "campus_photo",
      title: `${branch.name} campus proof`,
      file_url: branch.assets[0]?.file_url ?? `/branches/${branch.code.toLowerCase()}-campus.svg`,
      source_url: blueprint.photo_source_url,
      source_type: "official_website",
      publishable: true,
      verified: true,
      sort_order: 1,
      created_at: timestamp(10 - index),
      updated_at: timestamp(1),
    },
    {
      id: makeUuid(0x33000000, index * 2 + 2),
      branch_id: branch.id,
      asset_type: branch.hostel_available ? "hostel_photo" : "results_proof",
      title: branch.hostel_available ? `${branch.name} hostel proof` : `${branch.name} results proof`,
      file_url: branch.assets[1]?.file_url ?? `/branches/${branch.code.toLowerCase()}-trust.svg`,
      source_url: blueprint.results_source_url,
      source_type: "official_website",
      publishable: true,
      verified: true,
      sort_order: 2,
      created_at: timestamp(9 - index),
      updated_at: timestamp(1),
    },
  ];
});

const coreBranchFeeSnapshots: BranchFeeSnapshot[] = coreBranchProfiles.flatMap((branch, index) =>
  branch.courses.slice(0, 2).map((courseItem, courseIndex) => ({
    id: makeUuid(0x34000000, index * 2 + courseIndex + 1),
    branch_id: branch.id,
    academic_year: 2026,
    course_code: courseItem.code,
    tuition_fee:
      branch.institution_id === institutionIds.dhanikbharat
        ? 145000
        : branch.institution_id === institutionIds.srichaitanya
          ? 122000 + index * 3000
          : 126000 + index * 3000,
    hostel_fee: branch.hostel_available ? 70000 + index * 2500 : null,
    transport_fee: branch.transport_available ? 20000 + index * 1000 : null,
    application_fee: branch.institution_id === institutionIds.dhanikbharat ? 500 : 500,
    seat_lock_amount: 1000,
    other_fee_notes:
      branch.institution_id === institutionIds.dhanikbharat
        ? "Application fee and registration amount are based on the public Dhanik Bharat form. Final branch fee sheet still needs partner confirmation."
        : "Indicative branch snapshot based on public trust research and current consultancy assumptions.",
    currency: "INR",
    effective_from: "2026-03-01",
    effective_to: null,
    created_at: timestamp(8 - index),
    updated_at: timestamp(1),
  })),
);

const coreSeatInventorySnapshots: SeatInventorySnapshot[] = coreBranchProfiles.flatMap((branch, index) =>
  branch.courses.map((courseItem, courseIndex) => ({
    id: makeUuid(0x35000000, index * 4 + courseIndex + 1),
    branch_id: branch.id,
    course_code: courseItem.code,
    capacity_total: Math.max(courseItem.seats_available + 30, courseItem.seats_available),
    capacity_available: courseItem.seats_available,
    captured_at: timestamp(0, courseIndex + 7),
    source_note: "Branch ops sync",
    created_at: timestamp(0, courseIndex + 7),
  })),
);

export const branchProfiles: BranchProfile[] = mergeById(coreBranchProfiles, narayanaHyderabadBranchProfiles);
export const branches: Branch[] = mergeById(coreBranches, narayanaHyderabadBranches);
export const branchAssets: BranchAsset[] = mergeById(coreBranchAssets);
export const branchContacts: BranchContact[] = mergeById(coreBranchContacts, narayanaHyderabadBranchContacts);
export const branchReviews: BranchReview[] = mergeById(coreBranchReviews, narayanaHyderabadBranchReviews);
export const branchTrustAssets: BranchTrustAsset[] = mergeById(coreBranchTrustAssets, narayanaHyderabadBranchTrustAssets);
export const branchFeeSnapshots: BranchFeeSnapshot[] = mergeById(coreBranchFeeSnapshots, narayanaHyderabadBranchFeeSnapshots);
export const seatInventorySnapshots: SeatInventorySnapshot[] = mergeById(
  coreSeatInventorySnapshots,
  narayanaHyderabadSeatInventorySnapshots,
);

export const commissionRules: CommissionRule[] = [
  {
    id: makeUuid(0x36000000, 1),
    institution_id: institutionIds.narayana,
    branch_id: null,
    course_code: null,
    payout_amount: 5000,
    currency: "INR",
    trigger: "admission_confirmed",
    payout_days: 15,
    refund_clawback: true,
    active: true,
    notes: "Volume partner baseline rule.",
    created_at: timestamp(12),
    updated_at: timestamp(2),
  },
  {
    id: makeUuid(0x36000000, 2),
    institution_id: institutionIds.srichaitanya,
    branch_id: null,
    course_code: null,
    payout_amount: 5000,
    currency: "INR",
    trigger: "admission_confirmed",
    payout_days: 15,
    refund_clawback: true,
    active: true,
    notes: "Volume partner baseline rule.",
    created_at: timestamp(12),
    updated_at: timestamp(2),
  },
  {
    id: makeUuid(0x36000000, 3),
    institution_id: institutionIds.dhanikbharat,
    branch_id: null,
    course_code: null,
    payout_amount: 15000,
    currency: "INR",
    trigger: "admission_confirmed",
    payout_days: 21,
    refund_clawback: true,
    active: true,
    notes: "High-margin partner baseline rule.",
    created_at: timestamp(12),
    updated_at: timestamp(2),
  },
];

export const campaigns: Campaign[] = [
  { id: makeUuid(0x40000000, 1), name: "March Pilot Batch A", source_batch: "pilot-2026-03-a", template_name: "admission_intro_v1", target_count: 5000, sent_count: 3400, reply_count: 620, qualified_count: 275, payment_count: 40, admission_count: 28, status: "running", created_at: timestamp(8), updated_at: timestamp(1) },
  { id: makeUuid(0x40000000, 2), name: "Warm Lead Recovery", source_batch: "pilot-2026-03-recovery", template_name: "payment_recovery_v1", target_count: 1800, sent_count: 950, reply_count: 210, qualified_count: 98, payment_count: 12, admission_count: 7, status: "scheduled", created_at: timestamp(5), updated_at: timestamp(2) },
];

const leadBlueprints = [
  ["Saanvi Reddy", "Kiran Reddy", "919101000001", "919201000001", "Hyderabad", "Hyderabad", "500072", "te", "MPC", false, 9.2, "imported", "new", "awaiting_student_name", undefined, "kukatpally", "pilot-2026-03-a", 0],
  ["Harsha Vardhan", "Sujatha Vardhan", "919101000002", "919201000002", "Hyderabad", "Hyderabad", "500060", "te", "BiPC", true, 8.8, "contacted", "new", "awaiting_student_name", undefined, "dilsukhnagar", "pilot-2026-03-a", 10],
  ["Aadhya Naik", "Praveen Naik", "919101000003", "919201000003", "Hanamkonda", "Hanamkonda", "506001", "en", "MPC", false, 9.0, "replied", "warm", "awaiting_district", undefined, "hanamkonda", "pilot-2026-03-a", 20],
  ["Nihal Sharma", "Ritika Sharma", "919101000004", "919201000004", "Karimnagar", "Karimnagar", "505001", "en", "BiPC", true, 9.4, "qualified", "warm", "branch_recommendation_sent", "counselor", "karimnagar", "pilot-2026-03-a", 35],
  ["Moksha Jain", "Sandeep Jain", "919101000005", "919201000005", "Hyderabad", "Hyderabad", "500072", "hi", "MEC", false, 8.5, "branch_shown", "warm", "awaiting_branch_action", "counselor", "kukatpally", "pilot-2026-03-a", 45],
  ["Aryan Kumar", "Lavanya Kumar", "919101000006", "919201000006", "Khammam", "Khammam", "507001", "te", "MPC", false, 8.7, "branch_viewed", "hot", "awaiting_branch_action", "counselor", "khammam", "pilot-2026-03-a", 60],
  ["Tanishq Patel", "Nirmala Patel", "919101000007", "919201000007", "Hyderabad", "Hyderabad", "500060", "te", "BiPC", true, 9.1, "callback_requested", "hot", "awaiting_branch_action", "counselor", "dilsukhnagar", "pilot-2026-03-a", 80],
  ["Bhavya K", "Madhavi K", "919101000008", "919201000008", "Hanamkonda", "Hanamkonda", "506001", "te", "CEC", false, 8.2, "visit_requested", "hot", "awaiting_visit_slot", "operations", "hanamkonda", "pilot-2026-03-a", 85],
  ["Ishita R", "Venkatesh R", "919101000009", "919201000009", "Karimnagar", "Karimnagar", "505001", "en", "MPC", true, 9.3, "form_started", "hot", "awaiting_form_completion", "counselor", "karimnagar", "pilot-2026-03-a", 75],
  ["Pranav Sai", "Deepa Sai", "919101000010", "919201000010", "Hyderabad", "Hyderabad", "500072", "te", "MPC", false, 9.0, "form_submitted", "hot", "awaiting_payment", "counselor", "kukatpally", "pilot-2026-03-a", 92],
  ["Keerthana M", "Srinivas M", "919101000011", "919201000011", "Hyderabad", "Hyderabad", "500060", "te", "BiPC", true, 9.5, "payment_pending", "followup", "awaiting_payment", "operations", "dilsukhnagar", "pilot-2026-03-recovery", 108],
  ["Rohit Yadav", "Meena Yadav", "919101000012", "919201000012", "Khammam", "Khammam", "507001", "te", "MEC", false, 8.6, "seat_locked", "won", null, "operations", "khammam", "pilot-2026-03-recovery", 140],
  ["Zoya Ahmed", "Sameer Ahmed", "919101000013", "919201000013", "Hanamkonda", "Warangal", "506002", "en", "BiPC", true, 9.6, "admission_in_progress", "won", null, "operations", "hanamkonda", "pilot-2026-03-recovery", 155],
  ["Poojitha Ch", "Rajesh Ch", "919101000014", "919201000014", "Hyderabad", "Hyderabad", "500072", "te", "MPC", false, 9.7, "admission_confirmed", "won", null, "admin", "kukatpally", "pilot-2026-03-recovery", 180],
  ["Manasvi N", "Prakash N", "919101000015", "919201000015", "Nalgonda", "Miryalaguda", "508207", "te", "MPC", false, 7.8, "lost", "lost", null, "counselor", "kukatpally", "pilot-2026-03-recovery", 12],
  ["Advik R", "Swapna R", "919101000016", "919201000016", "Karimnagar", "Jagtial", "505327", "te", "MEC", true, 8.9, "branch_viewed", "hot", "awaiting_branch_action", "counselor", "karimnagar", "pilot-2026-03-recovery", 58],
  ["Diya P", "Harish P", "919101000017", "919201000017", "Hyderabad", "Hyderabad", "500039", "en", null, false, 8.1, "replied", "warm", "awaiting_course", undefined, "kukatpally", "pilot-2026-03-recovery", 20],
  ["Navya G", "Ramesh G", "919101000018", "919201000018", "Khammam", "Kothagudem", "507101", "te", "MPC", true, 8.4, "callback_requested", "followup", "awaiting_branch_action", "operations", "khammam", "pilot-2026-03-recovery", 70],
  ["Rahul Teja", "Bhanu Teja", "919101000019", "919201000019", "Hanamkonda", "Kazipet", "506003", "te", "MPC", false, 8.8, "payment_pending", "followup", "awaiting_payment", "operations", "hanamkonda", "pilot-2026-03-recovery", 96],
  ["Aarohi S", "Manjula S", "919101000020", "919999", null, null, null, "te", null, false, null, "imported", "invalid", "awaiting_student_name", undefined, undefined, "pilot-2026-03-a", -100],
] as const;

export const leads: Lead[] = leadBlueprints.map(
  ([student_name, parent_name, student_phone, parent_phone, district, city, pincode, preferred_language, course_interest, hostel_required, marks_10th, stage, status, bot_state, owner, preferred_branch, utm_campaign, lead_score], index) => {
    const needsHumanContact = ["callback_requested", "visit_requested", "payment_pending", "seat_locked", "admission_in_progress", "admission_confirmed"].includes(stage);
    const seatLockPaid = ["seat_locked", "admission_in_progress", "admission_confirmed"].includes(stage);
    const paymentPending = ["payment_pending", "form_submitted"].includes(stage);
    const branchId = preferred_branch ? branchIds[preferred_branch as BranchKey] : null;

    return {
      id: makeUuid(0x50000000, index + 1),
      source_lead_id: `pilot-lead-${String(index + 1).padStart(3, "0")}`,
      student_name,
      parent_name,
      student_phone: `+${student_phone}`,
      parent_phone: parent_phone ? `+${parent_phone}` : null,
      district,
      city,
      pincode,
      preferred_language,
      course_interest,
      hostel_required,
      marks_10th,
      joining_year: 2026,
      minor_flag: true,
      assigned_branch_id: branchId,
      preferred_branch_id: branchId,
      lead_score,
      bot_state,
      stage,
      status,
      last_incoming_at: hasReachedStage(stage, "replied") ? timestamp(10 - (index % 7), 3) : null,
      last_outgoing_at: timestamp(12 - (index % 6), 2),
      last_human_contact_at: needsHumanContact ? timestamp(6 - (index % 4), 5) : null,
      seat_lock_paid: seatLockPaid,
      seat_lock_amount: paymentPending || seatLockPaid ? seatLockAmount : null,
      payment_status: seatLockPaid ? "paid" : paymentPending ? "pending" : null,
      admission_status:
        stage === "admission_confirmed"
          ? "confirmed"
          : stage === "admission_in_progress"
            ? "in_progress"
            : stage === "lost"
              ? "lost"
              : hasReachedStage(stage, "qualified")
                ? "screening"
                : null,
      owner_user_id: owner ? userIds[owner as UserKey] : null,
      utm_source: stage === "admission_confirmed" ? "referral" : "csv_pilot",
      utm_campaign,
      created_at: timestamp(14 - (index % 8)),
      updated_at: timestamp(2 + (index % 4)),
    };
  },
);

const leadLookup = new Map(leads.map((lead) => [lead.id, lead]));

export const conversations: Conversation[] = leads.flatMap((lead, index) => {
  const rows: Conversation[] = [
    {
      id: makeUuid(0x60000000, index * 2 + 1),
      lead_id: lead.id,
      channel: "whatsapp",
      direction: "outbound",
      message_type: "template",
      provider_message_id: `wamid.out.${index + 1}`,
      message_body: `Hi ${lead.parent_name ?? "Parent"}, this is the admissions desk. Reply to check the best branch for ${lead.student_name ?? "your child"}.`,
      media_url: null,
      template_name: "admission_intro_v1",
      delivery_status: hasReachedStage(lead.stage, "contacted") ? "delivered" : "queued",
      created_at: lead.last_outgoing_at ?? lead.created_at,
    },
  ];

  if (hasReachedStage(lead.stage, "replied")) {
    rows.push({
      id: makeUuid(0x60000000, index * 2 + 2),
      lead_id: lead.id,
      channel: "whatsapp",
      direction: "inbound",
      message_type: "text",
      provider_message_id: `wamid.in.${index + 1}`,
      message_body:
        lead.stage === "callback_requested"
          ? "Please ask the counselor to call me this evening."
          : lead.stage === "visit_requested"
            ? "We want to visit the campus on Sunday."
            : ["payment_pending", "form_submitted"].includes(lead.stage)
              ? "We have completed the form. Please share the payment link."
              : "We are interested. Please share the best branch details.",
      media_url: null,
      template_name: null,
      delivery_status: "received",
      created_at: lead.last_incoming_at ?? lead.updated_at,
    });
  }

  return rows;
});

export const leadEvents: LeadEvent[] = leads.flatMap((lead, index) => {
  const events: LeadEvent[] = [
    { id: makeUuid(0x70000000, index * 10 + 1), lead_id: lead.id, event_type: "lead_imported", event_source: "import", payload: { source_lead_id: lead.source_lead_id, utm_campaign: lead.utm_campaign }, created_at: lead.created_at },
  ];
  if (hasReachedStage(lead.stage, "contacted")) events.push({ id: makeUuid(0x70000000, index * 10 + 2), lead_id: lead.id, event_type: "campaign_sent", event_source: "campaign", payload: { template_name: "admission_intro_v1" }, created_at: lead.last_outgoing_at ?? lead.updated_at });
  if (hasReachedStage(lead.stage, "replied")) events.push({ id: makeUuid(0x70000000, index * 10 + 3), lead_id: lead.id, event_type: "parent_replied", event_source: "whatsapp", payload: { bot_state: lead.bot_state }, created_at: lead.last_incoming_at ?? lead.updated_at });
  if (hasReachedStage(lead.stage, "qualified")) events.push({ id: makeUuid(0x70000000, index * 10 + 4), lead_id: lead.id, event_type: "lead_qualified", event_source: "bot", payload: { district: lead.district, course_interest: lead.course_interest, hostel_required: lead.hostel_required }, created_at: timestamp(4 + (index % 3), 6) });
  if (hasReachedStage(lead.stage, "branch_viewed")) events.push({ id: makeUuid(0x70000000, index * 10 + 5), lead_id: lead.id, event_type: "branch_viewed", event_source: "public_page", payload: { branch_id: lead.assigned_branch_id ?? lead.preferred_branch_id }, created_at: timestamp(3 + (index % 3), 8) });
  if (lead.stage === "callback_requested") events.push({ id: makeUuid(0x70000000, index * 10 + 6), lead_id: lead.id, event_type: "callback_requested", event_source: "parent_action", payload: { priority: "high" }, created_at: timestamp(2 + (index % 2), 9) });
  if (lead.stage === "visit_requested") events.push({ id: makeUuid(0x70000000, index * 10 + 7), lead_id: lead.id, event_type: "visit_requested", event_source: "parent_action", payload: { preferred_slot: "Sunday 11:00 AM" }, created_at: timestamp(2 + (index % 2), 10) });
  if (hasReachedStage(lead.stage, "form_started")) events.push({ id: makeUuid(0x70000000, index * 10 + 8), lead_id: lead.id, event_type: "form_progressed", event_source: "admission_form", payload: { stage: lead.stage }, created_at: timestamp(1 + (index % 2), 11) });
  if (hasReachedStage(lead.stage, "payment_pending")) events.push({ id: makeUuid(0x70000000, index * 10 + 9), lead_id: lead.id, event_type: "payment_link_created", event_source: "payment", payload: { amount: seatLockAmount }, created_at: timestamp(1, 12) });
  if (lead.seat_lock_paid) events.push({ id: makeUuid(0x70000000, index * 10 + 10), lead_id: lead.id, event_type: "seat_lock_paid", event_source: "payment", payload: { amount: seatLockAmount }, created_at: timestamp(0, 13) });
  return events;
});

export const admissionForms: AdmissionForm[] = leads
  .filter((lead) => hasReachedStage(lead.stage, "form_started"))
  .slice(0, 6)
  .map((lead, index) => ({
    id: makeUuid(0xa0000000, index + 1),
    lead_id: lead.id,
    branch_id: lead.assigned_branch_id ?? branchIds.kukatpally,
    student_name: lead.student_name ?? "Student",
    father_name: lead.parent_name ? `${lead.parent_name.split(" ")[0]} ${lead.parent_name.split(" ").slice(-1)[0]}` : null,
    mother_name: lead.parent_name ? `${lead.parent_name.split(" ")[0]} Family` : null,
    parent_phone: lead.parent_phone ?? "+919999999999",
    student_phone: lead.student_phone,
    address: `${lead.city ?? "City"}, ${lead.district ?? "District"}`,
    district: lead.district ?? "Unknown",
    course_selected: lead.course_interest ?? "MPC",
    hostel_required: lead.hostel_required,
    marks_10th: lead.marks_10th,
    documents: [{ label: "10th memo", status: "received" }, { label: "Aadhaar copy", status: index % 2 === 0 ? "received" : "pending" }, { label: "Transfer certificate", status: "pending" }],
    submission_status: lead.stage === "form_started" ? "draft" : lead.stage === "admission_confirmed" ? "approved" : lead.stage === "admission_in_progress" ? "under_review" : "submitted",
    created_at: timestamp(3, 12),
    updated_at: timestamp(1, 14),
  }));

export const payments: Payment[] = leads
  .filter((lead) => lead.payment_status || lead.seat_lock_paid)
  .map((lead, index) => ({
    id: makeUuid(0x90000000, index + 1),
    lead_id: lead.id,
    branch_id: lead.assigned_branch_id ?? branchIds.kukatpally,
    gateway: "razorpay",
    gateway_order_id: `order_${index + 1001}`,
    gateway_payment_id: lead.seat_lock_paid ? `pay_${index + 9001}` : null,
    gateway_link_id: `plink_${index + 7001}`,
    amount: lead.seat_lock_amount ?? seatLockAmount,
    currency: "INR",
    purpose: "seat_lock",
    status: lead.seat_lock_paid ? "paid" : lead.payment_status ?? "created",
    webhook_payload: { mock: true, stage: lead.stage },
    paid_at: lead.seat_lock_paid ? timestamp(0, 14) : null,
    created_at: timestamp(2, 12),
    updated_at: timestamp(0, 14),
  }));

export const leadOptIns: LeadOptIn[] = leads.map((lead, index) => ({
  id: makeUuid(0x37000000, index + 1),
  lead_id: lead.id,
  channel: "whatsapp",
  status: lead.status === "invalid" ? "unknown" : "opted_in",
  captured_from: "csv_import",
  captured_at: lead.created_at,
  expires_at: null,
  payload: {
    source_batch: lead.utm_campaign,
  },
  created_at: lead.created_at,
  updated_at: lead.updated_at,
}));

export const tasks: Task[] = [
  { id: makeUuid(0x80000000, 1), lead_id: leads[6].id, branch_id: leads[6].assigned_branch_id, assigned_to: userIds.counselor, task_type: "callback", priority: "urgent", due_at: timestamp(0, 9), status: "open", notes: "Call after 6 PM when parent is back from work.", created_at: timestamp(1, 10), updated_at: timestamp(0, 8) },
  { id: makeUuid(0x80000000, 2), lead_id: leads[7].id, branch_id: leads[7].assigned_branch_id, assigned_to: userIds.operations, task_type: "visit", priority: "high", due_at: timestamp(1, 11), status: "in_progress", notes: "Coordinate Sunday campus tour and send checklist.", created_at: timestamp(1, 9), updated_at: timestamp(0, 8) },
  { id: makeUuid(0x80000000, 3), lead_id: leads[10].id, branch_id: leads[10].assigned_branch_id, assigned_to: userIds.operations, task_type: "payment_followup", priority: "high", due_at: timestamp(0, 16), status: "open", notes: "Seat lock link sent. Remind before 8 PM.", created_at: timestamp(1, 13), updated_at: timestamp(0, 9) },
  { id: makeUuid(0x80000000, 4), lead_id: leads[12].id, branch_id: leads[12].assigned_branch_id, assigned_to: userIds.operations, task_type: "document_followup", priority: "medium", due_at: timestamp(1, 14), status: "open", notes: "Collect hostel consent and original certificates.", created_at: timestamp(2, 12), updated_at: timestamp(1, 8) },
  { id: makeUuid(0x80000000, 5), lead_id: leads[17].id, branch_id: leads[17].assigned_branch_id, assigned_to: userIds.counselor, task_type: "callback", priority: "high", due_at: timestamp(0, 15), status: "open", notes: "Parent wants clarity on hostel safety before decision.", created_at: timestamp(1, 8), updated_at: timestamp(0, 7) },
  { id: makeUuid(0x80000000, 6), lead_id: leads[18].id, branch_id: leads[18].assigned_branch_id, assigned_to: userIds.operations, task_type: "payment_followup", priority: "urgent", due_at: timestamp(0, 17), status: "open", notes: "Parent asked for a fresh payment link before midnight.", created_at: timestamp(1, 11), updated_at: timestamp(0, 9) },
];

export const admissionAttributions: AdmissionAttribution[] = leads
  .filter((lead) => lead.assigned_branch_id)
  .slice(0, 12)
  .map((lead, index) => {
    const branch = branches.find((row) => row.id === lead.assigned_branch_id);
    const joined = ["seat_locked", "admission_in_progress", "admission_confirmed"].includes(lead.stage);
    const confirmed = ["admission_in_progress", "admission_confirmed"].includes(lead.stage);

    return {
      id: makeUuid(0x38000000, index + 1),
      lead_id: lead.id,
      institution_id: branch?.institution_id ?? institutionIds.narayana,
      branch_id: lead.assigned_branch_id,
      source_campaign_id: campaigns.find((campaign) => campaign.source_batch === lead.utm_campaign)?.id ?? null,
      source_channel: "whatsapp",
      attribution_code: `ATTR-${String(index + 1).padStart(4, "0")}`,
      referred_by_name: "Admissions Desk",
      referral_phone: "+919900000001",
      status: confirmed
        ? "commission_eligible"
        : joined
          ? "admission_confirmed"
          : lead.stage === "form_submitted"
            ? "form_submitted"
            : lead.stage === "branch_shown" || lead.stage === "branch_viewed"
              ? "branch_selected"
              : "referred",
      joined_at: joined ? timestamp(0, 12) : null,
      confirmed_at: confirmed ? timestamp(0, 13) : null,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
    };
  });

export const payoutLedger: PayoutLedger[] = admissionAttributions
  .filter((attribution) => ["admission_confirmed", "commission_eligible"].includes(attribution.status))
  .map((attribution, index) => {
    const commissionRule =
      commissionRules.find((rule) => rule.institution_id === attribution.institution_id && rule.branch_id === attribution.branch_id) ??
      commissionRules.find((rule) => rule.institution_id === attribution.institution_id) ??
      commissionRules[0];
    const paid = index === 0;

    return {
      id: makeUuid(0x39000000, index + 1),
      attribution_id: attribution.id,
      institution_id: attribution.institution_id,
      branch_id: attribution.branch_id,
      commission_rule_id: commissionRule.id,
      gross_amount: commissionRule.payout_amount,
      net_amount: commissionRule.payout_amount,
      currency: commissionRule.currency,
      status: paid ? "paid" : "pending",
      due_at: timestamp(-7 + index, 9),
      paid_at: paid ? timestamp(-1, 16) : null,
      external_reference: paid ? `PAYOUT-${String(index + 1).padStart(4, "0")}` : null,
      notes: paid ? "Settled by partner MIS" : "Awaiting partner settlement cycle.",
      created_at: attribution.created_at,
      updated_at: paid ? timestamp(-1, 16) : attribution.updated_at,
    };
  });

export const seedData = {
  users,
  institutions,
  branches,
  branch_contacts: branchContacts,
  branch_assets: branchAssets,
  branch_trust_assets: branchTrustAssets,
  branch_reviews: branchReviews,
  branch_fee_snapshots: branchFeeSnapshots,
  seat_inventory_snapshots: seatInventorySnapshots,
  campaigns,
  commission_rules: commissionRules,
  leads,
  lead_opt_ins: leadOptIns,
  admission_attributions: admissionAttributions,
  conversations,
  admission_forms: admissionForms,
  payments,
  payout_ledger: payoutLedger,
  tasks,
  lead_events: leadEvents,
};

export function getLeadById(leadId: string) {
  return leadLookup.get(leadId) ?? null;
}
