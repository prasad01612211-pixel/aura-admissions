export const whatsappTemplateNames = [
  "admissions_intro_v1",
  "admissions_reminder_1",
  "admissions_reminder_2",
  "branch_followup_v1",
  "form_incomplete_v1",
  "payment_pending_v1",
  "callback_confirmation_v1",
  "visit_confirmation_v1",
  "payment_success_v1",
] as const;

export type WhatsAppTemplateName = (typeof whatsappTemplateNames)[number];

export type WhatsAppTemplateVariables = Record<string, string | number | null | undefined>;

function fillTemplate(input: string, variables: WhatsAppTemplateVariables) {
  return input.replace(/{{\s*([\w.]+)\s*}}/g, (_, key: string) => {
    const value = variables[key];
    return value === null || value === undefined ? "" : String(value);
  });
}

const templateBodies: Record<WhatsAppTemplateName, string> = {
  admissions_intro_v1:
    "Namaste {{parent_name}}. This is {{agent_name}} from {{consultancy_name}}. We help parents with Intermediate admissions near {{city}}. Reply YES to see the best options for your child.",
  admissions_reminder_1:
    "Following up on your child’s Intermediate admission support request. Reply YES and we will share suitable branches based on location, course, and hostel need.",
  admissions_reminder_2:
    "We are closing this admission support request soon. Reply YES if you still want help with Intermediate admissions.",
  branch_followup_v1:
    "You viewed {{branch_name}}. Reply COUNSELOR for a call, VISIT to book a campus visit, or APPLY to continue admission.",
  form_incomplete_v1:
    "Your admission form for {{branch_name}} is still incomplete. Reply CALL if you want a counselor to help finish it.",
  payment_pending_v1:
    "Seat-lock payment is still pending for {{student_name}}. Use the official link: {{payment_link}}. Reply CALL if you need help.",
  callback_confirmation_v1:
    "Thank you. {{counselor_name}} will call shortly regarding {{branch_name}}.",
  visit_confirmation_v1:
    "Visit request received for {{branch_name}} on {{visit_slot}}. Our team will confirm the campus visit shortly.",
  payment_success_v1:
    "Payment received successfully for {{student_name}}. Your seat-lock request is recorded. Our team will contact you with the next admission steps.",
};

export function renderWhatsAppTemplate(name: WhatsAppTemplateName, variables: WhatsAppTemplateVariables = {}) {
  return fillTemplate(templateBodies[name], variables);
}

export function getWhatsAppTemplateBody(name: WhatsAppTemplateName) {
  return templateBodies[name];
}
