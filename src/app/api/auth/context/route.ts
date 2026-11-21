import { NextResponse } from "next/server";
import { getTenantContext, DEMO_BUSINESSES } from "@/lib/auth";
import { db } from "@/db";
import { businesses, memberships } from "@/db/schema/business";
import { eq } from "drizzle-orm";

export async function GET() {
  const currentTenant = await getTenantContext();

  const demoList = Object.values(DEMO_BUSINESSES).map((t) => ({
    businessId: t.businessId,
    businessName: t.businessName,
    businessSlug: t.businessSlug,
    userEmail: t.userEmail,
    userRole: t.userRole,
  }));

  // Also query user's actual memberships if userId is available
  let dynamicList: typeof demoList = [];
  if (currentTenant.userId) {
    try {
      const userBizs = await db
        .select({
          businessId: businesses.id,
          businessName: businesses.name,
          businessSlug: businesses.slug,
          userRole: memberships.role,
        })
        .from(memberships)
        .innerJoin(businesses, eq(memberships.businessId, businesses.id))
        .where(eq(memberships.userId, currentTenant.userId));

      dynamicList = userBizs.map((b) => ({
        businessId: b.businessId,
        businessName: b.businessName,
        businessSlug: b.businessSlug,
        userEmail: currentTenant.userEmail,
        userRole: b.userRole as "owner" | "admin" | "member",
      }));
    } catch {
      // Fall through to demo list
    }
  }

  // Merge unique workspaces
  const mergedMap = new Map<string, typeof demoList[0]>();
  for (const w of [...demoList, ...dynamicList]) {
    mergedMap.set(w.businessId, w);
  }

  return NextResponse.json({
    currentTenant,
    workspaces: Array.from(mergedMap.values()),
  });
}
