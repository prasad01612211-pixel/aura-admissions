import "dotenv/config";

import { tryHandleInboundWhatsAppWithAi } from "@/lib/ai/router";
import { isOpenAiConfigured } from "@/lib/env";
import { getScenarioLeadBySourceLeadId, getWhatsAppAiDryRunScenario, whatsappAiDryRunScenarios } from "@/lib/fixtures/ai-whatsapp-scenarios";

type HarnessMode = "offline" | "live";

type ScenarioResult = {
  id: string;
  title: string;
  pass: boolean;
  mode: HarnessMode;
  leadSourceLeadId: string;
  route: string | null;
  tools: string[];
  replyText: string | null;
  errors: string[];
};

function getArgValue(flag: string) {
  const index = process.argv.findIndex((arg) => arg === flag);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] ?? null;
}

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function printScenarioList() {
  whatsappAiDryRunScenarios.forEach((scenario) => {
    console.log(`${scenario.id}\t${scenario.title}\t${scenario.mockResponses ? "offline-ready" : "live-model"}`);
  });
}

async function runScenario(scenarioId: string, mode: HarnessMode): Promise<ScenarioResult> {
  const scenario = getWhatsAppAiDryRunScenario(scenarioId);
  if (!scenario) {
    throw new Error(`Unknown scenario: ${scenarioId}`);
  }

  const lead = getScenarioLeadBySourceLeadId(scenario.leadSourceLeadId);
  const phone = lead.parent_phone ?? lead.student_phone ?? lead.phone ?? null;
  if (!phone) {
    throw new Error(`No phone available for scenario ${scenario.id}`);
  }

  const decision = await tryHandleInboundWhatsAppWithAi({
    leadId: lead.id,
    phone,
    message: scenario.inboundMessage,
    dryRun: true,
    force: true,
    contextOverride: scenario.contextOverride,
    mockResponses: mode === "offline" ? scenario.mockResponses : undefined,
  });

  const route = decision.handled && typeof decision.payload.route === "string" ? decision.payload.route : null;
  const tools =
    decision.handled && Array.isArray(decision.payload.tool_traces)
      ? (decision.payload.tool_traces as Array<{ name?: unknown }>)
          .map((trace) => (typeof trace.name === "string" ? trace.name : "unknown"))
          .filter(Boolean)
      : [];

  const errors: string[] = [];

  if (!decision.handled) {
    errors.push(`AI did not handle the scenario (${decision.reason}${decision.error ? `: ${decision.error}` : ""}).`);
  }

  if (route !== scenario.expectedRoute) {
    errors.push(`Expected route ${scenario.expectedRoute} but got ${route ?? "unhandled"}.`);
  }

  for (const expectedTool of scenario.expectedTools ?? []) {
    if (!tools.includes(expectedTool)) {
      errors.push(`Expected tool ${expectedTool} was not called.`);
    }
  }

  for (const forbiddenTool of scenario.forbiddenTools ?? []) {
    if (tools.includes(forbiddenTool)) {
      errors.push(`Forbidden tool ${forbiddenTool} was called.`);
    }
  }

  return {
    id: scenario.id,
    title: scenario.title,
    pass: errors.length === 0,
    mode,
    leadSourceLeadId: scenario.leadSourceLeadId,
    route,
    tools,
    replyText: decision.handled ? decision.replyText : null,
    errors,
  };
}

async function main() {
  if (hasFlag("--list")) {
    printScenarioList();
    return;
  }

  const scenarioArg = getArgValue("--scenario");
  const requestedLive = hasFlag("--live");
  const json = hasFlag("--json");
  const mode: HarnessMode = requestedLive ? "live" : isOpenAiConfigured ? "live" : "offline";

  if (mode === "live" && !isOpenAiConfigured) {
    throw new Error("A valid OPENAI_API_KEY is required for --live mode.");
  }

  const scenarioIds = scenarioArg ? [scenarioArg] : whatsappAiDryRunScenarios.map((scenario) => scenario.id);

  const results: ScenarioResult[] = [];
  for (const scenarioId of scenarioIds) {
    results.push(await runScenario(scenarioId, mode));
  }

  if (json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(`Mode: ${mode}`);
    results.forEach((result) => {
      console.log(`\n[${result.pass ? "PASS" : "FAIL"}] ${result.id} - ${result.title}`);
      console.log(`Lead: ${result.leadSourceLeadId}`);
      console.log(`Route: ${result.route ?? "unhandled"}`);
      console.log(`Tools: ${result.tools.join(", ") || "none"}`);
      if (result.replyText) {
        console.log(`Reply: ${result.replyText}`);
      }
      if (result.errors.length > 0) {
        result.errors.forEach((error) => console.log(`Error: ${error}`));
      }
    });

    const passed = results.filter((result) => result.pass).length;
    console.log(`\nSummary: ${passed}/${results.length} scenarios passed.`);
  }

  if (results.some((result) => !result.pass)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "AI dry-run failed.");
  process.exitCode = 1;
});
