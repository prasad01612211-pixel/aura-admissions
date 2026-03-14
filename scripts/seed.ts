import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

import { requireSupabaseAdminEnv } from "../lib/env";
import { seedData } from "../lib/fixtures/demo-data";
import type { Database, TableName } from "../types/database";

config({ path: ".env.local", override: false });
config({ path: ".env", override: false });

const { serviceRoleKey, url } = requireSupabaseAdminEnv();

const supabase = createClient<Database>(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const insertionOrder: Array<{ table: TableName; rows: unknown[] }> = [
  { table: "users", rows: seedData.users },
  { table: "institutions", rows: seedData.institutions },
  { table: "branches", rows: seedData.branches },
  { table: "branch_contacts", rows: seedData.branch_contacts },
  { table: "branch_assets", rows: seedData.branch_assets },
  { table: "branch_trust_assets", rows: seedData.branch_trust_assets },
  { table: "branch_reviews", rows: seedData.branch_reviews },
  { table: "branch_fee_snapshots", rows: seedData.branch_fee_snapshots },
  { table: "seat_inventory_snapshots", rows: seedData.seat_inventory_snapshots },
  { table: "campaigns", rows: seedData.campaigns },
  { table: "commission_rules", rows: seedData.commission_rules },
  { table: "leads", rows: seedData.leads },
  { table: "lead_opt_ins", rows: seedData.lead_opt_ins },
  { table: "admission_attributions", rows: seedData.admission_attributions },
  { table: "conversations", rows: seedData.conversations },
  { table: "admission_forms", rows: seedData.admission_forms },
  { table: "payments", rows: seedData.payments },
  { table: "payout_ledger", rows: seedData.payout_ledger },
  { table: "tasks", rows: seedData.tasks },
  { table: "lead_events", rows: seedData.lead_events },
];

async function upsertTable(table: TableName, rows: unknown[]) {
  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from(table as never).upsert(rows as never, { onConflict: "id" });

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
}

async function main() {
  console.log("Seeding admissions MVP demo data...");

  for (const step of insertionOrder) {
    await upsertTable(step.table, step.rows);
    console.log(`✓ ${step.table}: ${step.rows.length}`);
  }

  console.log("Seed complete.");
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
