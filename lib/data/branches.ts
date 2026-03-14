import "server-only";

import {
  branchAssets,
  branchContacts,
  branchFeeSnapshots,
  branchProfiles,
  branchReviews,
  branchTrustAssets,
  institutions,
  seatInventorySnapshots,
} from "@/lib/fixtures/demo-data";
import { getBranchTrustSummary } from "@/lib/scoring/branch-trust";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type {
  Branch,
  BranchAsset,
  BranchContact,
  BranchFeeSnapshot,
  BranchProfile,
  BranchReview,
  BranchTrustAsset,
  Institution,
  SeatInventorySnapshot,
} from "@/types/domain";

const highlightLookup = new Map(branchProfiles.map((branch) => [branch.code.toLowerCase(), branch.highlights]));

function buildFallbackHighlights(branch: Branch, trustScore?: number | null) {
  const highlights = [
    branch.capacity_total > 0 || branch.capacity_available > 0
      ? `${branch.capacity_available} seats available for the current intake.`
      : "Seat availability is pending branch verification.",
    branch.transport_available
      ? "Transport coverage available across the feeder market."
      : "Focused on local walk-in and self-commute admissions.",
  ];

  if (branch.hostel_available) {
    highlights.push("Hostel support is available for outstation students.");
  }

  if (typeof trustScore === "number") {
    highlights.push(`Current trust score: ${trustScore}/100.`);
  }

  return highlights;
}

function groupRowsByBranchId<T extends { branch_id: string }>(rows: T[]) {
  const grouped = new Map<string, T[]>();

  rows.forEach((row) => {
    const current = grouped.get(row.branch_id) ?? [];
    current.push(row);
    grouped.set(row.branch_id, current);
  });

  return grouped;
}

function getLatestFeeSnapshot(rows: BranchFeeSnapshot[]) {
  return [...rows].sort((left, right) => {
    const rightDate = right.effective_from ?? right.created_at;
    const leftDate = left.effective_from ?? left.created_at;
    return rightDate.localeCompare(leftDate);
  })[0] ?? null;
}

function getLatestSeatSnapshot(rows: SeatInventorySnapshot[]) {
  return [...rows].sort((left, right) => right.captured_at.localeCompare(left.captured_at))[0] ?? null;
}

function getPrimaryReview(rows: BranchReview[]) {
  return [...rows].sort((left, right) => {
    const rightConfidence = right.confidence_score ?? 0;
    const leftConfidence = left.confidence_score ?? 0;
    if (rightConfidence !== leftConfidence) {
      return rightConfidence - leftConfidence;
    }

    return right.review_count - left.review_count;
  })[0] ?? null;
}

function hydrateBranch(args: {
  branch: Branch;
  assets: BranchAsset[];
  institution: Institution | null;
  contacts: BranchContact[];
  trustAssets: BranchTrustAsset[];
  reviews: BranchReview[];
  feeSnapshots: BranchFeeSnapshot[];
  seatSnapshots: SeatInventorySnapshot[];
}): BranchProfile {
  const latestFeeSnapshot = getLatestFeeSnapshot(args.feeSnapshots);
  const latestSeatSnapshot = getLatestSeatSnapshot(args.seatSnapshots);
  const trustSummary = getBranchTrustSummary({
    branch: args.branch,
    institutionName: args.institution?.name,
    reviews: args.reviews,
    trustAssets: args.trustAssets,
    feeSnapshot: latestFeeSnapshot,
    contacts: args.contacts,
    hasSeatInventory: Boolean(latestSeatSnapshot),
  });

  return {
    ...args.branch,
    assets: args.assets.sort((left, right) => left.sort_order - right.sort_order),
    highlights:
      (Array.isArray(args.branch.trust_assets_json?.["trust_points"])
        ? (args.branch.trust_assets_json?.["trust_points"] as string[])
        : null) ??
      highlightLookup.get(args.branch.code.toLowerCase()) ??
      buildFallbackHighlights(args.branch, trustSummary.score),
    institution_name: args.institution?.name ?? null,
    branch_contacts: args.contacts,
    trust_assets: args.trustAssets.sort((left, right) => left.sort_order - right.sort_order),
    review_snapshots: args.reviews,
    trust_score: trustSummary.score,
    trust_band: trustSummary.band,
    primary_review: getPrimaryReview(args.reviews),
    latest_fee_snapshot: latestFeeSnapshot,
    latest_seat_snapshot: latestSeatSnapshot,
  };
}

export async function getActiveBranchProfiles() {
  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    const contactMap = groupRowsByBranchId(branchContacts);
    const trustAssetMap = groupRowsByBranchId(branchTrustAssets);
    const reviewMap = groupRowsByBranchId(branchReviews);
    const feeMap = groupRowsByBranchId(branchFeeSnapshots);
    const seatMap = groupRowsByBranchId(seatInventorySnapshots);
    const institutionMap = new Map(institutions.map((institution) => [institution.id, institution]));

    return branchProfiles.filter((branch) => branch.active).map((branch) =>
      hydrateBranch({
        branch,
        assets: branch.assets,
        institution: branch.institution_id ? institutionMap.get(branch.institution_id) ?? null : null,
        contacts: contactMap.get(branch.id) ?? [],
        trustAssets: trustAssetMap.get(branch.id) ?? [],
        reviews: reviewMap.get(branch.id) ?? [],
        feeSnapshots: feeMap.get(branch.id) ?? [],
        seatSnapshots: seatMap.get(branch.id) ?? [],
      }),
    );
  }

  const [branchResponse, assetResponse, institutionResponse, contactResponse, trustAssetResponse, reviewResponse, feeResponse, seatResponse] =
    await Promise.all([
    supabase.from("branches").select("*").eq("active", true).order("priority_rank", { ascending: true }).order("capacity_available", { ascending: false }),
    supabase.from("branch_assets").select("*").eq("active", true).order("sort_order", { ascending: true }),
    supabase.from("institutions").select("*").eq("active", true).order("name"),
    supabase.from("branch_contacts").select("*").eq("active", true).order("primary_contact", { ascending: false }),
    supabase.from("branch_trust_assets").select("*").eq("verified", true).order("sort_order", { ascending: true }),
    supabase.from("branch_reviews").select("*").order("last_checked_at", { ascending: false }),
    supabase.from("branch_fee_snapshots").select("*").order("effective_from", { ascending: false }),
    supabase.from("seat_inventory_snapshots").select("*").order("captured_at", { ascending: false }),
  ]);

  if (branchResponse.error || !branchResponse.data) {
    return branchProfiles.filter((branch) => branch.active);
  }

  const branchRows = branchResponse.data as Branch[];
  const assetRows = assetResponse.error ? [] : ((assetResponse.data ?? []) as BranchAsset[]);
  const institutionRows = institutionResponse.error ? [] : ((institutionResponse.data ?? []) as Institution[]);
  const contactRows = contactResponse.error ? [] : ((contactResponse.data ?? []) as BranchContact[]);
  const trustAssetRows = trustAssetResponse.error ? [] : ((trustAssetResponse.data ?? []) as BranchTrustAsset[]);
  const reviewRows = reviewResponse.error ? [] : ((reviewResponse.data ?? []) as BranchReview[]);
  const feeRows = feeResponse.error ? [] : ((feeResponse.data ?? []) as BranchFeeSnapshot[]);
  const seatRows = seatResponse.error ? [] : ((seatResponse.data ?? []) as SeatInventorySnapshot[]);
  const groupedAssets = groupRowsByBranchId(assetRows);
  const groupedContacts = groupRowsByBranchId(contactRows);
  const groupedTrustAssets = groupRowsByBranchId(trustAssetRows);
  const groupedReviews = groupRowsByBranchId(reviewRows);
  const groupedFees = groupRowsByBranchId(feeRows);
  const groupedSeats = groupRowsByBranchId(seatRows);
  const institutionMap = new Map(institutionRows.map((institution) => [institution.id, institution]));

  return branchRows.map((branch) =>
    hydrateBranch({
      branch,
      assets: groupedAssets.get(branch.id) ?? [],
      institution: branch.institution_id ? institutionMap.get(branch.institution_id) ?? null : null,
      contacts: groupedContacts.get(branch.id) ?? [],
      trustAssets: groupedTrustAssets.get(branch.id) ?? [],
      reviews: groupedReviews.get(branch.id) ?? [],
      feeSnapshots: groupedFees.get(branch.id) ?? [],
      seatSnapshots: groupedSeats.get(branch.id) ?? [],
    }),
  );
}

export async function getFeaturedBranchProfiles(limit = 3) {
  const profiles = await getActiveBranchProfiles();
  return profiles.slice(0, limit);
}

export async function getBranchByIdentifier(identifier: string) {
  const normalizedIdentifier = identifier.toLowerCase();
  const profiles = await getActiveBranchProfiles();

  return (
    profiles.find(
      (branch) => branch.id === identifier || branch.code.toLowerCase() === normalizedIdentifier,
    ) ?? null
  );
}

export const branchStaticParams = branchProfiles.map((branch) => ({ id: branch.code }));
export const branchAssetFallback = branchAssets;
