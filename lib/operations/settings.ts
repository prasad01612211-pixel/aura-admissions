import "server-only";

import { communicationSettings, organizationIds, organizations } from "@/lib/fixtures/operations-data";
import { readRuntimeCommunicationSettings } from "@/lib/runtime/ops-store";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Organization, OrganizationCommunicationSetting } from "@/types/operations";

function mergeById<T extends { id: string }>(rows: T[]) {
  const map = new Map<string, T>();
  rows.forEach((row) => map.set(row.id, row));
  return [...map.values()];
}

export function getDefaultCommunicationSettings(): OrganizationCommunicationSetting {
  return {
    id: "default-settings",
    organization_id: organizationIds.consultancy,
    sandbox_mode: true,
    sandbox_numbers: [],
    whatsapp_enabled: true,
    business_hours_start: "09:00",
    business_hours_end: "20:00",
    timezone: "Asia/Kolkata",
    rate_limit_per_minute: 30,
    retry_limit: 3,
    seat_lock_enabled: true,
    default_seat_lock_amount: 1000,
    payment_terms_text: "Seat-lock confirms admission intent and is adjusted as per partner policy.",
    refund_policy_text: "Refunds depend on the partner institution policy shared before payment.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function getOrganizations(): Promise<Organization[]> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return organizations;
  }

  const { data } = await supabase.from("organizations").select("*").eq("is_active", true).order("public_name");
  return ((data ?? []) as Organization[]).length > 0 ? ((data ?? []) as Organization[]) : organizations;
}

export async function getCommunicationSettings(organizationId = organizationIds.consultancy): Promise<OrganizationCommunicationSetting> {
  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    const runtime = await readRuntimeCommunicationSettings();
    return (
      mergeById([...communicationSettings, ...runtime]).find((row) => row.organization_id === organizationId) ??
      communicationSettings.find((row) => row.organization_id === organizationId) ??
      getDefaultCommunicationSettings()
    );
  }

  const { data } = await supabase
    .from("organization_communication_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(1);

  return ((data ?? [])[0] as OrganizationCommunicationSetting | undefined) ?? getDefaultCommunicationSettings();
}
