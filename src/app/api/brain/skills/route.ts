import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { db } from "@/db";
import { skills, skillVersions } from "@/db/schema/knowledge";
import { draftSkillFromPages } from "@/services/brain/skillsDrafter";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const tenant = await getTenantContext();

    let skillsList = await db
      .select()
      .from(skills)
      .where(eq(skills.businessId, tenant.businessId));

    // Seed default skills if empty
    if (skillsList.length === 0) {
      const defaultSkills = [
        {
          name: "DNS & Custom CNAME Setup",
          slug: "dns-setup",
          description: "Step-by-step procedure for pointing customer domains to the SaaS cluster.",
          triggerConditions: "When a user asks about setting up custom domains, CNAME records, or DNS routing.",
          stepsMarkdown: `1. Log into your DNS provider (e.g., Cloudflare, GoDaddy, Route53).\n2. Create a new CNAME record: \`app\` -> \`proxy.${tenant.businessSlug}.com\`.\n3. Turn OFF Cloudflare orange cloud proxying during initial certificate issuance.\n4. Wait 5-15 minutes for DNS TTL propagation.\n5. Verify status using \`dig CNAME app.yourdomain.com +short\`.`,
          examples: [
            { question: "How do I map my subdomain?", answer: "Create a CNAME record pointing to proxy cluster." },
          ],
        },
        {
          name: "Webhook Signature Debugging",
          slug: "webhook-debugging",
          description: "Diagnostic protocol for verifying HMAC SHA-256 webhook signatures.",
          triggerConditions: "When webhook deliveries fail with 401 Unauthorized or signature mismatch.",
          stepsMarkdown: `1. Retrieve the shared signing secret from your Settings & Keys vault.\n2. Compute the HMAC SHA-256 hash over the raw binary request body.\n3. Compare the computed digest with the \`X-Hub-Signature-256\` header.\n4. Verify server clocks are synchronized (within 300 seconds skew limit).`,
          examples: [
            { question: "Why is my webhook failing verification?", answer: "Check raw body hashing and timestamp skew." },
          ],
        },
      ];

      for (const ds of defaultSkills) {
        const [insertedSkill] = await db
          .insert(skills)
          .values({
            businessId: tenant.businessId,
            name: ds.name,
            slug: ds.slug,
            description: ds.description,
            triggerConditions: ds.triggerConditions,
            stepsMarkdown: ds.stepsMarkdown,
            examples: ds.examples,
          })
          .returning();

        const [initialVersion] = await db
          .insert(skillVersions)
          .values({
            skillId: insertedSkill.id,
            businessId: tenant.businessId,
            versionNumber: 1,
            stepsMarkdown: ds.stepsMarkdown,
            changeNotes: "Initial production baseline SOP",
          })
          .returning();

        await db
          .update(skills)
          .set({ currentVersionId: initialVersion.id })
          .where(eq(skills.id, insertedSkill.id));
      }

      skillsList = await db
        .select()
        .from(skills)
        .where(eq(skills.businessId, tenant.businessId));
    }

    return NextResponse.json({ skills: skillsList });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch skills", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const { action, name, slug, description, triggerConditions, stepsMarkdown, pages } = body;

    if (action === "draft_from_pages") {
      // Task 2.5: Skills Drafter - auto-generates skill from ingested help pages
      const drafted = draftSkillFromPages(
        name || "Automated Procedure",
        pages || [
          {
            title: "Configuring Custom CNAME Subdomains",
            content: "Step 1: Point CNAME. Step 2: Configure TLS. Step 3: Verify DNS.",
            url: `https://${tenant.businessSlug}.com/articles/cname`,
          },
        ]
      );

      return NextResponse.json({ success: true, draftedSkill: drafted });
    }

    if (!name || !stepsMarkdown) {
      return NextResponse.json({ error: "Name and stepsMarkdown are required." }, { status: 400 });
    }

    const skillSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const [inserted] = await db
      .insert(skills)
      .values({
        businessId: tenant.businessId,
        name,
        slug: skillSlug,
        description: description || "Operational skill procedure",
        triggerConditions: triggerConditions || "Triggered on related customer queries",
        stepsMarkdown,
        examples: [],
      })
      .returning();

    const [version] = await db
      .insert(skillVersions)
      .values({
        skillId: inserted.id,
        businessId: tenant.businessId,
        versionNumber: 1,
        stepsMarkdown,
        changeNotes: "Initial drafted version",
      })
      .returning();

    await db
      .update(skills)
      .set({ currentVersionId: version.id })
      .where(eq(skills.id, inserted.id));

    return NextResponse.json({
      success: true,
      skill: inserted,
      message: `Skill '${name}' created and published as Version 1.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save skill", details: String(error) },
      { status: 500 }
    );
  }
}
