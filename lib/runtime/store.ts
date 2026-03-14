import "server-only";

import { mkdir, readFile, stat, writeFile } from "fs/promises";
import { join } from "path";

import type {
  AdmissionAttribution,
  AdmissionForm,
  Campaign,
  Conversation,
  Lead,
  LeadEvent,
  Payment,
  PayoutLedger,
  Task,
} from "@/types/domain";

const runtimeRoot = join(process.cwd(), "data", "runtime");
const leadOverridesFile = join(runtimeRoot, "lead-overrides.json");
const admissionFormsFile = join(runtimeRoot, "admission-forms.json");
const paymentsFile = join(runtimeRoot, "payments.json");
const tasksFile = join(runtimeRoot, "tasks.json");
const leadEventsFile = join(runtimeRoot, "lead-events.json");
const conversationsFile = join(runtimeRoot, "conversations.json");
const campaignsFile = join(runtimeRoot, "campaigns.json");
const admissionAttributionsFile = join(runtimeRoot, "admission-attributions.json");
const payoutLedgerFile = join(runtimeRoot, "payout-ledger.json");

type LeadOverrideMap = Record<string, Partial<Lead>>;

async function ensureRuntimeRoot() {
  await mkdir(runtimeRoot, { recursive: true });
}

async function pathExists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  if (!(await pathExists(filePath))) {
    return fallback;
  }

  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function writeJsonFile(filePath: string, value: unknown) {
  await ensureRuntimeRoot();
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function readRuntimeLeadOverrides() {
  return readJsonFile<LeadOverrideMap>(leadOverridesFile, {});
}

export async function getRuntimeLeadOverride(leadId: string) {
  const overrides = await readRuntimeLeadOverrides();
  return overrides[leadId] ?? null;
}

export async function upsertRuntimeLeadOverride(leadId: string, patch: Partial<Lead>) {
  const overrides = await readRuntimeLeadOverrides();
  const current = overrides[leadId] ?? {};

  overrides[leadId] = {
    ...current,
    ...patch,
    id: leadId,
    updated_at: patch.updated_at ?? new Date().toISOString(),
  };

  await writeJsonFile(leadOverridesFile, overrides);
  return overrides[leadId];
}

export async function readRuntimeAdmissionForms() {
  return readJsonFile<AdmissionForm[]>(admissionFormsFile, []);
}

export async function upsertRuntimeAdmissionForm(form: AdmissionForm) {
  const rows = await readRuntimeAdmissionForms();
  const nextRows = rows.filter((row) => row.id !== form.id && row.lead_id !== form.lead_id);
  nextRows.push(form);
  await writeJsonFile(admissionFormsFile, nextRows);
  return form;
}

export async function readRuntimePayments() {
  return readJsonFile<Payment[]>(paymentsFile, []);
}

export async function upsertRuntimePayment(payment: Payment) {
  const rows = await readRuntimePayments();
  const nextRows = rows.filter((row) => row.id !== payment.id);
  nextRows.push(payment);
  await writeJsonFile(paymentsFile, nextRows);
  return payment;
}

export async function readRuntimeTasks() {
  return readJsonFile<Task[]>(tasksFile, []);
}

export async function upsertRuntimeTask(task: Task) {
  const rows = await readRuntimeTasks();
  const nextRows = rows.filter((row) => row.id !== task.id);
  nextRows.push(task);
  await writeJsonFile(tasksFile, nextRows);
  return task;
}

export async function readRuntimeLeadEvents() {
  return readJsonFile<LeadEvent[]>(leadEventsFile, []);
}

export async function appendRuntimeLeadEvent(event: LeadEvent) {
  const rows = await readRuntimeLeadEvents();
  rows.push(event);
  await writeJsonFile(leadEventsFile, rows);
  return event;
}

export async function readRuntimeConversations() {
  return readJsonFile<Conversation[]>(conversationsFile, []);
}

export async function upsertRuntimeConversation(conversation: Conversation) {
  const rows = await readRuntimeConversations();
  const nextRows = rows.filter((row) => row.id !== conversation.id);
  nextRows.push(conversation);
  await writeJsonFile(conversationsFile, nextRows);
  return conversation;
}

export async function readRuntimeCampaigns() {
  return readJsonFile<Campaign[]>(campaignsFile, []);
}

export async function upsertRuntimeCampaign(campaign: Campaign) {
  const rows = await readRuntimeCampaigns();
  const nextRows = rows.filter((row) => row.id !== campaign.id);
  nextRows.push(campaign);
  await writeJsonFile(campaignsFile, nextRows);
  return campaign;
}

export async function readRuntimeAdmissionAttributions() {
  return readJsonFile<AdmissionAttribution[]>(admissionAttributionsFile, []);
}

export async function upsertRuntimeAdmissionAttribution(attribution: AdmissionAttribution) {
  const rows = await readRuntimeAdmissionAttributions();
  const nextRows = rows.filter((row) => row.id !== attribution.id);
  nextRows.push(attribution);
  await writeJsonFile(admissionAttributionsFile, nextRows);
  return attribution;
}

export async function readRuntimePayoutLedger() {
  return readJsonFile<PayoutLedger[]>(payoutLedgerFile, []);
}

export async function upsertRuntimePayoutLedger(item: PayoutLedger) {
  const rows = await readRuntimePayoutLedger();
  const nextRows = rows.filter((row) => row.id !== item.id);
  nextRows.push(item);
  await writeJsonFile(payoutLedgerFile, nextRows);
  return item;
}
