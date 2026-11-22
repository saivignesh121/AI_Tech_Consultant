import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import {
  getArchivedKnowledgeBase,
  recoverArchivedPage,
  getChangeHistory,
} from "@/services/brain/freshnessChecker";

export async function GET() {
  try {
    const tenant = await getTenantContext();
    const archivedPages = await getArchivedKnowledgeBase(tenant.businessId);
    const auditLogs = getChangeHistory(tenant.businessId);

    return NextResponse.json({
      success: true,
      archivedPages,
      auditLogs,
      totalArchived: archivedPages.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch archived knowledge base", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const { pageId } = body;

    if (!pageId) {
      return NextResponse.json({ error: "pageId is required to recover a page" }, { status: 400 });
    }

    const res = await recoverArchivedPage(tenant.businessId, pageId);

    return NextResponse.json({
      success: true,
      message: `Page restored to Active in Knowledge Brain. Failure count reset to 0.`,
      page: res.page,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to recover page", details: String(error) },
      { status: 500 }
    );
  }
}
