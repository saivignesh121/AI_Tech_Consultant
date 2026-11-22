import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { db } from "@/db";
import { emailThreads, emailMessages } from "@/db/schema/knowledge";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  try {
    const tenant = await getTenantContext();

    let threads = await db
      .select()
      .from(emailThreads)
      .where(eq(emailThreads.businessId, tenant.businessId))
      .orderBy(desc(emailThreads.syncedAt));

    // Seed realistic past email threads if empty
    if (threads.length === 0) {
      const sampleThreads = [
        {
          gmailThreadId: `thread-gmail-${tenant.businessSlug}-001`,
          subject: "Re: Need assistance with CNAME setup for staging subdomain",
          snippet: "Hi team, we are having trouble verifying our staging subdomain. The DNS record points to proxy.example.com but SSL throws handshake error.",
          notes: "Staff note (Teach agent): Customer forgot to select Full (Strict) SSL mode in Cloudflare. Always remind customers to switch from Flexible to Full (Strict).",
          messages: [
            {
              fromAddress: "customer@cliententerprise.com",
              toAddress: `support@${tenant.businessSlug}.com`,
              bodyText: "Hi team, we are having trouble verifying our staging subdomain. The DNS record points to proxy.example.com but SSL throws handshake error. Can you help?",
              sentAt: new Date(Date.now() - 86400000 * 3),
            },
            {
              fromAddress: `support@${tenant.businessSlug}.com`,
              toAddress: "customer@cliententerprise.com",
              bodyText: "Hi there! This occurs when Cloudflare SSL mode is set to Flexible instead of Full (Strict). Please change your encryption mode in the Cloudflare SSL/TLS tab to Full (Strict), and the handshake loop will clear immediately.",
              notes: "Verified standard resolution procedure.",
              sentAt: new Date(Date.now() - 86400000 * 2),
            },
          ],
        },
        {
          gmailThreadId: `thread-gmail-${tenant.businessSlug}-002`,
          subject: "Re: Inquiring about enterprise SLA and database max pool",
          snippet: "We are scaling to 10,000 concurrent requests and want to know your PostgreSQL connection limits and pooling setup.",
          notes: "Staff note (Teach agent): Quote our Enterprise Autonomous Cluster ($3,500/mo) which includes dedicated PgBouncer poolers and 99.95% SLA.",
          messages: [
            {
              fromAddress: "cto@fintechpartner.io",
              toAddress: `consultant@${tenant.businessSlug}.com`,
              bodyText: "We are scaling to 10,000 concurrent requests and want to know your PostgreSQL connection limits and pooling setup.",
              sentAt: new Date(Date.now() - 86400000 * 5),
            },
          ],
        },
      ];

      for (const t of sampleThreads) {
        const [insertedThread] = await db
          .insert(emailThreads)
          .values({
            businessId: tenant.businessId,
            gmailThreadId: t.gmailThreadId,
            subject: t.subject,
            snippet: t.snippet,
            notes: t.notes,
          })
          .returning();

        for (const m of t.messages) {
          await db.insert(emailMessages).values({
            businessId: tenant.businessId,
            threadId: insertedThread.id,
            fromAddress: m.fromAddress,
            toAddress: m.toAddress,
            bodyText: m.bodyText,
            notes: m.notes || null,
            sentAt: m.sentAt,
          });
        }
      }

      threads = await db
        .select()
        .from(emailThreads)
        .where(eq(emailThreads.businessId, tenant.businessId))
        .orderBy(desc(emailThreads.syncedAt));
    }

    const fullThreads = await Promise.all(
      threads.map(async (t) => {
        const msgs = await db
          .select()
          .from(emailMessages)
          .where(eq(emailMessages.threadId, t.id))
          .orderBy(emailMessages.sentAt);

        return {
          id: t.id,
          gmailThreadId: t.gmailThreadId,
          subject: t.subject,
          snippet: t.snippet,
          notes: t.notes,
          syncedAt: t.syncedAt,
          messageCount: msgs.length,
          messages: msgs,
        };
      })
    );

    return NextResponse.json({ threads: fullThreads });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch past email threads", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const { threadId, notes } = body;

    if (!threadId || notes === undefined) {
      return NextResponse.json({ error: "threadId and notes are required." }, { status: 400 });
    }

    const [updated] = await db
      .update(emailThreads)
      .set({ notes })
      .where(and(eq(emailThreads.id, threadId), eq(emailThreads.businessId, tenant.businessId)))
      .returning();

    return NextResponse.json({
      success: true,
      thread: updated,
      message: "Human teaching notes updated on past email thread.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update email notes", details: String(error) },
      { status: 500 }
    );
  }
}
