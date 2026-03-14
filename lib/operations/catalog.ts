import type { ObjectionType, ProgramCategory, SetupWizardStepKey } from "@/types/operations";

export const supportedPrograms: Record<ProgramCategory, string[]> = {
  intermediate: ["MPC", "BiPC", "MEC", "CEC"],
  btech: ["CSE", "ECE", "EEE", "Civil", "Mechanical", "AI/DS"],
  degree: ["BSc", "BCom", "BA", "BBA", "BCA"],
};

export const setupWizardStepLabels: Record<SetupWizardStepKey, string> = {
  organization_profile: "Organization profile",
  institution_details: "Institution details",
  branch_details: "Branch details",
  programs_and_intake: "Programs and intake",
  fees: "Fees",
  eligibility_and_documents: "Eligibility and documents",
  trust_assets: "Trust assets",
  admission_cycle: "Admission cycle",
  commission_rules: "Commission rules",
  whatsapp_settings: "WhatsApp settings",
  review_and_publish: "Review and publish",
};

export const objectionLabels: Record<ObjectionType, string> = {
  fee_high: "Fee is high",
  too_far: "Too far",
  hostel_concern: "Hostel concern",
  wants_other_course: "Wants another course",
  parent_not_convinced: "Parent not convinced",
  comparing_competitor: "Comparing competitor",
  waiting_for_results: "Waiting for results",
  wants_scholarship: "Wants scholarship",
  not_ready_now: "Not ready now",
  trust_issue: "Trust issue",
};

export const minimumTrustAssetCount = 3;
