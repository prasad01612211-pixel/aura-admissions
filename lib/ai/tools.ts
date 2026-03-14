import "server-only";

import { publicEnv } from "@/lib/env";
import {
  createManualTask,
  createSeatLockPayment,
  ensureBranchViewed,
  ensureFormStarted,
  getLeadWorkflowSnapshot,
  persistLeadWorkflowUpdate,
  requestCampusVisit,
  requestCounselorCallback,
} from "@/lib/admission/service";
import { getActiveBranchProfiles } from "@/lib/data/branches";
import type { OpenAiToolDefinition } from "@/lib/ai/client";
import type { WhatsAppAiContext } from "@/lib/ai/types";

function getAppBaseUrl() {
  return publicEnv.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
}

async function resolveBranch(context: WhatsAppAiContext, branchId?: string | null) {
  const targetBranchId = branchId ?? context.selectedBranch?.id ?? null;
  if (!targetBranchId) {
    return null;
  }

  const branchProfiles = await getActiveBranchProfiles();
  return branchProfiles.find((branch) => branch.id === targetBranchId) ?? null;
}

export function getAllowedWhatsAppAiToolNames(context: WhatsAppAiContext) {
  const stage = context.lead.stage;
  const hasBranch = Boolean(context.selectedBranch);
  const hasForm = Boolean(context.form);
  const hasRecommendations = context.recommendations.length > 0;
  const formReadyForPayment =
    Boolean(context.form && ["submitted", "under_review", "approved"].includes(context.form.submission_status)) ||
    ["form_submitted", "payment_pending", "seat_locked", "admission_in_progress"].includes(stage);

  const allowed = new Set<string>(["escalate_to_human", "mark_not_interested"]);

  if (context.recommendations.length > 0) {
    allowed.add("assign_preferred_branch");
  }

  if ((hasBranch || hasRecommendations) && !["lost", "admission_confirmed"].includes(stage)) {
    allowed.add("request_callback");
    allowed.add("request_visit");
  }

  if ((hasBranch || hasRecommendations) && ["branch_shown", "branch_viewed", "callback_requested", "visit_requested"].includes(stage)) {
    allowed.add("start_admission");
  }

  if ((hasBranch || hasRecommendations) && hasForm && formReadyForPayment) {
    allowed.add("get_or_create_payment_link");
  }

  return [...allowed];
}

const allToolDefinitions: OpenAiToolDefinition[] = [
    {
      type: "function",
      name: "assign_preferred_branch",
      description: "Select the branch the parent named from the recommended options before taking the next workflow step.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          lead_id: { type: "string" },
          branch_id: { type: "string" },
        },
        required: ["lead_id", "branch_id"],
      },
    },
    {
      type: "function",
      name: "request_callback",
      description: "Create a callback task for the admissions counselor. Use when the parent explicitly asks to speak with a human.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          lead_id: { type: "string" },
          branch_id: { type: "string" },
          reason: { type: "string" },
        },
        required: ["lead_id", "branch_id"],
      },
    },
    {
      type: "function",
      name: "request_visit",
      description: "Create a campus visit request with the preferred slot. Do not treat the requested slot as already confirmed.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          lead_id: { type: "string" },
          branch_id: { type: "string" },
          preferred_slot: { type: "string" },
        },
        required: ["lead_id", "branch_id", "preferred_slot"],
      },
    },
    {
      type: "function",
      name: "start_admission",
      description: "Start the admission flow and return the admission URL after the parent has chosen a branch and asked for the form link.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          lead_id: { type: "string" },
          branch_id: { type: "string" },
        },
        required: ["lead_id", "branch_id"],
      },
    },
    {
      type: "function",
      name: "get_or_create_payment_link",
      description: "Create or return the seat-lock payment link only when the admission flow is already ready for payment.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          lead_id: { type: "string" },
          branch_id: { type: "string" },
        },
        required: ["lead_id", "branch_id"],
      },
    },
    {
      type: "function",
      name: "escalate_to_human",
      description: "Create a manual follow-up task for counselor or operations.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          lead_id: { type: "string" },
          branch_id: { type: "string" },
          task_type: {
            type: "string",
            enum: ["callback", "visit", "payment_followup", "document_followup", "closure"],
          },
          priority: {
            type: "string",
            enum: ["high", "urgent"],
          },
          notes: { type: "string" },
        },
        required: ["lead_id", "task_type", "priority", "notes"],
      },
    },
    {
      type: "function",
      name: "mark_not_interested",
      description: "Mark the lead as not interested and stop the admissions flow when the parent clearly opts out.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          lead_id: { type: "string" },
          reason: { type: "string" },
        },
        required: ["lead_id"],
      },
    },
  ];

export function getWhatsAppAiToolDefinitions(context: WhatsAppAiContext): OpenAiToolDefinition[] {
  const allowed = new Set(getAllowedWhatsAppAiToolNames(context));
  return allToolDefinitions.filter((tool) => allowed.has(tool.name));
}

export async function executeWhatsAppAiToolCall(args: {
  name: string;
  rawArguments: string;
  context: WhatsAppAiContext;
  dryRun?: boolean;
}) {
  const parsedArgs = JSON.parse(args.rawArguments || "{}") as Record<string, unknown>;
  const allowed = new Set(getAllowedWhatsAppAiToolNames(args.context));
  if (!allowed.has(args.name)) {
    return {
      arguments: parsedArgs,
      result: {
        status: "error",
        message: `Tool ${args.name} is not allowed for the current lead stage.`,
      },
    };
  }

  const leadId = typeof parsedArgs.lead_id === "string" ? parsedArgs.lead_id : args.context.lead.id;
  const branchId = typeof parsedArgs.branch_id === "string" ? parsedArgs.branch_id : args.context.selectedBranch?.id ?? null;
  const dryRun = args.dryRun ?? false;

  switch (args.name) {
    case "assign_preferred_branch": {
      if (!branchId) {
        return {
          arguments: parsedArgs,
          result: { status: "error", message: "No branch could be resolved." },
        };
      }

      if (!dryRun) {
        await persistLeadWorkflowUpdate({
          leadId,
          leadPatch: {
            assigned_branch_id: branchId,
            preferred_branch_id: branchId,
          },
          eventType: "ai_branch_selected",
          eventSource: "ai_bot",
          payload: {
            branch_id: branchId,
          },
        });

        await ensureBranchViewed({
          leadId,
          branchId,
        });
      }

      const branch = await resolveBranch(args.context, branchId);
      args.context.lead.assigned_branch_id = branchId;
      args.context.lead.preferred_branch_id = branchId;
      args.context.selectedBranch = branch;

      return {
        arguments: parsedArgs,
        result: {
          status: "ok",
          branch_id: branchId,
          dry_run: dryRun,
        },
      };
    }
    case "request_callback": {
      if (!branchId) {
        return {
          arguments: parsedArgs,
          result: { status: "error", message: "No branch could be resolved for callback." },
        };
      }

      const result = dryRun
        ? { task: { id: `dryrun-callback-${leadId.slice(0, 8)}` } }
        : await requestCounselorCallback({
            leadId,
            branchId,
            notes: typeof parsedArgs.reason === "string" ? parsedArgs.reason : null,
          });

      return {
        arguments: parsedArgs,
        result: {
          status: "ok",
          task_id: result.task.id,
          branch_id: branchId,
          dry_run: dryRun,
        },
      };
    }
    case "request_visit": {
      if (!branchId) {
        return {
          arguments: parsedArgs,
          result: { status: "error", message: "No branch could be resolved for visit." },
        };
      }

      const result = dryRun
        ? { task: { id: `dryrun-visit-${leadId.slice(0, 8)}` } }
        : await requestCampusVisit({
            leadId,
            branchId,
            preferredSlot: typeof parsedArgs.preferred_slot === "string" ? parsedArgs.preferred_slot : "To be confirmed",
          });

      return {
        arguments: parsedArgs,
        result: {
          status: "ok",
          task_id: result.task.id,
          branch_id: branchId,
          dry_run: dryRun,
        },
      };
    }
    case "start_admission": {
      if (!branchId) {
        return {
          arguments: parsedArgs,
          result: { status: "error", message: "No branch could be resolved for admission start." },
        };
      }

      if (!dryRun) {
        await ensureFormStarted({
          leadId,
          branchId,
        });
      }

      const branch = await resolveBranch(args.context, branchId);
      return {
        arguments: parsedArgs,
        result: {
          status: "ok",
          branch_id: branchId,
          admission_url: branch ? `${getAppBaseUrl()}/admission/${leadId}?branch=${branch.code}` : `${getAppBaseUrl()}/admission/${leadId}`,
          dry_run: dryRun,
        },
      };
    }
    case "get_or_create_payment_link": {
      if (!branchId) {
        return {
          arguments: parsedArgs,
          result: { status: "error", message: "No branch could be resolved for payment." },
        };
      }

      const branch = await resolveBranch(args.context, branchId);
      if (!branch) {
        return {
          arguments: parsedArgs,
          result: { status: "error", message: "Lead or branch snapshot could not be resolved for payment." },
        };
      }

      let paymentResult:
        | {
            payment: { id: string; amount: number; currency: string };
            checkout_url: string;
          }
        | null = null;

      if (dryRun) {
        const amount = args.context.payments[0]?.amount ?? args.context.communicationSettings.default_seat_lock_amount;
        paymentResult = {
          payment: {
            id: `dryrun-payment-${leadId.slice(0, 8)}`,
            amount,
            currency: "INR",
          },
          checkout_url: `${getAppBaseUrl()}/payment/dryrun-${leadId.slice(0, 8)}`,
        };
      } else {
        const snapshot = await getLeadWorkflowSnapshot(leadId);
        if (!snapshot) {
          return {
            arguments: parsedArgs,
            result: { status: "error", message: "Lead snapshot could not be resolved for payment." },
          };
        }

        paymentResult = await createSeatLockPayment({
          lead: snapshot.lead,
          branch,
          source: snapshot.source,
        });
      }

      return {
        arguments: parsedArgs,
        result: {
          status: "ok",
          branch_id: branchId,
          payment_id: paymentResult.payment.id,
          checkout_url: paymentResult.checkout_url,
          amount: paymentResult.payment.amount,
          currency: paymentResult.payment.currency,
          dry_run: dryRun,
        },
      };
    }
    case "escalate_to_human": {
      const taskType =
        typeof parsedArgs.task_type === "string" &&
        ["callback", "visit", "payment_followup", "document_followup", "closure"].includes(parsedArgs.task_type)
          ? parsedArgs.task_type
          : "closure";

      const priority =
        typeof parsedArgs.priority === "string" && ["high", "urgent"].includes(parsedArgs.priority)
          ? parsedArgs.priority
          : "high";

      const task = dryRun
        ? {
            task: {
              id: `dryrun-task-${leadId.slice(0, 8)}`,
            },
          }
        : await createManualTask({
            leadId,
            branchId,
            taskType: taskType as "callback" | "visit" | "payment_followup" | "document_followup" | "closure",
            priority: priority as "high" | "urgent",
            notes: typeof parsedArgs.notes === "string" ? parsedArgs.notes : "AI requested a human follow-up.",
          });

      return {
        arguments: parsedArgs,
        result: {
          status: "ok",
          task_id: task.task.id,
          task_type: taskType,
          priority,
          dry_run: dryRun,
        },
      };
    }
    case "mark_not_interested": {
      if (!dryRun) {
        await persistLeadWorkflowUpdate({
          leadId,
          leadPatch: {
            stage: "lost",
            status: "lost",
          },
          eventType: "lead_lost",
          eventSource: "ai_bot",
          payload: {
            reason: typeof parsedArgs.reason === "string" ? parsedArgs.reason : "parent_opt_out",
          },
        });
      }

      return {
        arguments: parsedArgs,
        result: {
          status: "ok",
          lead_id: leadId,
          dry_run: dryRun,
        },
      };
    }
    default:
      return {
        arguments: parsedArgs,
        result: {
          status: "error",
          message: `Unknown tool: ${args.name}`,
        },
      };
  }
}
