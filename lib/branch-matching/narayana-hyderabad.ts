import {
  NARAYANA_HYDERABAD_ONLY_MODE,
  NARAYANA_HYDERABAD_PILOT_SCOPE,
  getBranchCluster,
  getHyderabadPilotDefaultOrder,
} from "@/lib/fixtures/narayana-hyderabad";
import { normalizePincode } from "@/lib/import/normalizers";
import type {
  Branch,
  BranchRecommendation,
  BranchRecommendationRuleScore,
} from "@/types/domain";

export interface HyderabadPilotRecommendationInput {
  locality?: string | null;
  pincode?: string | null;
  course_interest?: string | null;
  hostel_required?: boolean | null;
  preferred_cluster?: string | null;
  parent_latitude?: number | null;
  parent_longitude?: number | null;
  limit?: number;
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function makeRuleScore(
  key: string,
  label: string,
  matched: boolean,
  score: number,
  detail?: string,
): BranchRecommendationRuleScore {
  return {
    key,
    label,
    matched,
    score,
    detail,
  };
}

function courseExists(branch: Branch, courseInterest: string | null | undefined) {
  if (!courseInterest) {
    return true;
  }

  const normalizedCourse = normalizeText(courseInterest);

  return branch.courses.some(
    (course) =>
      normalizeText(course.code) === normalizedCourse ||
      normalizeText(course.name) === normalizedCourse ||
      normalizeText(course.stream) === normalizedCourse,
  );
}

function hasCoordinates(branch: Branch) {
  return typeof branch.latitude === "number" && typeof branch.longitude === "number";
}

function haversineDistanceKm(args: {
  fromLatitude: number;
  fromLongitude: number;
  toLatitude: number;
  toLongitude: number;
}) {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLat = toRadians(args.toLatitude - args.fromLatitude);
  const deltaLng = toRadians(args.toLongitude - args.fromLongitude);
  const latitude1 = toRadians(args.fromLatitude);
  const latitude2 = toRadians(args.toLatitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getHyderabadPilotBranches(branches: Branch[]) {
  return branches.filter(
    (branch) => branch.active && branch.pilot_scope === NARAYANA_HYDERABAD_PILOT_SCOPE,
  );
}

function getDefaultOrderScore(branch: Branch) {
  const order = getHyderabadPilotDefaultOrder();
  const index = order.findIndex((item) => item === branch.name);
  if (index === -1) {
    return 0;
  }

  return Math.max(0, 180 - index * 8);
}

function resolvePreferredCluster(input: HyderabadPilotRecommendationInput) {
  return (
    (input.preferred_cluster ? getBranchCluster(input.preferred_cluster) : null) ??
    getBranchCluster(input.locality) ??
    null
  );
}

export function recommendNarayanaHyderabadBranches(
  input: HyderabadPilotRecommendationInput,
  branches: Branch[],
): BranchRecommendation[] {
  const candidateBranches = getHyderabadPilotBranches(branches);
  const limit = input.limit ?? 3;

  if (candidateBranches.length === 0) {
    return [];
  }

  const normalizedPincode = normalizePincode(input.pincode ?? null);
  const preferredCluster = resolvePreferredCluster(input);
  const hasGeoInput = typeof input.parent_latitude === "number" && typeof input.parent_longitude === "number";
  const geoCandidates = hasGeoInput ? candidateBranches.filter((branch) => hasCoordinates(branch)) : [];
  const clusterCandidates = preferredCluster
    ? candidateBranches.filter((branch) => branch.geo_cluster === preferredCluster)
    : [];
  const pincodeCandidates = normalizedPincode
    ? candidateBranches.filter((branch) => branch.pincode === normalizedPincode)
    : [];

  const recommendationBasis: BranchRecommendation["recommendation_basis"] =
    hasGeoInput && geoCandidates.length > 0
      ? "geo"
      : clusterCandidates.length > 0
        ? "cluster"
        : pincodeCandidates.length > 0
          ? "pincode"
          : "default";

  const filteredCandidates =
    recommendationBasis === "geo"
      ? geoCandidates
      : recommendationBasis === "cluster"
        ? clusterCandidates
        : recommendationBasis === "pincode"
          ? pincodeCandidates
          : candidateBranches;

  return filteredCandidates
    .map((branch) => {
      const ruleScores: BranchRecommendationRuleScore[] = [];

      if (
        recommendationBasis === "geo" &&
        hasGeoInput &&
        typeof branch.latitude === "number" &&
        typeof branch.longitude === "number"
      ) {
        const distanceKm = haversineDistanceKm({
          fromLatitude: input.parent_latitude as number,
          fromLongitude: input.parent_longitude as number,
          toLatitude: branch.latitude,
          toLongitude: branch.longitude,
        });

        ruleScores.push(
          makeRuleScore(
            "geo_distance",
            "Closest mapped branch",
            true,
            Math.max(0, 260 - Math.round(distanceKm * 12)),
            `${distanceKm.toFixed(1)} km`,
          ),
        );
      }

      const clusterMatch = Boolean(preferredCluster && branch.geo_cluster === preferredCluster);
      ruleScores.push(
        makeRuleScore(
          "pilot_cluster",
          "Same Hyderabad cluster",
          clusterMatch,
          clusterMatch ? 220 : 0,
          branch.geo_cluster ?? undefined,
        ),
      );

      const pincodeMatch = Boolean(normalizedPincode && branch.pincode === normalizedPincode);
      ruleScores.push(
        makeRuleScore(
          "pilot_pincode",
          "Same pilot pincode",
          pincodeMatch,
          pincodeMatch ? 180 : 0,
          pincodeMatch ? branch.pincode : undefined,
        ),
      );

      const courseMatch = courseExists(branch, input.course_interest);
      ruleScores.push(
        makeRuleScore(
          "course_interest",
          "Course availability",
          courseMatch,
          input.course_interest ? (courseMatch ? 40 : -50) : 10,
          input.course_interest ?? undefined,
        ),
      );

      const hostelMatch = input.hostel_required ? branch.hostel_available : true;
      ruleScores.push(
        makeRuleScore(
          "hostel_required",
          "Hostel availability",
          hostelMatch,
          input.hostel_required ? (branch.hostel_available ? 30 : -40) : branch.hostel_available ? 10 : 0,
          input.hostel_required ? (branch.hostel_available ? "Starter hostel flag enabled" : "Hostel pending") : undefined,
        ),
      );

      const defaultOrderScore = getDefaultOrderScore(branch);
      ruleScores.push(
        makeRuleScore(
          "default_order",
          "Pilot fallback order",
          defaultOrderScore > 0,
          defaultOrderScore,
          `Rank ${getHyderabadPilotDefaultOrder().findIndex((item) => item === branch.name) + 1}`,
        ),
      );

      const pendingVerification = branch.verification_status === "pending";
      ruleScores.push(
        makeRuleScore(
          "verification_status",
          "Pending verification",
          pendingVerification,
          pendingVerification ? 5 : 15,
          pendingVerification ? "Manual branch verification still required" : "Verified branch",
        ),
      );

      const score = ruleScores.reduce((total, item) => total + item.score, 0);
      const reasons = ruleScores.filter((item) => item.matched && item.score > 0).map((item) => item.label);

      return {
        branch_id: branch.id,
        branch_code: branch.code,
        branch_name: branch.name,
        district: branch.district,
        city: branch.city,
        score,
        reasons,
        rule_scores: ruleScores,
        recommendation_basis: recommendationBasis,
        geo_cluster: branch.geo_cluster ?? null,
        pilot_scope: branch.pilot_scope ?? null,
      } satisfies BranchRecommendation;
    })
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.branch_name.localeCompare(right.branch_name);
    })
    .slice(0, limit);
}

export function isNarayanaHyderabadOnlyMode(value?: string | null) {
  return value === NARAYANA_HYDERABAD_ONLY_MODE;
}

export { NARAYANA_HYDERABAD_ONLY_MODE };
