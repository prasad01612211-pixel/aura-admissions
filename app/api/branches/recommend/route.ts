import { NextResponse } from "next/server";
import { z } from "zod";

import { recommendationScopeModes } from "@/types/domain";
import { recommendBranches } from "@/lib/branch-matching/recommend";
import { getActiveBranchProfiles } from "@/lib/data/branches";

const requestSchema = z.object({
  pincode: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  locality: z.string().optional().nullable(),
  course_interest: z.string().optional().nullable(),
  hostel_required: z.boolean().optional().nullable(),
  preferred_cluster: z.string().optional().nullable(),
  parent_latitude: z.number().optional().nullable(),
  parent_longitude: z.number().optional().nullable(),
  scope_mode: z.enum(recommendationScopeModes).optional().nullable(),
  limit: z.number().int().positive().max(10).optional(),
});

export async function POST(request: Request) {
  const payload = requestSchema.parse(await request.json());
  const branches = await getActiveBranchProfiles();
  const recommendations = recommendBranches(payload, branches);

  return NextResponse.json({
    count: recommendations.length,
    recommendations,
  });
}
