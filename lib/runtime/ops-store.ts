import "server-only";

import { mkdir, readFile, stat, writeFile } from "fs/promises";
import { join } from "path";

import type {
  AdmissionCycle,
  AuditLog,
  CommissionLedger,
  ConversationThread,
  Conversion,
  FeeStructure,
  MessageEvent,
  ObjectionLog,
  Organization,
  OrganizationCommunicationSetting,
  Program,
  Recommendation,
  RequiredDocument,
  SetupWizardDraft,
  TemplateRegistryItem,
  VisitBooking,
} from "@/types/operations";

const runtimeRoot = join(process.cwd(), "data", "runtime");
const organizationsFile = join(runtimeRoot, "organizations.json");
const programsFile = join(runtimeRoot, "programs.json");
const feeStructuresFile = join(runtimeRoot, "fee-structures.json");
const admissionCyclesFile = join(runtimeRoot, "admission-cycles.json");
const requiredDocumentsFile = join(runtimeRoot, "required-documents.json");
const conversationThreadsFile = join(runtimeRoot, "conversation-threads.json");
const messageEventsFile = join(runtimeRoot, "message-events.json");
const recommendationsFile = join(runtimeRoot, "recommendations.json");
const objectionLogsFile = join(runtimeRoot, "objection-logs.json");
const visitBookingsFile = join(runtimeRoot, "visit-bookings.json");
const conversionsFile = join(runtimeRoot, "conversions.json");
const commissionLedgersFile = join(runtimeRoot, "commission-ledgers.json");
const communicationSettingsFile = join(runtimeRoot, "communication-settings.json");
const setupWizardDraftsFile = join(runtimeRoot, "setup-wizard-drafts.json");
const templateRegistryFile = join(runtimeRoot, "template-registry.json");
const auditLogsFile = join(runtimeRoot, "audit-logs.json");

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

async function upsertById<T extends { id: string }>(filePath: string, value: T) {
  const rows = await readJsonFile<T[]>(filePath, []);
  const nextRows = rows.filter((row) => row.id !== value.id);
  nextRows.push(value);
  await writeJsonFile(filePath, nextRows);
  return value;
}

async function appendRow<T>(filePath: string, value: T) {
  const rows = await readJsonFile<T[]>(filePath, []);
  rows.push(value);
  await writeJsonFile(filePath, rows);
  return value;
}

export function readRuntimeOrganizations() {
  return readJsonFile<Organization[]>(organizationsFile, []);
}

export function upsertRuntimeOrganization(value: Organization) {
  return upsertById(organizationsFile, value);
}

export function readRuntimePrograms() {
  return readJsonFile<Program[]>(programsFile, []);
}

export function upsertRuntimeProgram(value: Program) {
  return upsertById(programsFile, value);
}

export function readRuntimeFeeStructures() {
  return readJsonFile<FeeStructure[]>(feeStructuresFile, []);
}

export function upsertRuntimeFeeStructure(value: FeeStructure) {
  return upsertById(feeStructuresFile, value);
}

export function readRuntimeAdmissionCycles() {
  return readJsonFile<AdmissionCycle[]>(admissionCyclesFile, []);
}

export function upsertRuntimeAdmissionCycle(value: AdmissionCycle) {
  return upsertById(admissionCyclesFile, value);
}

export function readRuntimeRequiredDocuments() {
  return readJsonFile<RequiredDocument[]>(requiredDocumentsFile, []);
}

export function upsertRuntimeRequiredDocument(value: RequiredDocument) {
  return upsertById(requiredDocumentsFile, value);
}

export function readRuntimeConversationThreads() {
  return readJsonFile<ConversationThread[]>(conversationThreadsFile, []);
}

export function upsertRuntimeConversationThread(value: ConversationThread) {
  return upsertById(conversationThreadsFile, value);
}

export function readRuntimeMessageEvents() {
  return readJsonFile<MessageEvent[]>(messageEventsFile, []);
}

export function upsertRuntimeMessageEvent(value: MessageEvent) {
  return upsertById(messageEventsFile, value);
}

export function readRuntimeRecommendations() {
  return readJsonFile<Recommendation[]>(recommendationsFile, []);
}

export function upsertRuntimeRecommendation(value: Recommendation) {
  return upsertById(recommendationsFile, value);
}

export function readRuntimeObjectionLogs() {
  return readJsonFile<ObjectionLog[]>(objectionLogsFile, []);
}

export function upsertRuntimeObjectionLog(value: ObjectionLog) {
  return upsertById(objectionLogsFile, value);
}

export function readRuntimeVisitBookings() {
  return readJsonFile<VisitBooking[]>(visitBookingsFile, []);
}

export function upsertRuntimeVisitBooking(value: VisitBooking) {
  return upsertById(visitBookingsFile, value);
}

export function readRuntimeConversions() {
  return readJsonFile<Conversion[]>(conversionsFile, []);
}

export function upsertRuntimeConversion(value: Conversion) {
  return upsertById(conversionsFile, value);
}

export function readRuntimeCommissionLedgers() {
  return readJsonFile<CommissionLedger[]>(commissionLedgersFile, []);
}

export function upsertRuntimeCommissionLedger(value: CommissionLedger) {
  return upsertById(commissionLedgersFile, value);
}

export function readRuntimeCommunicationSettings() {
  return readJsonFile<OrganizationCommunicationSetting[]>(communicationSettingsFile, []);
}

export function upsertRuntimeCommunicationSetting(value: OrganizationCommunicationSetting) {
  return upsertById(communicationSettingsFile, value);
}

export function readRuntimeSetupWizardDrafts() {
  return readJsonFile<SetupWizardDraft[]>(setupWizardDraftsFile, []);
}

export function upsertRuntimeSetupWizardDraft(value: SetupWizardDraft) {
  return upsertById(setupWizardDraftsFile, value);
}

export function readRuntimeTemplateRegistry() {
  return readJsonFile<TemplateRegistryItem[]>(templateRegistryFile, []);
}

export function upsertRuntimeTemplateRegistry(value: TemplateRegistryItem) {
  return upsertById(templateRegistryFile, value);
}

export function readRuntimeAuditLogs() {
  return readJsonFile<AuditLog[]>(auditLogsFile, []);
}

export function appendRuntimeAuditLog(value: AuditLog) {
  return appendRow(auditLogsFile, value);
}
