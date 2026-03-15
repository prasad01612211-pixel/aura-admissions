import { randomUUID } from "crypto";
import { createReadStream } from "fs";
import { mkdir, readFile, rm, stat, writeFile } from "fs/promises";
import { join } from "path";
import { createInterface } from "readline";

import {
  getLeadSourceKey,
  isLeadAtRisk,
  isOpenTask,
  isOverdueTask,
} from "@/lib/data/conversion-engine-core";
import { commitLeadImport } from "@/lib/import/parser";
import { normalizePhoneNumber, slugifyFilename } from "@/lib/import/normalizers";
import { readRuntimeLeadOverrides, readRuntimeTasks } from "@/lib/runtime/store";
import type { LeadImportCommitResult, LeadImportPreparedBatchRow } from "@/lib/import/types";
import type { Campaign, Lead, LeadEvent, LeadStage, LeadStatus, Task } from "@/types/domain";

const importRoot = join(process.cwd(), "data", "imported", "current");
const manifestFile = join(importRoot, "manifest.json");
const leadsFile = join(importRoot, "leads.jsonl");
const eventsFile = join(importRoot, "events.jsonl");

export interface LocalImportManifest extends LeadImportCommitResult {
  batch_id: string;
  batch_slug: string;
  imported_at: string;
  source_path: string | null;
}

export interface LocalLeadFilters {
  stage?: LeadStage;
  status?: LeadStatus;
  branch?: string;
  campaign?: string;
  owner?: string;
  source?: string;
  onlyHot?: boolean;
  atRisk?: boolean;
  unowned?: boolean;
  callbackRequested?: boolean;
  visitRequested?: boolean;
  paymentPending?: boolean;
  overdueCallback?: boolean;
  paymentRecovery?: boolean;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface LocalLeadListResult {
  leads: Lead[];
  campaigns: Campaign[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hotCount: number;
  paymentPendingCount: number;
  sourceLabel: string;
}

async function pathExists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function appendJsonLines(filePath: string, rows: string[]) {
  if (rows.length === 0) return;
  await writeFile(filePath, `${rows.join("\n")}\n`, { encoding: "utf8", flag: "a" });
}

function normalizePage(value: number | undefined) {
  if (!value || Number.isNaN(value) || value < 1) {
    return 1;
  }

  return Math.floor(value);
}

function normalizePageSize(value: number | undefined) {
  if (!value || Number.isNaN(value)) {
    return 100;
  }

  return Math.min(200, Math.max(25, Math.floor(value)));
}

function toLocalLead(leadRow: LeadImportPreparedBatchRow["lead"], createdAt: string): Lead {
  return {
    id: leadRow.id ?? randomUUID(),
    source_lead_id: leadRow.source_lead_id ?? null,
    student_name: leadRow.student_name ?? null,
    parent_name: leadRow.parent_name ?? null,
    student_phone: leadRow.student_phone ?? null,
    parent_phone: leadRow.parent_phone ?? null,
    district: leadRow.district ?? null,
    city: leadRow.city ?? null,
    pincode: leadRow.pincode ?? null,
    preferred_language: leadRow.preferred_language ?? null,
    course_interest: leadRow.course_interest ?? null,
    hostel_required: leadRow.hostel_required ?? false,
    marks_10th: leadRow.marks_10th ?? null,
    joining_year: leadRow.joining_year ?? new Date(createdAt).getFullYear(),
    minor_flag: leadRow.minor_flag ?? true,
    assigned_branch_id: leadRow.assigned_branch_id ?? null,
    preferred_branch_id: leadRow.preferred_branch_id ?? null,
    lead_score: leadRow.lead_score ?? 0,
    bot_state: leadRow.bot_state ?? "awaiting_student_name",
    stage: leadRow.stage ?? "imported",
    status: leadRow.status ?? "new",
    last_incoming_at: leadRow.last_incoming_at ?? null,
    last_outgoing_at: leadRow.last_outgoing_at ?? null,
    last_human_contact_at: leadRow.last_human_contact_at ?? null,
    seat_lock_paid: leadRow.seat_lock_paid ?? false,
    seat_lock_amount: leadRow.seat_lock_amount ?? null,
    payment_status: leadRow.payment_status ?? null,
    admission_status: leadRow.admission_status ?? null,
    owner_user_id: leadRow.owner_user_id ?? null,
    utm_source: leadRow.utm_source ?? "excel_import",
    utm_campaign: leadRow.utm_campaign ?? "local-import",
    created_at: leadRow.created_at ?? createdAt,
    updated_at: leadRow.updated_at ?? createdAt,
  };
}

function toLocalEvent(eventRow: LeadImportPreparedBatchRow["event"], createdAt: string): LeadEvent {
  const payload =
    eventRow.payload && typeof eventRow.payload === "object" && !Array.isArray(eventRow.payload)
      ? (eventRow.payload as Record<string, unknown>)
      : {};

  return {
    id: eventRow.id ?? randomUUID(),
    lead_id: eventRow.lead_id ?? "",
    event_type: eventRow.event_type ?? "lead_imported",
    event_source: eventRow.event_source ?? "import",
    payload: {
      source_file: payload.source_file ?? null,
      source_sheet: payload.source_sheet ?? null,
      row_number: payload.row_number ?? null,
      format: payload.format ?? null,
      issues: payload.issues ?? [],
    },
    created_at: eventRow.created_at ?? createdAt,
  };
}

function matchesFilters(lead: Lead, filters: LocalLeadFilters, taskRowsByLeadId: Map<string, Task[]>) {
  const scopedTasks = taskRowsByLeadId.get(lead.id) ?? [];

  if (filters.stage && lead.stage !== filters.stage) return false;
  if (filters.status && lead.status !== filters.status) return false;
  if (filters.branch && lead.assigned_branch_id !== filters.branch && lead.preferred_branch_id !== filters.branch) return false;
  if (filters.campaign && lead.utm_campaign !== filters.campaign) return false;
  if (filters.owner && lead.owner_user_id !== filters.owner) return false;
  if (filters.source && getLeadSourceKey(lead) !== filters.source) return false;
  if (filters.onlyHot && lead.lead_score < 50) return false;
  if (filters.atRisk && !isLeadAtRisk(lead)) return false;
  if (filters.unowned && Boolean(lead.owner_user_id)) return false;
  if (filters.callbackRequested && lead.stage !== "callback_requested") return false;
  if (filters.visitRequested && lead.stage !== "visit_requested") return false;
  if (filters.paymentPending && lead.stage !== "payment_pending") return false;
  if (filters.overdueCallback && !scopedTasks.some((task) => task.task_type === "callback" && isOverdueTask(task))) return false;
  if (filters.paymentRecovery && !scopedTasks.some((task) => task.task_type === "payment_followup" && isOpenTask(task))) return false;
  if (filters.dateFrom && lead.created_at < new Date(filters.dateFrom).toISOString()) return false;
  if (filters.dateTo && lead.created_at > new Date(filters.dateTo).toISOString()) return false;
  return true;
}

function applyLeadOverride(lead: Lead, overrides: Record<string, Partial<Lead>>) {
  return {
    ...lead,
    ...(overrides[lead.id] ?? {}),
  };
}

function getComparablePhone(value: string | null | undefined) {
  const normalized = normalizePhoneNumber(value ?? null);
  return normalized ? normalized.replace(/\D/g, "") : null;
}

function isDefaultImportedLeadFilter(filters: LocalLeadFilters, manifest: LocalImportManifest) {
  return (!filters.stage || filters.stage === "imported") &&
    (!filters.status || filters.status === "new") &&
    (!filters.campaign || filters.campaign === manifest.batch_slug) &&
    !filters.branch &&
    !filters.owner &&
    !filters.source &&
    !filters.onlyHot &&
    !filters.atRisk &&
    !filters.unowned &&
    !filters.callbackRequested &&
    !filters.visitRequested &&
    !filters.paymentPending &&
    !filters.overdueCallback &&
    !filters.paymentRecovery &&
    !filters.dateFrom &&
    !filters.dateTo;
}

function buildTaskRowsByLeadId(taskRows: Task[]) {
  const taskRowsByLeadId = new Map<string, Task[]>();

  taskRows.forEach((task) => {
    const current = taskRowsByLeadId.get(task.lead_id) ?? [];
    current.push(task);
    taskRowsByLeadId.set(task.lead_id, current);
  });

  return taskRowsByLeadId;
}

async function* readJsonLines<T>(filePath: string): AsyncGenerator<T> {
  if (!(await pathExists(filePath))) {
    return;
  }

  const reader = createInterface({
    input: createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const line of reader) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    yield JSON.parse(trimmed) as T;
  }
}

export function buildLocalCampaign(manifest: LocalImportManifest): Campaign {
  return {
    id: manifest.batch_id,
    name: `Local import: ${manifest.file_name}`,
    source_batch: manifest.batch_slug,
    template_name: "local_excel_import",
    target_count: manifest.valid_rows,
    sent_count: 0,
    reply_count: 0,
    qualified_count: 0,
    payment_count: 0,
    admission_count: 0,
    status: "completed",
    created_at: manifest.imported_at,
    updated_at: manifest.imported_at,
  };
}

export async function readLocalImportManifest(): Promise<LocalImportManifest | null> {
  if (!(await pathExists(manifestFile))) {
    return null;
  }

  return JSON.parse(await readFile(manifestFile, "utf8")) as LocalImportManifest;
}

export async function commitLeadImportToLocalStore({
  buffer,
  fileName,
  sourcePath,
  existingPhones = [],
}: {
  buffer: Buffer;
  fileName: string;
  sourcePath?: string;
  existingPhones?: Iterable<string>;
}): Promise<LocalImportManifest> {
  const importedAt = new Date().toISOString();
  await rm(importRoot, { recursive: true, force: true });
  await mkdir(importRoot, { recursive: true });

  const result = await commitLeadImport({
    buffer,
    fileName,
    existingPhones,
    insertBatch: async (rows) => {
      const createdAt = new Date().toISOString();
      const leadLines = rows.map((row) => JSON.stringify(toLocalLead(row.lead, createdAt)));
      const eventLines = rows.map((row) => JSON.stringify(toLocalEvent(row.event, createdAt)));

      await Promise.all([appendJsonLines(leadsFile, leadLines), appendJsonLines(eventsFile, eventLines)]);
    },
  });

  const manifest: LocalImportManifest = {
    ...result,
    batch_id: randomUUID(),
    batch_slug: slugifyFilename(fileName),
    imported_at: importedAt,
    source_path: sourcePath ?? null,
  };

  await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

export async function getLocalImportedLeadList(filters: LocalLeadFilters): Promise<LocalLeadListResult | null> {
  const manifest = await readLocalImportManifest();

  if (!manifest || !(await pathExists(leadsFile))) {
    return null;
  }

  const page = normalizePage(filters.page);
  const pageSize = normalizePageSize(filters.pageSize);
  const campaign = buildLocalCampaign(manifest);
  const [leadOverrides, runtimeTaskRows] = await Promise.all([readRuntimeLeadOverrides(), readRuntimeTasks()]);
  const taskRowsByLeadId = buildTaskRowsByLeadId(runtimeTaskRows);

  if (isDefaultImportedLeadFilter(filters, manifest)) {
    const importedOverrideRows = Object.values(leadOverrides).filter(
      (lead): lead is Partial<Lead> =>
        lead.utm_campaign === manifest.batch_slug || lead.utm_source === "excel_import",
    );
    const defaultTotalOffset = importedOverrideRows.filter(
      (lead) =>
        (lead.stage && lead.stage !== "imported") ||
        (lead.status && lead.status !== "new") ||
        (lead.utm_campaign && lead.utm_campaign !== manifest.batch_slug),
    ).length;
    const total = Math.max(0, manifest.inserted_rows - defaultTotalOffset);
    const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * pageSize;
    const leads: Lead[] = [];
    let index = 0;

    for await (const lead of readJsonLines<Lead>(leadsFile)) {
      const effectiveLead = applyLeadOverride(lead, leadOverrides);
      if (!matchesFilters(effectiveLead, { stage: "imported", status: "new", campaign: manifest.batch_slug }, taskRowsByLeadId)) {
        continue;
      }

      if (index >= offset && leads.length < pageSize) {
        leads.push(effectiveLead);
      }

      index += 1;
      if (leads.length >= pageSize) {
        break;
      }
    }

    return {
      leads,
      campaigns: [campaign],
      total,
      page: safePage,
      pageSize,
      totalPages,
      hotCount: 0,
      paymentPendingCount: 0,
      sourceLabel: manifest.file_name,
    };
  }

  const offset = (page - 1) * pageSize;
  const leads: Lead[] = [];
  let total = 0;
  let hotCount = 0;
  let paymentPendingCount = 0;

  for await (const lead of readJsonLines<Lead>(leadsFile)) {
    const effectiveLead = applyLeadOverride(lead, leadOverrides);

    if (!matchesFilters(effectiveLead, filters, taskRowsByLeadId)) {
      continue;
    }

    total += 1;
    if (effectiveLead.lead_score >= 50) hotCount += 1;
    if (effectiveLead.stage === "payment_pending") paymentPendingCount += 1;

    if (total > offset && leads.length < pageSize) {
      leads.push(effectiveLead);
    }
  }

  const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);

  if (total > 0 && page > totalPages) {
    return getLocalImportedLeadList({ ...filters, page: totalPages, pageSize });
  }

  return {
    leads,
    campaigns: [campaign],
    total,
    page,
    pageSize,
    totalPages,
    hotCount,
    paymentPendingCount,
    sourceLabel: manifest.file_name,
  };
}

export async function getLocalImportedLeadDetail(leadId: string): Promise<{ lead: Lead; events: LeadEvent[] } | null> {
  if (!(await pathExists(leadsFile))) {
    return null;
  }

  const leadOverrides = await readRuntimeLeadOverrides();
  let matchedLead: Lead | null = null;
  for await (const lead of readJsonLines<Lead>(leadsFile)) {
    if (lead.id === leadId) {
      matchedLead = applyLeadOverride(lead, leadOverrides);
      break;
    }
  }

  if (!matchedLead) {
    return null;
  }

  const events: LeadEvent[] = [];
  for await (const event of readJsonLines<LeadEvent>(eventsFile)) {
    if (event.lead_id === leadId) {
      events.push(event);
    }
  }

  return {
    lead: matchedLead,
    events,
  };
}

export async function findLocalImportedLeadByPhone(phone: string): Promise<{ lead: Lead; events: LeadEvent[] } | null> {
  if (!(await pathExists(leadsFile))) {
    return null;
  }

  const lookupPhone = getComparablePhone(phone);
  if (!lookupPhone) {
    return null;
  }

  const leadOverrides = await readRuntimeLeadOverrides();
  let matchedLead: Lead | null = null;

  for await (const lead of readJsonLines<Lead>(leadsFile)) {
    const effectiveLead = applyLeadOverride(lead, leadOverrides);
    const candidatePhones = [effectiveLead.parent_phone, effectiveLead.student_phone]
      .map((value) => getComparablePhone(value))
      .filter(Boolean);

    if (candidatePhones.includes(lookupPhone)) {
      matchedLead = effectiveLead;
      break;
    }
  }

  if (!matchedLead) {
    return null;
  }

  const events: LeadEvent[] = [];
  for await (const event of readJsonLines<LeadEvent>(eventsFile)) {
    if (event.lead_id === matchedLead.id) {
      events.push(event);
    }
  }

  return {
    lead: matchedLead,
    events,
  };
}
