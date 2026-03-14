import { branchRecommendationPriority } from "@/lib/branch-matching/rules";
import {
  NARAYANA_HYDERABAD_ONLY_MODE,
  isNarayanaHyderabadOnlyMode,
  recommendNarayanaHyderabadBranches,
} from "@/lib/branch-matching/narayana-hyderabad";
import { normalizeDistrict, normalizePincode } from "@/lib/import/normalizers";
import type {
  Branch,
  BranchRecommendation,
  BranchRecommendationRuleScore,
  RecommendationScopeMode,
} from "@/types/domain";

export interface BranchRecommendationInput {
  pincode?: string | null;
  district?: string | null;
  city?: string | null;
  locality?: string | null;
  course_interest?: string | null;
  hostel_required?: boolean | null;
  preferred_cluster?: string | null;
  parent_latitude?: number | null;
  parent_longitude?: number | null;
  scope_mode?: RecommendationScopeMode | null;
  limit?: number;
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function courseExists(branch: Branch, courseInterest: string | null | undefined) {
  if (!courseInterest) {
    return false;
  }

  const normalizedCourse = normalizeText(courseInterest);
  return branch.courses.some(
    (course) =>
      normalizeText(course.code) === normalizedCourse ||
      normalizeText(course.name) === normalizedCourse ||
      normalizeText(course.stream) === normalizedCourse,
  );
}

function makeRuleScore(
  key: BranchRecommendationRuleScore["key"],
  matched: boolean,
  score: number,
  detail?: string,
) {
  const definition = branchRecommendationPriority.find((item) => item.key === key);

  return {
    key,
    label: definition?.label ?? key,
    matched,
    score,
    detail,
  } satisfies BranchRecommendationRuleScore;
}

export function getRecommendationScopeMode(
  value?: RecommendationScopeMode | string | null,
): RecommendationScopeMode {
  if (value === NARAYANA_HYDERABAD_ONLY_MODE) {
    return "NARAYANA_HYDERABAD_ONLY";
  }

  return process.env.RECOMMENDATION_SCOPE_MODE === NARAYANA_HYDERABAD_ONLY_MODE
    ? "NARAYANA_HYDERABAD_ONLY"
    : "STANDARD";
}

export function recommendBranches(
  input: BranchRecommendationInput,
  branches: Branch[],
): BranchRecommendation[] {
  const scopeMode = getRecommendationScopeMode(input.scope_mode);
  if (isNarayanaHyderabadOnlyMode(scopeMode)) {
    return recommendNarayanaHyderabadBranches(
      {
        locality: input.locality,
        pincode: input.pincode,
        course_interest: input.course_interest,
        hostel_required: input.hostel_required,
        preferred_cluster: input.preferred_cluster,
        parent_latitude: input.parent_latitude,
        parent_longitude: input.parent_longitude,
        limit: input.limit,
      },
      branches,
    );
  }

  const normalizedPincode = normalizePincode(input.pincode ?? null);
  const normalizedDistrict = normalizeDistrict(input.district ?? null);
  const normalizedCity = normalizeText(input.city);
  const normalizedCourse = input.course_interest?.trim() ?? null;
  const wantsHostel = Boolean(input.hostel_required);
  const limit = input.limit ?? 3;

  return branches
    .filter((branch) => branch.active)
    .map((branch) => {
      const ruleScores: BranchRecommendationRuleScore[] = [];

      const exactPincode = Boolean(normalizedPincode && branch.pincode === normalizedPincode);
      ruleScores.push(makeRuleScore("exact_pincode", exactPincode, exactPincode ? 500 : 0, exactPincode ? branch.pincode : undefined));

      const sameDistrict = Boolean(normalizedDistrict && normalizeDistrict(branch.district) === normalizedDistrict);
      ruleScores.push(makeRuleScore("district", sameDistrict, sameDistrict ? 220 : 0, sameDistrict ? branch.district : undefined));

      const sameCity = Boolean(normalizedCity && normalizeText(branch.city) === normalizedCity);
      ruleScores.push(makeRuleScore("nearest_city", sameCity, sameCity ? 150 : 0, sameCity ? branch.city : undefined));

      const hostelMatch = wantsHostel ? branch.hostel_available : true;
      ruleScores.push(
        makeRuleScore(
          "hostel_required",
          hostelMatch,
          wantsHostel ? (branch.hostel_available ? 120 : -120) : branch.hostel_available ? 10 : 0,
          wantsHostel ? (branch.hostel_available ? "Hostel available" : "Hostel unavailable") : undefined,
        ),
      );

      const courseMatch = normalizedCourse ? courseExists(branch, normalizedCourse) : true;
      ruleScores.push(
        makeRuleScore(
          "course_interest",
          courseMatch,
          normalizedCourse ? (courseMatch ? 100 : -80) : 0,
          normalizedCourse ?? undefined,
        ),
      );

      const seatAvailable = branch.capacity_available > 0;
      ruleScores.push(
        makeRuleScore(
          "seat_availability",
          seatAvailable,
          seatAvailable ? Math.min(branch.capacity_available, 90) : -250,
          `${branch.capacity_available} seats`,
        ),
      );

      const priorityScore = Math.max(0, 40 - branch.priority_rank * 5);
      ruleScores.push(
        makeRuleScore(
          "priority_rank",
          true,
          priorityScore,
          `Rank ${branch.priority_rank}`,
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
        recommendation_basis: "standard",
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
