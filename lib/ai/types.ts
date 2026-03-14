import type {
  AdmissionForm,
  BranchProfile,
  BranchRecommendation,
  Conversation,
  Lead,
  Payment,
  Task,
} from "@/types/domain";
import type { ObjectionSeverity, OrganizationCommunicationSetting } from "@/types/operations";

export type LeadWorkflowSource = "supabase" | "imported" | "fixture";

export interface WhatsAppAiContext {
  lead: Lead;
  source: LeadWorkflowSource;
  phone: string;
  inboundMessage: string;
  form: AdmissionForm | null;
  recentMessages: Conversation[];
  selectedBranch: BranchProfile | null;
  recommendations: BranchRecommendation[];
  payments: Payment[];
  openTasks: Task[];
  communicationSettings: OrganizationCommunicationSetting;
  objectionSeverity: ObjectionSeverity | null;
}

export interface WhatsAppAiToolTrace {
  name: string;
  arguments: Record<string, unknown>;
  result: Record<string, unknown>;
}

export interface WhatsAppAiMockFunctionCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface WhatsAppAiMockResponse {
  id?: string;
  functionCalls?: WhatsAppAiMockFunctionCall[];
  outputText?: string;
}

export type WhatsAppAiDecision =
  | {
      handled: false;
      reason: string;
      error?: string;
    }
  | {
      handled: true;
      replyText: string;
      eventType: string;
      payload: Record<string, unknown>;
    };

export interface WhatsAppAiContextOverride {
  lead?: Partial<Lead>;
  inboundMessage?: string;
  recentMessages?: Conversation[];
  selectedBranch?: BranchProfile | null;
  recommendations?: BranchRecommendation[];
  payments?: Payment[];
  openTasks?: Task[];
  form?: AdmissionForm | null;
  objectionSeverity?: ObjectionSeverity | null;
}
