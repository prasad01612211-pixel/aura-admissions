import "server-only";

import { randomUUID } from "crypto";

import { getBranchByIdentifier } from "@/lib/data/branches";
import {
  admissionAttributions,
  admissionForms,
  branches,
  commissionRules,
  conversations,
  getLeadById as getFixtureLead,
  institutions,
  leads,
  leadEvents,
  payments,
  payoutLedger,
  tasks,
  users,
} from "@/lib/fixtures/demo-data";
import { findLocalImportedLeadByPhone, getLocalImportedLeadDetail } from "@/lib/local-import/store";
import { normalizePhoneNumber } from "@/lib/import/normalizers";
import { buildPaymentStub, extractRazorpayWebhookData } from "@/lib/payments/provider";
import { getCommunicationSettings } from "@/lib/operations/settings";
import {
  appendRuntimeLeadEvent,
  getRuntimeLeadOverride,
  readRuntimeAdmissionAttributions,
  readRuntimeConversations,
  readRuntimeAdmissionForms,
  readRuntimeLeadEvents,
  readRuntimePayments,
  readRuntimePayoutLedger,
  readRuntimeTasks,
  upsertRuntimeAdmissionAttribution,
  upsertRuntimeAdmissionForm,
  upsertRuntimeCampaign,
  upsertRuntimeConversation,
  upsertRuntimeLeadOverride,
  upsertRuntimePayment,
  upsertRuntimePayoutLedger,
  upsertRuntimeTask,
} from "@/lib/runtime/store";
import {
  readRuntimeCommissionLedgers,
  readRuntimeConversions,
  readRuntimeVisitBookings,
  upsertRuntimeCommissionLedger,
  upsertRuntimeConversion,
  upsertRuntimeVisitBooking,
} from "@/lib/runtime/ops-store";
import { applyLeadScoreModel } from "@/lib/scoring/score-band";
import { applyLeadTransition } from "@/lib/state-machine/machine";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type {
  AdmissionAttribution,
  AdmissionForm,
  Branch,
  Campaign,
  Conversation,
  ConversationDeliveryStatus,
  ConversationDirection,
  ConversationMessageType,
  Lead,
  LeadEvent,
  LeadStatus,
  Payment,
  PayoutLedger,
  Task,
  TaskPriority,
  TaskType,
} from "@/types/domain";
import type { CommissionLedger, Conversion, VisitBooking } from "@/types/operations";

type LeadSource = "supabase" | "imported" | "fixture";

function getComparablePhone(phone: string | null | undefined) {
  const normalized = normalizePhoneNumber(phone ?? null);
  return normalized ? normalized.replace(/\D/g, "") : null;
}

function getLeadPhoneCandidates(lead: Lead) {
  return [lead.parent_phone, lead.student_phone].map((phone) => getComparablePhone(phone)).filter(Boolean) as string[];
}

export type AdmissionFormInput = {
  leadId: string;
  branchId: string;
  studentName: string;
  fatherName?: string | null;
  motherName?: string | null;
  parentPhone: string;
  studentPhone?: string | null;
  address: string;
  district: string;
  courseSelected: string;
  hostelRequired: boolean;
  marks10th?: number | null;
};

export async function getLeadForWorkflow(leadId: string): Promise<{ lead: Lead; source: LeadSource } | null> {
  const supabase = createAdminSupabaseClient();

  if (supabase) {
    const { data } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
    if (data) {
      return { lead: data as Lead, source: "supabase" };
    }
  }

  const fixtureLead = getFixtureLead(leadId);
  if (fixtureLead) {
    const override = await getRuntimeLeadOverride(leadId);
    return { lead: { ...fixtureLead, ...(override ?? {}) }, source: "fixture" };
  }

  const imported = await getLocalImportedLeadDetail(leadId);
  if (imported) {
    const override = await getRuntimeLeadOverride(leadId);
    return { lead: { ...imported.lead, ...(override ?? {}) }, source: "imported" };
  }
  return null;
}

export async function getBranchForWorkflow(branchIdentifier: string) {
  const branch = await getBranchByIdentifier(branchIdentifier);

  if (!branch) {
    throw new Error("Branch not found.");
  }

  return branch;
}

async function persistLocalLead(lead: Lead) {
  await upsertRuntimeLeadOverride(lead.id, lead);
  return lead;
}

async function persistLocalEvent(event: LeadEvent) {
  await appendRuntimeLeadEvent(event);
  return event;
}

function mergeRowsById<T extends { id: string }>(rows: T[]) {
  const merged = new Map<string, T>();

  rows.forEach((row) => {
    merged.set(row.id, row);
  });

  return [...merged.values()];
}

function isOpenTask(task: Task) {
  return task.status !== "completed" && task.status !== "cancelled";
}

function matchesEventPayload(event: LeadEvent, payload: Record<string, unknown>) {
  return Object.entries(payload).every(([key, value]) => event.payload?.[key] === value);
}

async function findCurrentLocalForm(leadId: string) {
  const runtimeForms = await readRuntimeAdmissionForms();
  const runtimeForm = runtimeForms.find((form) => form.lead_id === leadId);
  if (runtimeForm) return runtimeForm;
  return admissionForms.find((form) => form.lead_id === leadId) ?? null;
}

async function findCurrentForm(leadId: string, source: LeadSource) {
  if (source === "supabase") {
    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase admin client is unavailable.");
    }

    const { data } = await supabase.from("admission_forms").select("*").eq("lead_id", leadId).order("updated_at", { ascending: false }).limit(1);
    return ((data ?? [])[0] as AdmissionForm | undefined) ?? null;
  }

  return findCurrentLocalForm(leadId);
}

async function findCurrentLocalConversations(leadId: string) {
  const runtimeConversations = await readRuntimeConversations();
  return mergeRowsById([...conversations, ...runtimeConversations])
    .filter((conversation) => conversation.lead_id === leadId)
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
}

async function findCurrentConversations(leadId: string, source: LeadSource) {
  if (source === "supabase") {
    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase admin client is unavailable.");
    }

    const { data } = await supabase.from("conversations").select("*").eq("lead_id", leadId).order("created_at", { ascending: false });
    return (data ?? []) as Conversation[];
  }

  return findCurrentLocalConversations(leadId);
}

async function findCurrentLocalPayments(leadId: string) {
  const runtimePayments = await readRuntimePayments();
  return mergeRowsById([...payments, ...runtimePayments]).filter((payment) => payment.lead_id === leadId);
}

async function findCurrentPayments(leadId: string, source: LeadSource) {
  if (source === "supabase") {
    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase admin client is unavailable.");
    }

    const { data } = await supabase.from("payments").select("*").eq("lead_id", leadId);
    return ((data ?? []) as Payment[]).sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  return findCurrentLocalPayments(leadId);
}

async function findCurrentLocalAttributions(leadId: string) {
  const runtimeRows = await readRuntimeAdmissionAttributions();
  return mergeRowsById([...admissionAttributions, ...runtimeRows])
    .filter((row) => row.lead_id === leadId)
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
}

async function findCurrentAttributions(leadId: string, source: LeadSource) {
  if (source === "supabase") {
    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase admin client is unavailable.");
    }

    const { data } = await supabase.from("admission_attributions").select("*").eq("lead_id", leadId).order("created_at", { ascending: false });
    return (data ?? []) as AdmissionAttribution[];
  }

  return findCurrentLocalAttributions(leadId);
}

async function findCurrentLocalPayoutLedger(attributionId: string) {
  const runtimeRows = await readRuntimePayoutLedger();
  return mergeRowsById([...payoutLedger, ...runtimeRows])
    .filter((row) => row.attribution_id === attributionId)
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
}

async function findCurrentPayoutLedger(attributionId: string, source: LeadSource) {
  if (source === "supabase") {
    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase admin client is unavailable.");
    }

    const { data } = await supabase.from("payout_ledger").select("*").eq("attribution_id", attributionId).order("created_at", { ascending: false });
    return (data ?? []) as PayoutLedger[];
  }

  return findCurrentLocalPayoutLedger(attributionId);
}

async function findCurrentLocalTasks(leadId: string) {
  const runtimeTasks = await readRuntimeTasks();
  return mergeRowsById([...tasks, ...runtimeTasks]).filter((task) => task.lead_id === leadId);
}

async function findCurrentLocalVisitBookings(leadId: string) {
  const runtimeRows = await readRuntimeVisitBookings();
  return mergeRowsById(runtimeRows).filter((row) => row.lead_id === leadId);
}

async function findCurrentLocalConversions(leadId: string) {
  const runtimeRows = await readRuntimeConversions();
  return mergeRowsById(runtimeRows).filter((row) => row.lead_id === leadId);
}

async function findCurrentLocalCommissionLedgers(conversionId: string) {
  const runtimeRows = await readRuntimeCommissionLedgers();
  return mergeRowsById(runtimeRows).filter((row) => row.conversion_id === conversionId);
}

async function findCurrentTasks(leadId: string, source: LeadSource) {
  if (source === "supabase") {
    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase admin client is unavailable.");
    }

    const { data } = await supabase.from("tasks").select("*").eq("lead_id", leadId);
    return ((data ?? []) as Task[]).sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  return findCurrentLocalTasks(leadId);
}

async function findCurrentVisitBookings(leadId: string, source: LeadSource) {
  if (source === "supabase") {
    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase admin client is unavailable.");
    }

    const { data } = await supabase.from("visit_bookings").select("*").eq("lead_id", leadId);
    return ((data ?? []) as VisitBooking[]).sort((left, right) => right.scheduled_for.localeCompare(left.scheduled_for));
  }

  return findCurrentLocalVisitBookings(leadId);
}

async function findCurrentConversions(leadId: string, source: LeadSource) {
  if (source === "supabase") {
    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase admin client is unavailable.");
    }

    const { data } = await supabase.from("conversions").select("*").eq("lead_id", leadId).order("created_at", { ascending: false });
    return (data ?? []) as Conversion[];
  }

  return findCurrentLocalConversions(leadId);
}

async function findCurrentCommissionLedgers(conversionId: string, source: LeadSource) {
  if (source === "supabase") {
    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase admin client is unavailable.");
    }

    const { data } = await supabase.from("commission_ledgers").select("*").eq("conversion_id", conversionId).order("created_at", { ascending: false });
    return (data ?? []) as CommissionLedger[];
  }

  return findCurrentLocalCommissionLedgers(conversionId);
}

async function getBaseLeadEvents(leadId: string, source: LeadSource) {
  if (source === "imported") {
    return (await getLocalImportedLeadDetail(leadId))?.events ?? [];
  }

  return leadEvents.filter((event) => event.lead_id === leadId);
}

async function getCurrentLeadEvents(leadId: string, source: LeadSource) {
  if (source === "supabase") {
    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase admin client is unavailable.");
    }

    const { data } = await supabase.from("lead_events").select("*").eq("lead_id", leadId);
    return (data ?? []) as LeadEvent[];
  }

  const runtimeEvents = await readRuntimeLeadEvents();
  return [...(await getBaseLeadEvents(leadId, source)), ...runtimeEvents.filter((event) => event.lead_id === leadId)];
}

async function getScoredLeadState(args: {
  lead: Lead;
  source: LeadSource;
  appendedEvents?: LeadEvent[];
  appendedPayments?: Payment[];
}) {
  if (args.source === "supabase") {
    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase admin client is unavailable.");
    }

    const [{ data: eventRows }, { data: paymentRows }] = await Promise.all([
      supabase.from("lead_events").select("*").eq("lead_id", args.lead.id),
      supabase.from("payments").select("*").eq("lead_id", args.lead.id),
    ]);

    return applyLeadScoreModel({
      lead: args.lead,
      events: mergeRowsById([...(((eventRows ?? []) as LeadEvent[])), ...(args.appendedEvents ?? [])]),
      payments: mergeRowsById([...(((paymentRows ?? []) as Payment[])), ...(args.appendedPayments ?? [])]),
    }).lead;
  }

  const [eventRows, paymentRows] = await Promise.all([getCurrentLeadEvents(args.lead.id, args.source), findCurrentLocalPayments(args.lead.id)]);

  return applyLeadScoreModel({
    lead: args.lead,
    events: mergeRowsById([...(eventRows ?? []), ...(args.appendedEvents ?? [])]),
    payments: mergeRowsById([...(paymentRows ?? []), ...(args.appendedPayments ?? [])]),
  }).lead;
}

async function findExistingLeadEvent(args: {
  leadId: string;
  source: LeadSource;
  eventType: string;
  payload?: Record<string, unknown>;
}) {
  const eventRows = await getCurrentLeadEvents(args.leadId, args.source);
  return (
    eventRows.find(
      (event) =>
        event.event_type === args.eventType &&
        (!args.payload || matchesEventPayload(event, args.payload)),
    ) ?? null
  );
}

function createWorkflowEvent(args: {
  leadId: string;
  eventType: string;
  eventSource: string;
  payload?: Record<string, unknown>;
}) {
  return {
    id: randomUUID(),
    lead_id: args.leadId,
    event_type: args.eventType,
    event_source: args.eventSource,
    payload: args.payload ?? {},
    created_at: new Date().toISOString(),
  } satisfies LeadEvent;
}

async function ensureOpenTask(args: {
  source: LeadSource;
  leadId: string;
  branchId: string | null;
  taskType: TaskType;
  priority: TaskPriority;
  notes: string;
  assignedTo?: string | null;
  dueAt?: string | null;
}) {
  let existingTasks: Task[] = [];

  if (args.source === "supabase") {
    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase admin client is unavailable.");
    }

    const { data } = await supabase.from("tasks").select("*").eq("lead_id", args.leadId);
    existingTasks = (data ?? []) as Task[];
  } else {
    existingTasks = await findCurrentLocalTasks(args.leadId);
  }

  const existingTask = existingTasks.find(
    (task) => isOpenTask(task) && task.task_type === args.taskType && task.branch_id === args.branchId,
  );

  if (existingTask) {
    return existingTask;
  }

  const task: Task = {
    id: randomUUID(),
    lead_id: args.leadId,
    branch_id: args.branchId,
    assigned_to: args.assignedTo ?? null,
    task_type: args.taskType,
    priority: args.priority,
    due_at: args.dueAt ?? null,
    status: "open",
    notes: args.notes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return persistTask(task, args.source);
}

export async function getLeadWorkflowSnapshot(leadId: string) {
  const leadRecord = await getLeadForWorkflow(leadId);
  if (!leadRecord) {
    return null;
  }

  const form = await findCurrentForm(leadId, leadRecord.source);
  const messageRows = await findCurrentConversations(leadId, leadRecord.source);
  const paymentRows = await findCurrentPayments(leadId, leadRecord.source);
  const eventRows = (await getCurrentLeadEvents(leadId, leadRecord.source)).sort((left, right) =>
    right.created_at.localeCompare(left.created_at),
  );
  const taskRows = await findCurrentTasks(leadId, leadRecord.source);
  const scoredLead = applyLeadScoreModel({
    lead: leadRecord.lead,
    events: eventRows,
    payments: paymentRows,
  }).lead;

  return {
    lead: scoredLead,
    source: leadRecord.source,
    form,
    messages: messageRows,
    payments: paymentRows,
    events: eventRows,
    tasks: taskRows,
  };
}

export async function getPaymentWorkflowSnapshot(paymentId: string) {
  const supabase = createAdminSupabaseClient();

  if (supabase) {
    const { data } = await supabase.from("payments").select("*").eq("id", paymentId).maybeSingle();
    if (!data) {
      return null;
    }

    const leadSnapshot = await getLeadWorkflowSnapshot((data as Payment).lead_id);
    const branch = await getBranchForWorkflow((data as Payment).branch_id);

    return {
      payment: data as Payment,
      lead: leadSnapshot?.lead ?? null,
      branch,
    };
  }

  const runtimePayments = await readRuntimePayments();
  const payment = [...payments, ...runtimePayments].find((row) => row.id === paymentId) ?? null;

  if (!payment) {
    return null;
  }

  const leadSnapshot = await getLeadWorkflowSnapshot(payment.lead_id);
  const branch = await getBranchForWorkflow(payment.branch_id);

  return {
    payment,
    lead: leadSnapshot?.lead ?? null,
    branch,
  };
}

async function persistLeadEventAndState(args: { lead: Lead; event: LeadEvent; source: LeadSource }) {
  const scoredLead = await getScoredLeadState({
    lead: args.lead,
    source: args.source,
    appendedEvents: [args.event],
  });

  if (args.source === "supabase") {
    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase admin client is unavailable.");
    }

    const { error: leadError } = await supabase.from("leads" as never).update(scoredLead as never).eq("id", args.lead.id);
    if (leadError) {
      throw new Error(leadError.message);
    }

    const { error: eventError } = await supabase.from("lead_events" as never).insert(args.event as never);
    if (eventError) {
      throw new Error(eventError.message);
    }

    return;
  }

  await persistLocalLead(scoredLead);
  await persistLocalEvent(args.event);

  return scoredLead;
}

async function persistForm(form: AdmissionForm, source: LeadSource) {
  if (source === "supabase") {
    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase admin client is unavailable.");
    }

    const { error } = await supabase.from("admission_forms" as never).upsert(form as never);
    if (error) {
      throw new Error(error.message);
    }

    return form;
  }

  return upsertRuntimeAdmissionForm(form);
}

async function persistPayment(payment: Payment, source: LeadSource) {
  if (source === "supabase") {
    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase admin client is unavailable.");
    }

    const { error } = await supabase.from("payments" as never).upsert(payment as never);
    if (error) {
      throw new Error(error.message);
    }

    return payment;
  }

  return upsertRuntimePayment(payment);
}

async function persistTask(task: Task, source: LeadSource) {
  if (source === "supabase") {
    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase admin client is unavailable.");
    }

    const { error } = await supabase.from("tasks" as never).upsert(task as never);
    if (error) {
      throw new Error(error.message);
    }

    return task;
  }

  return upsertRuntimeTask(task);
}

async function persistVisitBooking(booking: VisitBooking, source: LeadSource) {
  if (source === "supabase") {
    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase admin client is unavailable.");
    }

    const { error } = await supabase.from("visit_bookings" as never).upsert(booking as never);
    if (error) {
      throw new Error(error.message);
    }

    return booking;
  }

  return upsertRuntimeVisitBooking(booking);
}

async function persistConversion(conversion: Conversion, source: LeadSource) {
  if (source === "supabase") {
    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase admin client is unavailable.");
    }

    const { error } = await supabase.from("conversions" as never).upsert(conversion as never);
    if (error) {
      throw new Error(error.message);
    }

    return conversion;
  }

  return upsertRuntimeConversion(conversion);
}

async function persistCommissionLedger(entry: CommissionLedger, source: LeadSource) {
  if (source === "supabase") {
    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase admin client is unavailable.");
    }

    const { error } = await supabase.from("commission_ledgers" as never).upsert(entry as never);
    if (error) {
      throw new Error(error.message);
    }

    return entry;
  }

  return upsertRuntimeCommissionLedger(entry);
}

async function persistConversation(conversation: Conversation, source: LeadSource) {
  if (source === "supabase") {
    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase admin client is unavailable.");
    }

    const { error } = await supabase.from("conversations" as never).upsert(conversation as never);
    if (error) {
      throw new Error(error.message);
    }

    return conversation;
  }

  return upsertRuntimeConversation(conversation);
}

async function persistCampaign(campaign: Campaign, source: LeadSource) {
  if (source === "supabase") {
    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase admin client is unavailable.");
    }

    const { error } = await supabase.from("campaigns" as never).upsert(campaign as never);
    if (error) {
      throw new Error(error.message);
    }

    return campaign;
  }

  return upsertRuntimeCampaign(campaign);
}

async function persistAttribution(attribution: AdmissionAttribution, source: LeadSource) {
  if (source === "supabase") {
    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase admin client is unavailable.");
    }

    const { error } = await supabase.from("admission_attributions" as never).upsert(attribution as never);
    if (error) {
      throw new Error(error.message);
    }

    return attribution;
  }

  return upsertRuntimeAdmissionAttribution(attribution);
}

async function persistPayoutEntry(entry: PayoutLedger, source: LeadSource) {
  if (source === "supabase") {
    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase admin client is unavailable.");
    }

    const { error } = await supabase.from("payout_ledger" as never).upsert(entry as never);
    if (error) {
      throw new Error(error.message);
    }

    return entry;
  }

  return upsertRuntimePayoutLedger(entry);
}

export async function findLeadByPhone(phone: string): Promise<{ lead: Lead; source: LeadSource } | null> {
  const normalizedPhone = normalizePhoneNumber(phone);
  if (!normalizedPhone) {
    return null;
  }

  const supabase = createAdminSupabaseClient();

  if (supabase) {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .or(`parent_phone.eq.${normalizedPhone},student_phone.eq.${normalizedPhone}`)
      .limit(1);

    const lead = ((data ?? [])[0] as Lead | undefined) ?? null;
    if (lead) {
      return { lead, source: "supabase" };
    }
  }

  const fixtureLead = leads
    .map((lead) => {
      const override = getLeadPhoneCandidates(lead);
      return override.includes(getComparablePhone(normalizedPhone) ?? "") ? lead : null;
    })
    .find(Boolean);

  if (fixtureLead) {
    const override = await getRuntimeLeadOverride(fixtureLead.id);
    return { lead: { ...fixtureLead, ...(override ?? {}) }, source: "fixture" };
  }

  const imported = await findLocalImportedLeadByPhone(normalizedPhone);
  if (imported) {
    return { lead: imported.lead, source: "imported" };
  }

  return null;
}

export async function persistLeadWorkflowUpdate(args: {
  leadId: string;
  leadPatch?: Partial<Lead>;
  eventType: string;
  eventSource: string;
  payload?: Record<string, unknown>;
}) {
  const leadRecord = await getLeadForWorkflow(args.leadId);
  if (!leadRecord) {
    throw new Error("Lead not found.");
  }

  const event = createWorkflowEvent({
    leadId: args.leadId,
    eventType: args.eventType,
    eventSource: args.eventSource,
    payload: args.payload,
  });

  const lead = await persistLeadEventAndState({
    lead: {
      ...leadRecord.lead,
      ...(args.leadPatch ?? {}),
      updated_at: new Date().toISOString(),
    },
    event,
    source: leadRecord.source,
  });

  return {
    lead: lead ?? leadRecord.lead,
    source: leadRecord.source,
    event,
  };
}

export async function recordLeadConversation(args: {
  leadId: string;
  channel?: Conversation["channel"];
  direction: ConversationDirection;
  messageType: ConversationMessageType;
  providerMessageId?: string | null;
  messageBody?: string | null;
  mediaUrl?: string | null;
  templateName?: string | null;
  deliveryStatus?: ConversationDeliveryStatus;
}) {
  const leadRecord = await getLeadForWorkflow(args.leadId);
  if (!leadRecord) {
    throw new Error("Lead not found.");
  }

  const conversation: Conversation = {
    id: randomUUID(),
    lead_id: args.leadId,
    channel: args.channel ?? "whatsapp",
    direction: args.direction,
    message_type: args.messageType,
    provider_message_id: args.providerMessageId ?? null,
    message_body: args.messageBody ?? null,
    media_url: args.mediaUrl ?? null,
    template_name: args.templateName ?? null,
    delivery_status: args.deliveryStatus ?? (args.direction === "outbound" ? "sent" : "received"),
    created_at: new Date().toISOString(),
  };

  await persistConversation(conversation, leadRecord.source);
  return {
    conversation,
    source: leadRecord.source,
    lead: leadRecord.lead,
  };
}

export async function updateConversationDeliveryStatus(args: {
  providerMessageId: string;
  status: ConversationDeliveryStatus;
}) {
  const supabase = createAdminSupabaseClient();

  if (supabase) {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .eq("provider_message_id", args.providerMessageId)
      .limit(1);

    const matched = ((data ?? [])[0] as Conversation | undefined) ?? null;
    if (!matched) {
      return null;
    }

    const nextRow: Conversation = {
      ...matched,
      delivery_status: args.status,
    };

    await persistConversation(nextRow, "supabase");
    return nextRow;
  }

  const runtimeRows = await readRuntimeConversations();
  const matched =
    [...conversations, ...runtimeRows].find((row) => row.provider_message_id === args.providerMessageId) ?? null;

  if (!matched) {
    return null;
  }

  const nextRow: Conversation = {
    ...matched,
    delivery_status: args.status,
  };

  await persistConversation(nextRow, "fixture");
  return nextRow;
}

export async function createCampaignRecord(args: {
  name: string;
  sourceBatch?: string | null;
  templateName: string;
  targetCount: number;
}) {
  const source: LeadSource = createAdminSupabaseClient() ? "supabase" : "fixture";
  const now = new Date().toISOString();
  const campaign: Campaign = {
    id: randomUUID(),
    name: args.name,
    source_batch: args.sourceBatch ?? null,
    template_name: args.templateName,
    target_count: args.targetCount,
    sent_count: 0,
    reply_count: 0,
    qualified_count: 0,
    payment_count: 0,
    admission_count: 0,
    status: "draft",
    created_at: now,
    updated_at: now,
  };

  return persistCampaign(campaign, source);
}

function getLeadBranchAndInstitution(lead: Lead) {
  const branchId = lead.assigned_branch_id ?? lead.preferred_branch_id ?? null;
  const branch = branchId ? branches.find((item) => item.id === branchId) ?? null : null;
  const institutionId = branch?.institution_id ?? null;
  return { branch, branchId, institutionId };
}

function getCommissionRuleForLead(args: { institutionId: string; branchId: string | null; courseCode?: string | null }) {
  const branchSpecific =
    commissionRules.find(
      (rule) =>
        rule.institution_id === args.institutionId &&
        rule.branch_id === args.branchId &&
        (!rule.course_code || rule.course_code === args.courseCode),
    ) ?? null;

  if (branchSpecific) {
    return branchSpecific;
  }

  const courseSpecific =
    commissionRules.find(
      (rule) =>
        rule.institution_id === args.institutionId &&
        rule.branch_id === null &&
        Boolean(rule.course_code) &&
        rule.course_code === args.courseCode,
    ) ?? null;

  if (courseSpecific) {
    return courseSpecific;
  }

  return commissionRules.find((rule) => rule.institution_id === args.institutionId && rule.branch_id === null) ?? null;
}

export async function ensureLeadAttribution(args: {
  leadId: string;
  status: AdmissionAttribution["status"];
  campaignId?: string | null;
  sourceChannel?: string | null;
  referralName?: string | null;
  referralPhone?: string | null;
}) {
  const leadRecord = await getLeadForWorkflow(args.leadId);
  if (!leadRecord) {
    throw new Error("Lead not found.");
  }

  const { branch, branchId, institutionId } = getLeadBranchAndInstitution(leadRecord.lead);
  if (!institutionId) {
    return null;
  }

  const existing = (await findCurrentAttributions(args.leadId, leadRecord.source))[0] ?? null;
  const now = new Date().toISOString();
  const attribution: AdmissionAttribution = {
    id: existing?.id ?? randomUUID(),
    lead_id: args.leadId,
    institution_id: institutionId,
    branch_id: branchId,
    source_campaign_id: args.campaignId ?? existing?.source_campaign_id ?? null,
    source_channel: args.sourceChannel ?? existing?.source_channel ?? "whatsapp",
    attribution_code: existing?.attribution_code ?? `ATTR-${args.leadId.slice(0, 8).toUpperCase()}`,
    referred_by_name: args.referralName ?? existing?.referred_by_name ?? "Admissions Desk",
    referral_phone: args.referralPhone ?? existing?.referral_phone ?? users.find((user) => user.role === "operations")?.phone ?? null,
    status: args.status,
    joined_at:
      ["admission_confirmed", "commission_eligible"].includes(args.status) ? existing?.joined_at ?? now : existing?.joined_at ?? null,
    confirmed_at: args.status === "commission_eligible" ? now : existing?.confirmed_at ?? null,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };

  await persistAttribution(attribution, leadRecord.source);

  if (args.status === "commission_eligible") {
    const commissionRule = getCommissionRuleForLead({
      institutionId,
      branchId,
      courseCode: leadRecord.lead.course_interest,
    });

    if (commissionRule) {
      const existingPayout = (await findCurrentPayoutLedger(attribution.id, leadRecord.source))[0] ?? null;
      const dueAt = new Date(Date.now() + commissionRule.payout_days * 24 * 60 * 60 * 1000).toISOString();
      const payoutEntry: PayoutLedger = {
        id: existingPayout?.id ?? randomUUID(),
        attribution_id: attribution.id,
        institution_id: institutionId,
        branch_id: branchId,
        commission_rule_id: commissionRule.id,
        gross_amount: commissionRule.payout_amount,
        net_amount: commissionRule.payout_amount,
        currency: commissionRule.currency,
        status: existingPayout?.status ?? "pending",
        due_at: existingPayout?.due_at ?? dueAt,
        paid_at: existingPayout?.paid_at ?? null,
        external_reference: existingPayout?.external_reference ?? null,
        notes:
          existingPayout?.notes ??
          `Awaiting ${branch?.name ?? institutions.find((item) => item.id === institutionId)?.name ?? "partner"} settlement.`,
        created_at: existingPayout?.created_at ?? now,
        updated_at: now,
      };

      await persistPayoutEntry(payoutEntry, leadRecord.source);
    }
  }

  return attribution;
}

async function ensureConversionRecord(args: {
  lead: Lead;
  source: LeadSource;
  branchId: string;
  paymentId?: string | null;
  joinedStatus?: Conversion["joined_status"];
  notes?: string | null;
}) {
  const existing = (await findCurrentConversions(args.lead.id, args.source))[0] ?? null;
  const now = new Date().toISOString();
  const conversion: Conversion = {
    id: existing?.id ?? randomUUID(),
    lead_id: args.lead.id,
    branch_id: args.branchId,
    program_id: existing?.program_id ?? null,
    admission_form_id: existing?.admission_form_id ?? null,
    payment_order_id: args.paymentId ?? existing?.payment_order_id ?? null,
    joined_status: args.joinedStatus ?? existing?.joined_status ?? "pending",
    joined_at: args.joinedStatus === "confirmed" ? existing?.joined_at ?? now : existing?.joined_at ?? null,
    verified_by: existing?.verified_by ?? users.find((user) => user.role === "admin")?.id ?? null,
    notes: args.notes ?? existing?.notes ?? null,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };

  return persistConversion(conversion, args.source);
}

async function ensureCommissionLedgerForConversion(args: {
  conversion: Conversion;
  lead: Lead;
  source: LeadSource;
}) {
  const { branch, institutionId } = getLeadBranchAndInstitution(args.lead);
  if (!institutionId) {
    return null;
  }

  const rule = getCommissionRuleForLead({
    institutionId,
    branchId: branch?.id ?? null,
    courseCode: args.lead.course_interest,
  });
  const existing = (await findCurrentCommissionLedgers(args.conversion.id, args.source))[0] ?? null;
  const now = new Date().toISOString();

  const entry: CommissionLedger = {
    id: existing?.id ?? randomUUID(),
    conversion_id: args.conversion.id,
    commission_rule_id: rule?.id ?? null,
    expected_amount: rule?.payout_amount ?? existing?.expected_amount ?? 0,
    payout_status: args.conversion.joined_status === "confirmed" ? "ready" : existing?.payout_status ?? "not_ready",
    payout_due_date:
      args.conversion.joined_status === "confirmed" && rule
        ? existing?.payout_due_date ?? new Date(Date.now() + rule.payout_days * 24 * 60 * 60 * 1000).toISOString()
        : existing?.payout_due_date ?? null,
    payout_received_at: existing?.payout_received_at ?? null,
    notes:
      existing?.notes ??
      (args.conversion.joined_status === "confirmed"
        ? "Ready to invoice the partner institution."
        : "Waiting for payout readiness conditions."),
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };

  return persistCommissionLedger(entry, args.source);
}

export async function markLeadContacted(args: {
  leadId: string;
  campaignId?: string | null;
  templateName?: string | null;
  providerMessageId?: string | null;
  messageBody?: string | null;
}) {
  const leadRecord = await getLeadForWorkflow(args.leadId);
  if (!leadRecord) {
    throw new Error("Lead not found.");
  }

  await recordLeadConversation({
    leadId: args.leadId,
    direction: "outbound",
    messageType: args.templateName ? "template" : "text",
    providerMessageId: args.providerMessageId ?? null,
    messageBody: args.messageBody ?? null,
    templateName: args.templateName ?? null,
    deliveryStatus: "sent",
  });

  const nextStage = leadRecord.lead.stage === "imported" ? "contacted" : leadRecord.lead.stage;
  const result = await persistLeadWorkflowUpdate({
    leadId: args.leadId,
    leadPatch: {
      stage: nextStage,
      last_outgoing_at: new Date().toISOString(),
    },
    eventType: "campaign_sent",
    eventSource: "whatsapp",
    payload: {
      campaign_id: args.campaignId ?? null,
      template_name: args.templateName ?? null,
      provider_message_id: args.providerMessageId ?? null,
    },
  });

  return result.lead;
}

export async function markLeadReplied(args: {
  leadId: string;
  providerMessageId?: string | null;
  messageBody?: string | null;
  payload?: Record<string, unknown>;
}) {
  const leadRecord = await getLeadForWorkflow(args.leadId);
  if (!leadRecord) {
    throw new Error("Lead not found.");
  }

  await recordLeadConversation({
    leadId: args.leadId,
    direction: "inbound",
    messageType: "text",
    providerMessageId: args.providerMessageId ?? null,
    messageBody: args.messageBody ?? null,
    deliveryStatus: "received",
  });

  const nextStage =
    ["imported", "contacted"].includes(leadRecord.lead.stage) ? "replied" : leadRecord.lead.stage;
  const nextBotState =
    leadRecord.lead.bot_state ??
    (leadRecord.lead.student_name
      ? leadRecord.lead.district
        ? leadRecord.lead.course_interest
          ? "awaiting_hostel"
          : "awaiting_course"
        : "awaiting_district"
      : "awaiting_student_name");

  const result = await persistLeadWorkflowUpdate({
    leadId: args.leadId,
    leadPatch: {
      stage: nextStage,
      last_incoming_at: new Date().toISOString(),
      bot_state: nextBotState,
    },
    eventType: "parent_replied",
    eventSource: "whatsapp",
    payload: {
      provider_message_id: args.providerMessageId ?? null,
      message_body: args.messageBody ?? null,
      ...(args.payload ?? {}),
    },
  });

  return result.lead;
}

export async function ensureBranchViewed(args: { leadId: string; branchId: string }) {
  const leadRecord = await getLeadForWorkflow(args.leadId);
  if (!leadRecord) {
    throw new Error("Lead not found.");
  }

  const branch = await getBranchForWorkflow(args.branchId);
  const existingEvent = await findExistingLeadEvent({
    leadId: args.leadId,
    source: leadRecord.source,
    eventType: "branch_viewed",
    payload: { branch_id: branch.id },
  });

  if (existingEvent) {
    return (await getLeadWorkflowSnapshot(args.leadId))?.lead ?? leadRecord.lead;
  }

  const transitioned = applyLeadTransition({
    lead: leadRecord.lead,
    action: "branch_viewed",
    payload: { branch_id: branch.id, branch_code: branch.code },
    leadPatch: {
      assigned_branch_id: branch.id,
      preferred_branch_id: branch.id,
    },
  });

  const lead = (await persistLeadEventAndState({ ...transitioned, source: leadRecord.source })) ?? transitioned.lead;
  await ensureLeadAttribution({
    leadId: args.leadId,
    status: "branch_selected",
  });
  return lead;
}

export async function ensureFormStarted(args: { leadId: string; branchId: string }) {
  const leadRecord = await getLeadForWorkflow(args.leadId);
  if (!leadRecord) {
    throw new Error("Lead not found.");
  }

  const branch = await getBranchForWorkflow(args.branchId);
  const existingEvent = await findExistingLeadEvent({
    leadId: args.leadId,
    source: leadRecord.source,
    eventType: "form_started",
    payload: { branch_id: branch.id },
  });

  if (existingEvent || ["form_started", "form_submitted", "payment_pending", "seat_locked", "admission_in_progress", "admission_confirmed"].includes(leadRecord.lead.stage)) {
    return (await getLeadWorkflowSnapshot(args.leadId))?.lead ?? leadRecord.lead;
  }

  const transitioned = applyLeadTransition({
    lead: leadRecord.lead,
    action: "form_started",
    payload: { branch_id: branch.id },
    leadPatch: {
      assigned_branch_id: branch.id,
      preferred_branch_id: branch.id,
    },
  });

  return (await persistLeadEventAndState({ ...transitioned, source: leadRecord.source })) ?? transitioned.lead;
}

export async function ensurePaymentPageOpened(paymentId: string) {
  const snapshot = await getPaymentWorkflowSnapshot(paymentId);

  if (!snapshot?.lead) {
    throw new Error("Payment lead could not be resolved.");
  }

  const leadRecord = await getLeadForWorkflow(snapshot.lead.id);
  if (!leadRecord) {
    throw new Error("Lead not found.");
  }

  const existingEvent = await findExistingLeadEvent({
    leadId: snapshot.lead.id,
    source: leadRecord.source,
    eventType: "payment_page_opened",
    payload: { payment_id: paymentId },
  });

  if (existingEvent) {
    return snapshot.lead;
  }

  const event = createWorkflowEvent({
    leadId: snapshot.lead.id,
    eventType: "payment_page_opened",
    eventSource: "payment_page",
    payload: {
      payment_id: paymentId,
      branch_id: snapshot.payment.branch_id,
    },
  });

  return (await persistLeadEventAndState({
    lead: {
      ...leadRecord.lead,
      payment_status: snapshot.payment.status,
      updated_at: new Date().toISOString(),
    },
    event,
    source: leadRecord.source,
  })) ?? leadRecord.lead;
}

export async function requestCounselorCallback(args: { leadId: string; branchId: string; notes?: string | null }) {
  const leadRecord = await getLeadForWorkflow(args.leadId);
  if (!leadRecord) {
    throw new Error("Lead not found.");
  }

  const branch = await getBranchForWorkflow(args.branchId);
  const existingTask = await ensureOpenTask({
    source: leadRecord.source,
    leadId: args.leadId,
    branchId: branch.id,
    taskType: "callback",
    priority: "urgent",
    notes: args.notes?.trim() || "Parent requested a counselor callback.",
    assignedTo: users.find((user) => user.role === "counselor")?.id ?? null,
    dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  });

  const existingEvent = await findExistingLeadEvent({
    leadId: args.leadId,
    source: leadRecord.source,
    eventType: "callback_requested",
    payload: { branch_id: branch.id },
  });

  if (existingEvent) {
    return {
      lead: (await getLeadWorkflowSnapshot(args.leadId))?.lead ?? leadRecord.lead,
      task: existingTask,
      idempotent: true,
    };
  }

  const transitioned = applyLeadTransition({
    lead: leadRecord.lead,
    action: "callback_requested",
    payload: {
      branch_id: branch.id,
      notes: args.notes ?? null,
      task_id: existingTask.id,
    },
    leadPatch: {
      assigned_branch_id: branch.id,
      preferred_branch_id: branch.id,
    },
  });

  const lead = await persistLeadEventAndState({ ...transitioned, source: leadRecord.source });
  await ensureLeadAttribution({
    leadId: args.leadId,
    status: "branch_selected",
  });

  return {
    lead: lead ?? transitioned.lead,
    task: existingTask,
    idempotent: false,
  };
}

export async function requestCampusVisit(args: { leadId: string; branchId: string; preferredSlot: string }) {
  const leadRecord = await getLeadForWorkflow(args.leadId);
  if (!leadRecord) {
    throw new Error("Lead not found.");
  }

  const branch = await getBranchForWorkflow(args.branchId);
  const existingTask = await ensureOpenTask({
    source: leadRecord.source,
    leadId: args.leadId,
    branchId: branch.id,
    taskType: "visit",
    priority: "high",
    notes: `Preferred visit slot: ${args.preferredSlot}`,
    assignedTo: users.find((user) => user.role === "operations")?.id ?? null,
    dueAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
  });

  const existingEvent = await findExistingLeadEvent({
    leadId: args.leadId,
    source: leadRecord.source,
    eventType: "visit_requested",
    payload: { branch_id: branch.id, preferred_slot: args.preferredSlot },
  });

  const existingVisit = (await findCurrentVisitBookings(args.leadId, leadRecord.source)).find(
    (booking) => booking.branch_id === branch.id && ["proposed", "confirmed"].includes(booking.status),
  );

  const visitBooking =
    existingVisit ??
    (await persistVisitBooking(
      {
        id: randomUUID(),
        lead_id: args.leadId,
        branch_id: branch.id,
        scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        attendee_count: 2,
        notes: `Preferred visit slot: ${args.preferredSlot}`,
        status: "proposed",
        outcome_status: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      leadRecord.source,
    ));

  if (existingEvent) {
    return {
      lead: (await getLeadWorkflowSnapshot(args.leadId))?.lead ?? leadRecord.lead,
      task: existingTask,
      idempotent: true,
    };
  }

  const transitioned = applyLeadTransition({
    lead: leadRecord.lead,
    action: "visit_requested",
    payload: {
      branch_id: branch.id,
      preferred_slot: args.preferredSlot,
      task_id: existingTask.id,
      visit_booking_id: visitBooking.id,
    },
    leadPatch: {
      assigned_branch_id: branch.id,
      preferred_branch_id: branch.id,
    },
  });

  const lead = await persistLeadEventAndState({ ...transitioned, source: leadRecord.source });
  await ensureLeadAttribution({
    leadId: args.leadId,
    status: "branch_selected",
  });

  return {
    lead: lead ?? transitioned.lead,
    task: existingTask,
    idempotent: false,
  };
}

export async function markLeadCalled(args: { leadId: string; notes?: string | null }) {
  const leadRecord = await getLeadForWorkflow(args.leadId);
  if (!leadRecord) {
    throw new Error("Lead not found.");
  }

  const now = new Date().toISOString();
  const event = createWorkflowEvent({
    leadId: args.leadId,
    eventType: "lead_called",
    eventSource: "dashboard",
    payload: {
      notes: args.notes ?? null,
    },
  });

  const lead = await persistLeadEventAndState({
    lead: {
      ...leadRecord.lead,
      last_human_contact_at: now,
      updated_at: now,
    },
    event,
    source: leadRecord.source,
  });

  return lead ?? leadRecord.lead;
}

export async function createManualTask(args: {
  leadId: string;
  branchId?: string | null;
  assignedTo?: string | null;
  taskType: TaskType;
  priority: TaskPriority;
  dueAt?: string | null;
  notes: string;
}) {
  const leadRecord = await getLeadForWorkflow(args.leadId);
  if (!leadRecord) {
    throw new Error("Lead not found.");
  }

  const task = await persistTask(
    {
      id: randomUUID(),
      lead_id: args.leadId,
      branch_id: args.branchId ?? leadRecord.lead.assigned_branch_id ?? null,
      assigned_to: args.assignedTo ?? null,
      task_type: args.taskType,
      priority: args.priority,
      due_at: args.dueAt ?? null,
      status: "open",
      notes: args.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    leadRecord.source,
  );

  const event = createWorkflowEvent({
    leadId: args.leadId,
    eventType: "task_created",
    eventSource: "dashboard",
    payload: {
      task_id: task.id,
      task_type: task.task_type,
      priority: task.priority,
    },
  });

  const lead = await persistLeadEventAndState({
    lead: {
      ...leadRecord.lead,
      updated_at: new Date().toISOString(),
    },
    event,
    source: leadRecord.source,
  });

  return {
    lead: lead ?? leadRecord.lead,
    task,
  };
}

export async function assignLeadOwner(args: { leadId: string; ownerUserId: string | null }) {
  const leadRecord = await getLeadForWorkflow(args.leadId);
  if (!leadRecord) {
    throw new Error("Lead not found.");
  }

  const event = createWorkflowEvent({
    leadId: args.leadId,
    eventType: "owner_assigned",
    eventSource: "dashboard",
    payload: {
      owner_user_id: args.ownerUserId,
    },
  });

  return (
    (await persistLeadEventAndState({
      lead: {
        ...leadRecord.lead,
        owner_user_id: args.ownerUserId,
        updated_at: new Date().toISOString(),
      },
      event,
      source: leadRecord.source,
    })) ?? leadRecord.lead
  );
}

export async function setLeadOutcome(args: { leadId: string; outcome: "won" | "lost" }) {
  const leadRecord = await getLeadForWorkflow(args.leadId);
  if (!leadRecord) {
    throw new Error("Lead not found.");
  }

  const nextStage = args.outcome === "won" ? "admission_confirmed" : "lost";
  const nextStatus: LeadStatus = args.outcome === "won" ? "won" : "lost";
  const event = createWorkflowEvent({
    leadId: args.leadId,
    eventType: args.outcome === "won" ? "lead_won" : "lead_lost",
    eventSource: "dashboard",
  });

  const lead =
    (await persistLeadEventAndState({
      lead: {
        ...leadRecord.lead,
        stage: nextStage,
        status: nextStatus,
        admission_status: args.outcome === "won" ? "confirmed" : "lost",
        updated_at: new Date().toISOString(),
      },
      event,
      source: leadRecord.source,
    })) ?? leadRecord.lead;

  await ensureLeadAttribution({
    leadId: args.leadId,
    status: args.outcome === "won" ? "commission_eligible" : "cancelled",
  });

  if (lead.assigned_branch_id) {
    const conversion = await ensureConversionRecord({
      lead,
      source: leadRecord.source,
      branchId: lead.assigned_branch_id,
      joinedStatus: args.outcome === "won" ? "confirmed" : "dropped",
      notes: args.outcome === "won" ? "Marked won from the dashboard." : "Marked lost from the dashboard.",
    });

    await ensureCommissionLedgerForConversion({
      conversion,
      lead,
      source: leadRecord.source,
    });
  }

  return lead;
}

export async function submitAdmissionForm(input: AdmissionFormInput) {
  const leadRecord = await getLeadForWorkflow(input.leadId);
  if (!leadRecord) {
    throw new Error("Lead not found.");
  }

  const branch = await getBranchForWorkflow(input.branchId);
  const startedLead = await ensureFormStarted({
    leadId: input.leadId,
    branchId: branch.id,
  });
  const formId = (await findCurrentLocalForm(input.leadId))?.id ?? randomUUID();
  const now = new Date().toISOString();

  const form: AdmissionForm = {
    id: formId,
    lead_id: input.leadId,
    branch_id: branch.id,
    student_name: input.studentName,
    father_name: input.fatherName ?? null,
    mother_name: input.motherName ?? null,
    parent_phone: input.parentPhone,
    student_phone: input.studentPhone ?? null,
    address: input.address,
    district: input.district,
    course_selected: input.courseSelected,
    hostel_required: input.hostelRequired,
    marks_10th: input.marks10th ?? null,
    documents: [{ label: "10th memo", status: "pending" }, { label: "Aadhaar copy", status: "pending" }],
    submission_status: "submitted",
    created_at: now,
    updated_at: now,
  };

  const submitted = applyLeadTransition({
    lead: startedLead,
    action: "form_submitted",
    payload: { branch_id: branch.id, course_selected: input.courseSelected },
    leadPatch: {
      assigned_branch_id: branch.id,
      preferred_branch_id: branch.id,
      course_interest: input.courseSelected,
      district: input.district,
      hostel_required: input.hostelRequired,
      parent_phone: input.parentPhone,
      student_phone: input.studentPhone ?? startedLead.student_phone,
      student_name: input.studentName,
      marks_10th: input.marks10th ?? startedLead.marks_10th,
    },
  });

  const submittedLead = (await persistLeadEventAndState({ ...submitted, source: leadRecord.source })) ?? submitted.lead;
  await persistForm(form, leadRecord.source);
  await ensureOpenTask({
    source: leadRecord.source,
    leadId: input.leadId,
    branchId: branch.id,
    taskType: "document_followup",
    priority: "high",
    dueAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    notes: "Admission form submitted. Verify documents and move the lead to payment.",
    assignedTo: users.find((user) => user.role === "operations")?.id ?? null,
  });
  await ensureLeadAttribution({
    leadId: input.leadId,
    status: "form_submitted",
  });

  const paymentResult = await createSeatLockPayment({
    lead: submittedLead,
    branch,
    source: leadRecord.source,
  });

  return {
    lead: paymentResult.lead,
    form,
    payment: paymentResult.payment,
    checkout_url: paymentResult.checkout_url,
  };
}

export async function createSeatLockPayment(args: { lead: Lead; branch: Branch; source: LeadSource; amount?: number }) {
  const existingPayment = (await findCurrentLocalPayments(args.lead.id)).find((payment) =>
    payment.branch_id === args.branch.id && ["created", "pending"].includes(payment.status),
  );

  if (existingPayment) {
    let lead = args.lead;

    if (lead.stage !== "payment_pending") {
      const transitioned = applyLeadTransition({
        lead,
        action: "payment_link_created",
        payload: {
          payment_id: existingPayment.id,
          gateway_link_id: existingPayment.gateway_link_id,
          amount: existingPayment.amount,
          branch_id: args.branch.id,
        },
        leadPatch: {
          assigned_branch_id: args.branch.id,
          preferred_branch_id: args.branch.id,
          seat_lock_amount: existingPayment.amount,
          payment_status: "pending",
        },
      });

      lead = (await persistLeadEventAndState({ ...transitioned, source: args.source })) ?? transitioned.lead;
    }

    return {
      lead,
      payment: existingPayment,
      checkout_url:
        `${existingPayment.webhook_payload.checkout_url ?? ""}` ||
        buildPaymentStub({ leadId: args.lead.id, branch: args.branch }).checkout_url,
    };
  }

  const settings = await getCommunicationSettings(args.lead.organization_id ?? undefined);
  const stub = buildPaymentStub({
    leadId: args.lead.id,
    branch: args.branch,
    amount: args.amount ?? settings.default_seat_lock_amount,
  });
  const payment: Payment = {
    ...stub.payment,
    webhook_payload: {
      ...stub.payment.webhook_payload,
      checkout_url: stub.checkout_url,
      branch_code: args.branch.code,
      payment_terms_text: settings.payment_terms_text,
      refund_policy_text: settings.refund_policy_text,
    },
    metadata_json: {
      payment_terms_text: settings.payment_terms_text,
      refund_policy_text: settings.refund_policy_text,
    },
  };

  await persistPayment(payment, args.source);

  const transitioned = applyLeadTransition({
    lead: args.lead,
    action: "payment_link_created",
    payload: {
      payment_id: payment.id,
      gateway_link_id: payment.gateway_link_id,
      amount: payment.amount,
      branch_id: args.branch.id,
    },
    leadPatch: {
      assigned_branch_id: args.branch.id,
      preferred_branch_id: args.branch.id,
      seat_lock_amount: payment.amount,
      payment_status: "pending",
    },
  });

  const transitionedLead = (await persistLeadEventAndState({ ...transitioned, source: args.source })) ?? transitioned.lead;

  return {
    lead: transitionedLead,
    payment,
    checkout_url: stub.checkout_url,
  };
}

function findPaymentMatch(
  paymentRows: Payment[],
  refs: { paymentId?: string | null; gatewayPaymentId?: string | null; gatewayOrderId?: string | null; gatewayLinkId?: string | null },
) {
  return paymentRows.find((payment) =>
    (refs.paymentId && payment.id === refs.paymentId) ||
    (refs.gatewayPaymentId && payment.gateway_payment_id === refs.gatewayPaymentId) ||
    (refs.gatewayOrderId && payment.gateway_order_id === refs.gatewayOrderId) ||
    (refs.gatewayLinkId && payment.gateway_link_id === refs.gatewayLinkId),
  );
}

export async function markPaymentSuccessful(args: {
  paymentId?: string | null;
  gatewayPaymentId?: string | null;
  gatewayOrderId?: string | null;
  gatewayLinkId?: string | null;
  webhookPayload?: Record<string, unknown>;
}) {
  const runtimePayments = await readRuntimePayments();
  const mergedPayments = [...payments, ...runtimePayments];
  const payment = findPaymentMatch(mergedPayments, args);

  if (!payment) {
    throw new Error("Payment record not found.");
  }

  if (payment.status === "paid") {
    return {
      payment,
      lead: (await getLeadForWorkflow(payment.lead_id))?.lead ?? null,
      idempotent: true,
    };
  }

  const leadRecord = await getLeadForWorkflow(payment.lead_id);
  if (!leadRecord) {
    throw new Error("Lead not found for payment.");
  }

  const updatedPayment: Payment = {
    ...payment,
    status: "paid",
    gateway_payment_id: args.gatewayPaymentId ?? payment.gateway_payment_id,
    gateway_order_id: args.gatewayOrderId ?? payment.gateway_order_id,
    gateway_link_id: args.gatewayLinkId ?? payment.gateway_link_id,
    paid_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    webhook_payload: {
      ...payment.webhook_payload,
      ...(args.webhookPayload ?? {}),
    },
  };

  await persistPayment(updatedPayment, leadRecord.source);

  const transitioned = applyLeadTransition({
    lead: leadRecord.lead,
    action: "payment_confirmed",
    payload: {
      payment_id: updatedPayment.id,
      gateway_payment_id: updatedPayment.gateway_payment_id,
      amount: updatedPayment.amount,
    },
    leadPatch: {
      seat_lock_paid: true,
      seat_lock_amount: updatedPayment.amount,
      payment_status: "paid",
      admission_status: "seat_locked",
    },
  });

  const lead = (await persistLeadEventAndState({ ...transitioned, source: leadRecord.source })) ?? transitioned.lead;

  const paymentFollowupTask = await ensureOpenTask({
    source: leadRecord.source,
    leadId: leadRecord.lead.id,
    branchId: updatedPayment.branch_id,
    taskType: "payment_followup",
    priority: "urgent",
    dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    notes: "Seat lock paid. Call parent to confirm documents and next admission steps.",
    assignedTo: users.find((user) => user.role === "operations")?.id ?? null,
  });

  const conversion = await ensureConversionRecord({
    lead,
    source: leadRecord.source,
    branchId: updatedPayment.branch_id,
    paymentId: updatedPayment.id,
    joinedStatus: "pending",
    notes: "Seat-lock paid. Awaiting branch confirmation.",
  });

  await ensureCommissionLedgerForConversion({
    conversion,
    lead,
    source: leadRecord.source,
  });

  return {
    payment: updatedPayment,
    lead,
    task: paymentFollowupTask,
    idempotent: false,
  };
}

export async function handleRazorpayWebhook(payload: Record<string, unknown>) {
  const extracted = extractRazorpayWebhookData(payload);

  if (!["payment.captured", "payment_link.paid", "order.paid"].includes(extracted.event)) {
    return {
      ignored: true,
      event: extracted.event,
    };
  }

  const result = await markPaymentSuccessful({
    gatewayPaymentId: extracted.gateway_payment_id,
    gatewayOrderId: extracted.gateway_order_id,
    gatewayLinkId: extracted.gateway_link_id,
    webhookPayload: payload,
  });

  return {
    ignored: false,
    event: extracted.event,
    result,
  };
}
