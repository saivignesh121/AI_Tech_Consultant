import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { db } from "@/db";
import { businesses } from "@/db/schema/business";
import { eq } from "drizzle-orm";

/**
 * Task 1.1 / D14: Tenant Account Deletion Protocol
 * Completely wipes all records, embeddings, chunks, and vector rows
 * via cascading foreign keys, guaranteeing zero leakage.
 */
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const { confirmSlug } = body;

    if (confirmSlug !== tenant.businessSlug) {
      return NextResponse.json(
        { error: `Confirmation mismatch. Please type '${tenant.businessSlug}' to confirm deletion.` },
        { status: 400 }
      );
    }

    // Delete business record; database cascading foreign keys wipe all child tables:
    // users, api_connections, prompts, prompt_versions, agent_roles,
    // knowledge_sources, knowledge_pages, knowledge_chunks, chat_sessions,
    // chat_messages, chat_traces, model_call_logs, eval_runs, failed_jobs.
    await db.delete(businesses).where(eq(businesses.id, tenant.businessId));

    const response = NextResponse.json({
      success: true,
      deletedBusinessId: tenant.businessId,
      deletedSlug: tenant.businessSlug,
      message: `Workspace ${tenant.businessName} and all associated data permanently purged.`,
    });

    // Clear active tenant cookie
    response.cookies.delete("active_tenant_slug");

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete tenant", details: String(error) },
      { status: 500 }
    );
  }
}
