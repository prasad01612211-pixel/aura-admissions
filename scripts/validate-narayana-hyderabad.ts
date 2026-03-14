import { branchProfiles } from "../lib/fixtures/demo-data";
import {
  buildNarayanaHyderabadVerificationRows,
  getBranchCluster,
  narayanaHyderabadDataset,
  NARAYANA_HYDERABAD_PILOT_SCOPE,
} from "../lib/fixtures/narayana-hyderabad";
import {
  getHyderabadPilotBranches,
  recommendNarayanaHyderabadBranches,
} from "../lib/branch-matching/narayana-hyderabad";

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function main() {
  const pilotBranches = getHyderabadPilotBranches(branchProfiles);
  const uniqueIds = new Set(pilotBranches.map((branch) => branch.id));
  const uniqueCodes = new Set(pilotBranches.map((branch) => branch.code));
  const verificationRows = buildNarayanaHyderabadVerificationRows(pilotBranches);
  const clusterRecommendation = recommendNarayanaHyderabadBranches(
    {
      locality: "Madhapur",
      course_interest: "MPC",
      hostel_required: true,
      limit: 3,
    },
    branchProfiles,
  );
  const pincodeRecommendation = recommendNarayanaHyderabadBranches(
    {
      pincode: "500029",
      course_interest: "BiPC",
      limit: 3,
    },
    branchProfiles,
  );
  const defaultRecommendation = recommendNarayanaHyderabadBranches(
    {
      locality: "Unknown locality",
      pincode: null,
      limit: 3,
    },
    branchProfiles,
  );

  assert(narayanaHyderabadDataset.length === 40, `Expected 40 source rows, received ${narayanaHyderabadDataset.length}.`);
  assert(pilotBranches.length === 40, `Expected 40 pilot branches, received ${pilotBranches.length}.`);
  assert(uniqueIds.size === 40, "Pilot branch ids are not stable/unique.");
  assert(uniqueCodes.size === 40, "Pilot branch codes are not unique.");
  assert(
    pilotBranches.every((branch) => branch.pilot_scope === NARAYANA_HYDERABAD_PILOT_SCOPE),
    "Pilot branch scope is missing on one or more branches.",
  );
  assert(
    pilotBranches.every((branch) => Boolean(branch.geo_cluster)),
    "One or more pilot branches are missing a geo cluster.",
  );
  assert(
    getBranchCluster("Madhapur") === "WEST_HYDERABAD" &&
      getBranchCluster("500070") === "EAST_HYDERABAD" &&
      getBranchCluster("Abids") === "CENTRAL_HYDERABAD" &&
      getBranchCluster("ECIL") === "NORTH_HYDERABAD",
    "Cluster helper returned an unexpected mapping.",
  );
  assert(verificationRows.length === 40, `Expected 40 verification rows, received ${verificationRows.length}.`);
  assert(
    clusterRecommendation.length === 3 &&
      clusterRecommendation.every(
        (branch) =>
          branch.recommendation_basis === "cluster" && branch.geo_cluster === "WEST_HYDERABAD",
      ),
    "Cluster fallback recommendation did not stay inside West Hyderabad.",
  );
  assert(
    pincodeRecommendation.length > 0 &&
      pincodeRecommendation.every((branch) => branch.recommendation_basis === "pincode"),
    "Pincode fallback recommendation did not return a pincode-scoped result.",
  );
  assert(
    defaultRecommendation.length === 3 &&
      defaultRecommendation.every(
        (branch) =>
          branch.recommendation_basis === "default" &&
          pilotBranches.some((candidate) => candidate.id === branch.branch_id),
      ),
    "Default fallback did not stay within the Hyderabad pilot branch set.",
  );

  console.log(
    JSON.stringify(
      {
        source_rows: narayanaHyderabadDataset.length,
        pilot_branches: pilotBranches.length,
        verification_rows: verificationRows.length,
        cluster_basis: clusterRecommendation[0]?.recommendation_basis ?? null,
        pincode_basis: pincodeRecommendation[0]?.recommendation_basis ?? null,
        default_basis: defaultRecommendation[0]?.recommendation_basis ?? null,
      },
      null,
      2,
    ),
  );
}

main();
