import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { db } from "@/db";
import { chatSessions, chatMessages } from "@/db/schema/chat";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const tenant = await getTenantContext();

    const sessions = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.businessId, tenant.businessId))
      .orderBy(desc(chatSessions.createdAt));

    // Seed initial session if none exist
    if (sessions.length === 0) {
      const [initialSession] = await db
        .insert(chatSessions)
        .values({
          businessId: tenant.businessId,
          userId: tenant.userId,
          title: "Custom Domain DNS Configuration",
          mode: "ask",
        })
        .returning();

      // Seed initial messages
      await db.insert(chatMessages).values({
        sessionId: initialSession.id,
        businessId: tenant.businessId,
        sender: "user",
        content: "How do I configure custom CNAME subdomains with SSL on Cloudflare?",
        citations: [],
        isEscalated: false,
      });

      await db.insert(chatMessages).values({
        sessionId: initialSession.id,
        businessId: tenant.businessId,
        sender: "consultant",
        content: `To configure custom CNAME subdomains with SSL:\n\n1. Point your DNS CNAME record to \`proxy.${tenant.businessSlug}.com\` [1].\n2. Set Cloudflare SSL/TLS encryption mode to **Full (Strict)** [2].\n3. Turn OFF the orange cloud proxy during initial certificate issuance to allow ACME challenge validation.\n\nAll verified against verified documentation.`,
        citations: [
          { id: "c1", type: "paragraph", title: "Custom CNAME Subdomains & SSL Setup", url: `https://support.${tenant.businessSlug}.com/articles/custom-cname-setup`, snippet: "Point DNS CNAME record to proxy cluster." },
          { id: "c2", type: "paragraph", title: "Cloudflare Flexible vs Full Strict SSL", url: `https://support.${tenant.businessSlug}.com/articles/ssl-cloudflare-handshake`, snippet: "Set Cloudflare SSL/TLS mode to Full Strict." },
        ],
        isEscalated: false,
      });

      const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, initialSession.id));

      return NextResponse.json({
        sessions: [{ ...initialSession, messageCount: 2, messages }],
      });
    }

    const fullSessions = await Promise.all(
      sessions.map(async (s) => {
        const msgs = await db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.sessionId, s.id))
          .orderBy(chatMessages.createdAt);

        return {
          ...s,
          messageCount: msgs.length,
          messages: msgs,
        };
      })
    );

    return NextResponse.json({ sessions: fullSessions });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch chat sessions", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const { title = "New Tech Consultation", mode = "ask", roleId } = body;

    const [newSession] = await db
      .insert(chatSessions)
      .values({
        businessId: tenant.businessId,
        userId: tenant.userId,
        roleId: roleId || null,
        title,
        mode,
      })
      .returning();

    return NextResponse.json({ success: true, session: newSession });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create chat session", details: String(error) },
      { status: 500 }
    );
  }
}
