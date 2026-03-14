import "server-only";

import { branches, campaigns, leadEvents, leads, payments, tasks, users } from "@/lib/fixtures/demo-data";
import { buildLocalCampaign, readLocalImportManifest, type LocalImportManifest } from "@/lib/local-import/store";
import {
  readRuntimeCampaigns,
  readRuntimeLeadEvents,
  readRuntimeLeadOverrides,
  readRuntimePayments,
  readRuntimeTasks,
} from "@/lib/runtime/store";
import { applyLeadScoreModel } from "@/lib/scoring/score-band";
import type { AppDataSource, Branch, Campaign, Lead, LeadEvent, Payment, Task, User } from "@/types/domain";

const fixtureLeadIds = new Set(leads.map((lead) => lead.id));

type BaseLocalContext = {
  branches: Branch[];
  campaigns: Campaign[];
  data_source: AppDataSource;
  events: LeadEvent[];
  payments: Payment[];
  source_label: string;
  tasks: Task[];
  total_leads: number;
  users: User[];
};

export type LocalActiveContext =
  | (BaseLocalContext & {
      data_source: "fixtures";
      leads: Lead[];
      manifest: null;
    })
  | (BaseLocalContext & {
      data_source: "local_import";
      leads: Lead[];
      manifest: LocalImportManifest;
    });

function mergeRowsById<T extends { id: string }>(baseRows: T[], runtimeRows: T[]) {
  const merged = new Map(baseRows.map((row) => [row.id, row]));

  runtimeRows.forEach((row) => {
    merged.set(row.id, row);
  });

  return [...merged.values()];
}

function buildScoredLeadRows(leadRows: Lead[], eventRows: LeadEvent[], paymentRows: Payment[]) {
  const eventsByLead = new Map<string, LeadEvent[]>();
  const paymentsByLead = new Map<string, Payment[]>();

  eventRows.forEach((event) => {
    const current = eventsByLead.get(event.lead_id) ?? [];
    current.push(event);
    eventsByLead.set(event.lead_id, current);
  });

  paymentRows.forEach((payment) => {
    const current = paymentsByLead.get(payment.lead_id) ?? [];
    current.push(payment);
    paymentsByLead.set(payment.lead_id, current);
  });

  return leadRows.map((lead) =>
    applyLeadScoreModel({
      lead,
      events: eventsByLead.get(lead.id) ?? [],
      payments: paymentsByLead.get(lead.id) ?? [],
    }).lead,
  );
}

export function isFixtureLeadId(leadId: string) {
  return fixtureLeadIds.has(leadId);
}

export async function getLocalFixtureContext(): Promise<LocalActiveContext> {
  const [leadOverrides, runtimeCampaigns, runtimeEvents, runtimePayments, runtimeTasks] = await Promise.all([
    readRuntimeLeadOverrides(),
    readRuntimeCampaigns(),
    readRuntimeLeadEvents(),
    readRuntimePayments(),
    readRuntimeTasks(),
  ]);

  const leadRows = leads.map((lead) => ({
    ...lead,
    ...(leadOverrides[lead.id] ?? {}),
  }));
  const eventRows = [...leadEvents, ...runtimeEvents.filter((event) => isFixtureLeadId(event.lead_id))];
  const paymentRows = mergeRowsById(payments, runtimePayments.filter((payment) => isFixtureLeadId(payment.lead_id)));
  const taskRows = mergeRowsById(tasks, runtimeTasks.filter((task) => isFixtureLeadId(task.lead_id)));

  return {
    branches,
    campaigns: mergeRowsById(campaigns, runtimeCampaigns),
    data_source: "fixtures",
    events: eventRows,
    leads: buildScoredLeadRows(leadRows, eventRows, paymentRows),
    manifest: null,
    payments: paymentRows,
    source_label: "Demo seed data",
    tasks: taskRows,
    total_leads: leadRows.length,
    users,
  };
}

export async function getLocalImportContext(): Promise<LocalActiveContext | null> {
  const manifest = await readLocalImportManifest();

  if (!manifest) {
    return null;
  }

  const [leadOverrides, runtimeCampaigns, runtimeEvents, runtimePayments, runtimeTasks] = await Promise.all([
    readRuntimeLeadOverrides(),
    readRuntimeCampaigns(),
    readRuntimeLeadEvents(),
    readRuntimePayments(),
    readRuntimeTasks(),
  ]);

  const importedLeadRows = Object.entries(leadOverrides)
    .filter(([leadId]) => !isFixtureLeadId(leadId))
    .map(([, lead]) => lead as Lead);
  const eventRows = runtimeEvents.filter((event) => !isFixtureLeadId(event.lead_id));
  const paymentRows = runtimePayments.filter((payment) => !isFixtureLeadId(payment.lead_id));
  const taskRows = runtimeTasks.filter((task) => !isFixtureLeadId(task.lead_id));
  const campaign = buildLocalCampaign(manifest);

  return {
    branches,
    campaigns: mergeRowsById([campaign], runtimeCampaigns),
    data_source: "local_import",
    events: eventRows,
    leads: buildScoredLeadRows(importedLeadRows, eventRows, paymentRows),
    manifest,
    payments: paymentRows,
    source_label: manifest.file_name,
    tasks: taskRows,
    total_leads: manifest.inserted_rows,
    users,
  };
}

export async function getLocalActiveContext(): Promise<LocalActiveContext> {
  return (await getLocalImportContext()) ?? getLocalFixtureContext();
}
