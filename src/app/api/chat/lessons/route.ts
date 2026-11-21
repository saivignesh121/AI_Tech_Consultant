import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { db } from "@/db";
import { lessons } from "@/db/schema/chat";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const tenant = await getTenantContext();

    const lessonRows = await db
      .select()
      .from(lessons)
      .where(eq(lessons.businessId, tenant.businessId))
      .orderBy(desc(lessons.createdAt));

    // Seed demo lessons if none exist
    if (lessonRows.length === 0) {
      const demoLesson = {
        businessId: tenant.businessId,
        chatMessageId: "11111111-1111-4111-8111-111111111111",
        title: "DNS Cloudflare Orange Cloud Issuance Rule",
        category: "DNS & Networking",
        lessonMarkdown: `# DNS Cloudflare Orange Cloud Issuance Rule\n\n## What Went Wrong\nThe AI consultant recommended keeping Cloudflare Orange Cloud enabled during initial ACME certificate verification.\n\n## Correct Protocol\nTurn OFF Cloudflare proxying (Grey Cloud) until Let's Encrypt certificate challenge succeeds, then re-enable Orange Cloud.`,
        confidenceScore: "0.95",
        status: "approved",
      };

      const [inserted] = await db.insert(lessons).values(demoLesson).returning();
      return NextResponse.json({ lessons: [inserted] });
    }

    return NextResponse.json({ lessons: lessonRows });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch lessons", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const { lessonId, action } = body; // action: 'approve' | 'reject'

    if (!lessonId || !action) {
      return NextResponse.json({ error: "lessonId and action are required" }, { status: 400 });
    }

    await db
      .update(lessons)
      .set({
        status: action === "approve" ? "approved" : "rejected",
        approvedBy: action === "approve" ? tenant.userId : null,
        approvedAt: action === "approve" ? new Date() : null,
      })
      .where(eq(lessons.id, lessonId));

    return NextResponse.json({
      success: true,
      message: `Lesson ${action === "approve" ? "approved and active in chat context" : "rejected"}.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update lesson status", details: String(error) },
      { status: 500 }
    );
  }
}
