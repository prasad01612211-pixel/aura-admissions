import "server-only";

import { randomUUID } from "crypto";

import { branchTrustAssets, branches, commissionRules, institutions } from "@/lib/fixtures/demo-data";
import {
  admissionCycles,
  organizations,
  programs,
  requiredDocuments,
  setupWizardDrafts,
  feeStructures,
  organizationIds,
} from "@/lib/fixtures/operations-data";
import { minimumTrustAssetCount, setupWizardStepLabels } from "@/lib/operations/catalog";
import { getCommunicationSettings } from "@/lib/operations/settings";
import {
  readRuntimeAdmissionCycles,
  readRuntimeFeeStructures,
  readRuntimeOrganizations,
  readRuntimePrograms,
  readRuntimeRequiredDocuments,
  readRuntimeSetupWizardDrafts,
  upsertRuntimeSetupWizardDraft,
} from "@/lib/runtime/ops-store";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { BranchTrustAsset, CommissionRule, Institution } from "@/types/domain";
import type {
  AdmissionCycle,
  FeeStructure,
  Organization,
  Program,
  RequiredDocument,
  SetupWizardDraft,
  SetupWizardSnapshot,
  SetupWizardStepKey,
} from "@/types/operations";

function mergeById<T extends { id: string }>(rows: T[]) {
  const map = new Map<string, T>();
  rows.forEach((row) => map.set(row.id, row));
  return [...map.values()];
}

type SetupCollections = {
  organizations: Organization[];
  institutions: Institution[];
  branches: typeof branches;
  programs: Program[];
  feeStructures: FeeStructure[];
  admissionCycles: AdmissionCycle[];
  requiredDocuments: RequiredDocument[];
  commissionRules: CommissionRule[];
  trustAssets: BranchTrustAsset[];
  drafts: SetupWizardDraft[];
};

async function getLocalCollections(): Promise<SetupCollections> {
  const [runtimeOrganizations, runtimePrograms, runtimeFees, runtimeCycles, runtimeDocuments, runtimeDrafts] = await Promise.all([
    readRuntimeOrganizations(),
    readRuntimePrograms(),
    readRuntimeFeeStructures(),
    readRuntimeAdmissionCycles(),
    readRuntimeRequiredDocuments(),
    readRuntimeSetupWizardDrafts(),
  ]);

  return {
    organizations: mergeById([...organizations, ...runtimeOrganizations]),
    institutions,
    branches,
    programs: mergeById([...programs, ...runtimePrograms]),
    feeStructures: mergeById([...feeStructures, ...runtimeFees]),
    admissionCycles: mergeById([...admissionCycles, ...runtimeCycles]),
    requiredDocuments: mergeById([...requiredDocuments, ...runtimeDocuments]),
    commissionRules,
    trustAssets: branchTrustAssets,
    drafts: mergeById([...setupWizardDrafts, ...runtimeDrafts]),
  };
}

async function getSupabaseCollections(): Promise<SetupCollections> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return getLocalCollections();
  }

  const [
    { data: organizationRows },
    { data: institutionRows },
    { data: branchRows },
    { data: programRows },
    { data: feeRows },
    { data: cycleRows },
    { data: documentRows },
    { data: commissionRows },
    { data: trustRows },
    { data: draftRows },
  ] = await Promise.all([
    supabase.from("organizations").select("*").order("public_name"),
    supabase.from("institutions").select("*").order("name"),
    supabase.from("branches").select("*").order("name"),
    supabase.from("programs").select("*").order("course_name"),
    supabase.from("fee_structures").select("*").order("created_at", { ascending: false }),
    supabase.from("admission_cycles").select("*").order("created_at", { ascending: false }),
    supabase.from("required_documents").select("*").order("created_at", { ascending: false }),
    supabase.from("commission_rules").select("*").order("created_at", { ascending: false }),
    supabase.from("branch_trust_assets").select("*").order("sort_order"),
    supabase.from("setup_wizard_drafts").select("*").order("updated_at", { ascending: false }),
  ]);

  return {
    organizations: ((organizationRows ?? []) as Organization[]).length > 0 ? ((organizationRows ?? []) as Organization[]) : organizations,
    institutions: ((institutionRows ?? []) as Institution[]).length > 0 ? ((institutionRows ?? []) as Institution[]) : institutions,
    branches: ((branchRows ?? []) as typeof branches).length > 0 ? ((branchRows ?? []) as typeof branches) : branches,
    programs: ((programRows ?? []) as Program[]).length > 0 ? ((programRows ?? []) as Program[]) : programs,
    feeStructures: ((feeRows ?? []) as FeeStructure[]).length > 0 ? ((feeRows ?? []) as FeeStructure[]) : feeStructures,
    admissionCycles: ((cycleRows ?? []) as AdmissionCycle[]).length > 0 ? ((cycleRows ?? []) as AdmissionCycle[]) : admissionCycles,
    requiredDocuments: ((documentRows ?? []) as RequiredDocument[]).length > 0 ? ((documentRows ?? []) as RequiredDocument[]) : requiredDocuments,
    commissionRules: ((commissionRows ?? []) as CommissionRule[]).length > 0 ? ((commissionRows ?? []) as CommissionRule[]) : commissionRules,
    trustAssets: ((trustRows ?? []) as BranchTrustAsset[]).length > 0 ? ((trustRows ?? []) as BranchTrustAsset[]) : branchTrustAssets,
    drafts: ((draftRows ?? []) as SetupWizardDraft[]) ?? [],
  };
}

function buildBlockers(args: {
  institution: Institution | null;
  institutionBranches: typeof branches;
  institutionPrograms: Program[];
  currentFees: FeeStructure[];
  currentCycle: AdmissionCycle | null;
  trustAssetCount: number;
  institutionRules: CommissionRule[];
  sandboxMode: boolean;
  whatsappConfigured: boolean;
}) {
  const blockers: string[] = [];

  if (!args.institution?.name) blockers.push("Institution name is missing.");
  if (args.institutionBranches.length < 1) blockers.push("At least one branch is required.");
  if (args.institutionPrograms.filter((program) => program.active_for_cycle).length < 1) blockers.push("At least one active program is required.");
  if (args.currentFees.length < 1) blockers.push("Current fee data is missing.");
  if (!(args.institution?.admissions_phone ?? args.institution?.contact_phone)) blockers.push("Admissions phone is required.");
  if (!args.currentCycle?.admissions_open) blockers.push("Admissions open flag must be enabled.");
  if (args.trustAssetCount < minimumTrustAssetCount) blockers.push("At least three trust assets or FAQs are required.");
  if (args.institutionRules.length < 1) blockers.push("At least one commission rule is required.");
  if (!args.whatsappConfigured && !args.sandboxMode) blockers.push("WhatsApp config is missing and sandbox mode is disabled.");

  return blockers;
}

export async function getSetupWizardSnapshot(args?: {
  organizationId?: string;
  institutionId?: string;
}): Promise<SetupWizardSnapshot> {
  const supabase = createAdminSupabaseClient();
  const collections = supabase ? await getSupabaseCollections() : await getLocalCollections();
  const organization = collections.organizations.find((row) => row.id === (args?.organizationId ?? organizationIds.consultancy)) ?? collections.organizations[0] ?? null;
  const institution =
    collections.institutions.find((row) => row.id === args?.institutionId) ??
    collections.institutions.find((row) => row.organization_id === organization?.id) ??
    collections.institutions[0] ??
    null;
  const institutionBranches = collections.branches.filter((branch) => branch.institution_id === institution?.id);
  const institutionPrograms = collections.programs.filter((program) =>
    institutionBranches.some((branch) => branch.id === program.branch_id),
  );
  const currentFees = collections.feeStructures.filter(
    (fee) => institutionPrograms.some((program) => program.id === fee.program_id) && fee.is_current,
  );
  const institutionDocuments = collections.requiredDocuments.filter((document) =>
    institutionPrograms.some((program) => program.id === document.program_id),
  );
  const currentCycle =
    collections.admissionCycles.find((cycle) => cycle.institution_id === institution?.id && cycle.academic_year === "2026-27") ??
    collections.admissionCycles.find((cycle) => cycle.institution_id === institution?.id) ??
    null;
  const institutionRules = collections.commissionRules.filter(
    (rule) => rule.institution_id === institution?.id && rule.active,
  );
  const trustAssetCount = collections.trustAssets.filter((asset) =>
    institutionBranches.some((branch) => branch.id === asset.branch_id),
  ).length;
  const draft =
    collections.drafts.find((row) => row.organization_id === organization?.id && row.institution_id === institution?.id) ??
    null;
  const communicationSetting = await getCommunicationSettings(organization?.id);
  const whatsappConfigured = Boolean(communicationSetting.whatsapp_enabled);
  const blockers = buildBlockers({
    institution,
    institutionBranches,
    institutionPrograms,
    currentFees,
    currentCycle,
    trustAssetCount,
    institutionRules,
    sandboxMode: communicationSetting.sandbox_mode,
    whatsappConfigured,
  });
  const completed = new Set(draft?.completed_steps ?? []);

  return {
    source_label: supabase ? "Supabase" : "Local pilot mode",
    draft,
    steps: Object.entries(setupWizardStepLabels).map(([key, label]) => ({
      key: key as SetupWizardStepKey,
      label,
      required: !["trust_assets"].includes(key),
      completed: completed.has(key as SetupWizardStepKey),
    })),
    publish_ready: blockers.length === 0,
    blockers,
    organization,
    institutions: institution ? [institution] : [],
    branches: institutionBranches,
    programs: institutionPrograms,
    fee_structures: currentFees,
    admission_cycles: currentCycle ? [currentCycle] : [],
    required_documents: institutionDocuments,
    communication_settings: communicationSetting,
    trust_assets: collections.trustAssets.filter((asset) => institutionBranches.some((branch) => branch.id === asset.branch_id)),
  };
}

export async function saveSetupWizardDraft(input: {
  organizationId?: string | null;
  institutionId?: string | null;
  stepKey: SetupWizardStepKey;
  draftPayload: Record<string, unknown>;
  completedSteps: SetupWizardStepKey[];
  published?: boolean;
}) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const existingRows = supabase
    ? (((await supabase
        .from("setup_wizard_drafts")
        .select("*")
        .eq("organization_id", input.organizationId ?? organizationIds.consultancy)
        .eq("institution_id", input.institutionId ?? institutions[0]?.id ?? null)
        .order("updated_at", { ascending: false })
        .limit(1)).data ?? []) as SetupWizardDraft[])
    : await readRuntimeSetupWizardDrafts();
  const existing =
    existingRows.find(
      (row) =>
        row.organization_id === (input.organizationId ?? organizationIds.consultancy) &&
        row.institution_id === (input.institutionId ?? institutions[0]?.id ?? null),
    ) ?? null;

  const nextDraft: SetupWizardDraft = {
    id: existing?.id ?? randomUUID(),
    organization_id: input.organizationId ?? organizationIds.consultancy,
    institution_id: input.institutionId ?? institutions[0]?.id ?? null,
    step_key: input.stepKey,
    draft_payload: input.draftPayload,
    completed_steps: input.completedSteps,
    published: input.published ?? existing?.published ?? false,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };

  if (!supabase) {
    return upsertRuntimeSetupWizardDraft(nextDraft);
  }

  const { error } = await supabase.from("setup_wizard_drafts").upsert(nextDraft as never);
  if (error) {
    throw new Error(error.message);
  }

  return nextDraft;
}

export async function publishSetupWizard(input: {
  organizationId?: string | null;
  institutionId?: string | null;
  completedSteps: SetupWizardStepKey[];
}) {
  const snapshot = await getSetupWizardSnapshot({
    organizationId: input.organizationId ?? undefined,
    institutionId: input.institutionId ?? undefined,
  });

  if (snapshot.blockers.length > 0) {
    throw new Error(`Cannot publish setup. ${snapshot.blockers.join(" ")}`);
  }

  return saveSetupWizardDraft({
    organizationId: input.organizationId,
    institutionId: input.institutionId,
    stepKey: "review_and_publish",
    draftPayload: {
      published_at: new Date().toISOString(),
      blockers: [],
    },
    completedSteps: input.completedSteps,
    published: true,
  });
}
