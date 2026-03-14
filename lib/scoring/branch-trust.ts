import type {
  Branch,
  BranchContact,
  BranchFeeSnapshot,
  BranchReview,
  BranchTrustAsset,
  BranchTrustBand,
  BranchTrustFactor,
  BranchTrustSummary,
} from "@/types/domain";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getBranchTrustBand(score: number): BranchTrustBand {
  if (score >= 85) return "excellent";
  if (score >= 70) return "strong";
  if (score >= 55) return "usable";
  if (score >= 40) return "weak";
  return "blocked";
}

function getInstitutionBrandScore(institutionName: string | null | undefined) {
  const normalized = institutionName?.toLowerCase() ?? "";

  if (normalized.includes("narayana")) return 15;
  if (normalized.includes("sri chaitanya")) return 14;
  if (normalized.includes("dhanik bharat")) return 7;

  return 8;
}

function selectPrimaryReview(reviews: BranchReview[]) {
  return [...reviews].sort((left, right) => {
    const rightConfidence = right.confidence_score ?? 0;
    const leftConfidence = left.confidence_score ?? 0;
    if (rightConfidence !== leftConfidence) {
      return rightConfidence - leftConfidence;
    }

    return (right.review_count ?? 0) - (left.review_count ?? 0);
  })[0] ?? null;
}

function buildFactor(key: string, label: string, points: number, applied: boolean, maxPoints: number): BranchTrustFactor {
  return {
    key,
    label,
    points: applied ? points : 0,
    applied,
    max_points: maxPoints,
  };
}

export function getBranchTrustSummary(args: {
  branch: Pick<Branch, "address" | "maps_url" | "courses" | "hostel_available" | "transport_available">;
  institutionName?: string | null;
  reviews?: BranchReview[];
  trustAssets?: BranchTrustAsset[];
  feeSnapshot?: BranchFeeSnapshot | null;
  contacts?: BranchContact[];
  hasSeatInventory?: boolean;
  hasOwnTestimonial?: boolean;
}): BranchTrustSummary {
  const reviews = args.reviews ?? [];
  const trustAssets = args.trustAssets ?? [];
  const contacts = args.contacts ?? [];
  const primaryReview = selectPrimaryReview(reviews);
  const rating = primaryReview?.rating ?? null;
  const reviewCount = primaryReview?.review_count ?? 0;

  const ratingFactor = rating ? clamp(rating, 0, 5) / 5 : 0;
  const volumeFactor = clamp(Math.log10(reviewCount + 1) / 3, 0, 1);
  const reviewScore = Math.round(30 * ratingFactor * (0.6 + 0.4 * volumeFactor));

  const hasPublishablePhotos = trustAssets.some(
    (asset) =>
      asset.publishable &&
      asset.verified &&
      ["campus_photo", "hostel_photo", "transport_photo"].includes(asset.asset_type),
  );
  const hasResultsProof = trustAssets.some((asset) => asset.publishable && asset.verified && asset.asset_type === "results_proof");
  const hasAddress = Boolean(args.branch.address);
  const hasMaps = Boolean(args.branch.maps_url);
  const hasCourses = args.branch.courses.length > 0;
  const hasContact = contacts.some((contact) => contact.active);

  const evidenceFactors = [
    buildFactor("official_branch_photos", "Official branch photos", 8, hasPublishablePhotos, 8),
    buildFactor("published_address", "Published address", 4, hasAddress, 4),
    buildFactor("maps_link", "Maps link", 3, hasMaps, 3),
    buildFactor("course_list", "Course list", 3, hasCourses, 3),
    buildFactor("results_proof", "Results / toppers proof", 4, hasResultsProof, 4),
    buildFactor("branch_contact", "Branch contact published", 3, hasContact, 3),
  ];

  const hasFeeSummary = Boolean(
    args.feeSnapshot && (args.feeSnapshot.tuition_fee || args.feeSnapshot.hostel_fee || args.feeSnapshot.transport_fee),
  );
  const hasSeatLock = Boolean(args.feeSnapshot?.seat_lock_amount);

  const transparencyFactors = [
    buildFactor("hostel_info", "Hostel info available", 4, true, 4),
    buildFactor("transport_info", "Transport info available", 3, true, 3),
    buildFactor("fee_summary", "Fee summary available", 5, hasFeeSummary, 5),
    buildFactor("seat_lock_clarity", "Seat-lock amount available", 4, hasSeatLock, 4),
    buildFactor("documents_published", "Documents / process published", 4, hasResultsProof || hasContact, 4),
  ];

  const operationsFactors = [
    buildFactor("branch_spoc", "Branch SPOC verified", 2, hasContact, 2),
    buildFactor("seat_inventory", "Recent seat inventory sync", 2, Boolean(args.hasSeatInventory), 2),
    buildFactor("fee_snapshot", "Current fee snapshot", 2, Boolean(args.feeSnapshot), 2),
    buildFactor("review_snapshot", "Review snapshot available", 2, Boolean(primaryReview), 2),
    buildFactor("own_testimonial", "Own testimonial collected", 2, Boolean(args.hasOwnTestimonial), 2),
  ];

  const evidenceScore = evidenceFactors.reduce((total, factor) => total + factor.points, 0);
  const transparencyScore = transparencyFactors.reduce((total, factor) => total + factor.points, 0);
  const operationsScore = operationsFactors.reduce((total, factor) => total + factor.points, 0);
  const brandScore = getInstitutionBrandScore(args.institutionName);
  const score = clamp(reviewScore + evidenceScore + transparencyScore + brandScore + operationsScore, 0, 100);

  return {
    score,
    band: getBranchTrustBand(score),
    review_rating: rating,
    review_count: reviewCount,
    factors: [
      ...evidenceFactors,
      ...transparencyFactors,
      buildFactor("brand_strength", "Institution brand strength", brandScore, true, 15),
      ...operationsFactors,
      buildFactor("public_reviews", "Public review signal", reviewScore, Boolean(primaryReview), 30),
    ],
  };
}
