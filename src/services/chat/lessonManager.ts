import fs from "fs";
import path from "path";
import { db } from "@/db";
import { lessons } from "@/db/schema/chat";
import { eq, and, desc } from "drizzle-orm";

export interface LessonItem {
  id: string;
  businessId: string;
  chatMessageId: string;
  title: string;
  category: string;
  slug: string;
  fileName: string;
  originalQuestion: string;
  wrongAnswer: string;
  correctionWhy: string;
  lessonMarkdown: string;
  confidenceScore: number;
  status: "pending" | "approved" | "rejected";
  isActive: boolean;
  author: string;
  suggestedSkillSlug?: string;
  suggestedSkillUpgrade?: boolean;
  suggestedSkillDiff?: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Resilient in-memory store for fallback/testing
const inMemLessons = new Map<string, LessonItem[]>(); // businessId -> LessonItem[]
const isTestEnv = process.env.NODE_ENV === "test";

export function resetInMemoryLessons(businessId?: string) {
  if (businessId) {
    inMemLessons.delete(businessId);
  } else {
    inMemLessons.clear();
  }
}

const LESSONS_DIR = path.resolve(process.cwd(), "lessons");

function ensureLessonsDir() {
  if (!fs.existsSync(LESSONS_DIR)) {
    fs.mkdirSync(LESSONS_DIR, { recursive: true });
  }
}

/**
 * Categorizes a correction into a recognized domain
 */
function inferCategory(query: string, correction: string): string {
  const combined = `${query} ${correction}`.toLowerCase();
  if (/refund|billing|invoice|charge|dispute|money|cancel|payment/i.test(combined)) {
    return "Billing & Refunds";
  }
  if (/dns|cname|domain|cloudflare|record|nameserver|proxy/i.test(combined)) {
    return "DNS & Networking";
  }
  if (/ssl|tls|certificate|https|handshake|acme/i.test(combined)) {
    return "SSL & Security";
  }
  if (/webhook|signature|hmac|payload|replay/i.test(combined)) {
    return "Webhooks & API";
  }
  if (/rate limit|429|quota|throttle|backoff/i.test(combined)) {
    return "Rate Limiting";
  }
  if (/gdpr|erasure|privacy|pii|delete account/i.test(combined)) {
    return "Compliance & Privacy";
  }
  return "Customer Support Operations";
}

/**
 * Creates slug from category or title
 */
function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Seeds default approved lessons from markdown files in `lessons/`
 */
export async function seedDefaultLessons(businessId: string): Promise<LessonItem[]> {
  ensureLessonsDir();
  const existing = inMemLessons.get(businessId) || [];
  if (existing.length > 0) return existing;

  const seeded: LessonItem[] = [
    {
      id: `lesson-seed-refund-${businessId.slice(0, 8)}`,
      businessId,
      chatMessageId: "00000000-0000-0000-0000-000000000001",
      title: "Strict Refund Escalation Policy",
      category: "Billing & Refunds",
      slug: "refund-escalation-policy",
      fileName: "lessons/refund-escalation-policy.md",
      originalQuestion: "Can I get an immediate refund for my annual subscription?",
      wrongAnswer: "I can process an automatic pro-rated refund within 3 business days.",
      correctionWhy: "Never promise or calculate a refund under any circumstances. Route all refund requests to the Billing & Finance team via support escalation ticket.",
      lessonMarkdown: `# Lesson: Strict Refund Escalation Policy\n\n- **Category:** Billing & Refunds\n- **Author:** Head of Customer Support\n\n## What Failed Originally\nThe agent promised a customer an automatic pro-rated refund directly in the chat window.\n\n## Human Correction & Rule\nNever promise or calculate a refund under any circumstances. All refund requests must be routed directly to the Billing & Finance team via a support escalation ticket.\n\n## Golden Protocol\n1. Acknowledge billing inquiry politely without committing to a monetary refund.\n2. State: "I have created an escalation ticket directly with our Billing & Finance Department to review your account details."\n3. Trigger human escalation flag.`,
      confidenceScore: 0.98,
      status: "approved",
      isActive: true,
      author: "support-lead@example.com",
      approvedBy: "support-lead@example.com",
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `lesson-seed-dns-${businessId.slice(0, 8)}`,
      businessId,
      chatMessageId: "00000000-0000-0000-0000-000000000002",
      title: "DNS Cloudflare Orange Cloud Issuance Rule",
      category: "DNS & Networking",
      slug: "dns-cloudflare-orange-cloud",
      fileName: "lessons/dns-records-priority.md",
      originalQuestion: "Why is my SSL certificate challenge failing on custom domain?",
      wrongAnswer: "Keep Cloudflare proxy enabled and wait 24 hours.",
      correctionWhy: "Turn OFF Cloudflare orange cloud proxying until the initial Let's Encrypt ACME verification succeeds, then re-enable orange cloud.",
      lessonMarkdown: `# Lesson: DNS Cloudflare Orange Cloud Issuance Rule\n\n- **Category:** DNS & Networking\n- **Author:** Senior Infrastructure Engineer\n\n## Human Correction & Rule\nTurn OFF Cloudflare proxying (Grey Cloud) until Let's Encrypt certificate challenge succeeds, then re-enable Orange Cloud.`,
      confidenceScore: 0.95,
      status: "approved",
      isActive: true,
      author: "infra-lead@example.com",
      approvedBy: "infra-lead@example.com",
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  inMemLessons.set(businessId, seeded);
  return seeded;
}

/**
 * Task 3.4: Retrieves all lessons for the given business.
 */
export async function getLessons(
  businessId: string,
  filter?: { status?: string; category?: string; isActive?: boolean }
): Promise<LessonItem[]> {
  if (!isTestEnv) {
    try {
      const rows = await db
        .select()
        .from(lessons)
        .where(eq(lessons.businessId, businessId))
        .orderBy(desc(lessons.createdAt));

      if (rows && rows.length > 0) {
        let items: LessonItem[] = rows.map((r: any) => ({
          id: r.id,
          businessId: r.businessId,
          chatMessageId: r.chatMessageId,
          title: r.title,
          category: r.category,
          slug: r.slug || createSlug(r.title),
          fileName: r.fileName || `lessons/${createSlug(r.title)}.md`,
          originalQuestion: r.originalQuestion || "",
          wrongAnswer: r.wrongAnswer || "",
          correctionWhy: r.correctionWhy || "",
          lessonMarkdown: r.lessonMarkdown,
          confidenceScore: r.confidenceScore ? Number(r.confidenceScore) : 0.95,
          status: (r.status as "pending" | "approved" | "rejected") || "pending",
          isActive: r.isActive !== false,
          author: r.author || "Support Team Member",
          suggestedSkillSlug: r.suggestedSkillSlug || undefined,
          suggestedSkillDiff: r.suggestedSkillDiff || undefined,
          suggestedSkillUpgrade: !!r.suggestedSkillSlug,
          approvedBy: r.approvedBy,
          approvedAt: r.approvedAt ? new Date(r.approvedAt).toISOString() : null,
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
        }));

        if (filter) {
          if (filter.status) items = items.filter((i) => i.status === filter.status);
          if (filter.category) items = items.filter((i) => i.category === filter.category);
          if (filter.isActive !== undefined) items = items.filter((i) => i.isActive === filter.isActive);
        }
        return items;
      }
    } catch (err) {
      console.warn("Notice: DB lessons fetch fallback, using in-memory store", err);
    }
  }

  // Fallback to in-memory store
  if (!inMemLessons.has(businessId)) {
    await seedDefaultLessons(businessId);
  }

  let items = inMemLessons.get(businessId) || [];
  if (filter) {
    if (filter.status) items = items.filter((i) => i.status === filter.status);
    if (filter.category) items = items.filter((i) => i.category === filter.category);
    if (filter.isActive !== undefined) items = items.filter((i) => i.isActive === filter.isActive);
  }
  return items;
}

const QUERY_STOP_WORDS = new Set([
  "why", "how", "what", "when", "where", "which", "who", "whom", "this", "that",
  "these", "those", "with", "from", "your", "have", "been", "does", "will", "would",
  "should", "could", "tell", "show", "help", "please", "more", "about", "into"
]);

/**
 * Task 3.4 & Strict Gate:
 * "Nothing the agent learns is used until a human approves it."
 * Retrieves ONLY lessons that have status === 'approved' AND isActive === true.
 */
export async function getApprovedLessonsForQuery(
  businessId: string,
  query: string
): Promise<LessonItem[]> {
  const allApproved = await getLessons(businessId, { status: "approved", isActive: true });
  if (allApproved.length === 0) return [];

  const queryWords = query
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !QUERY_STOP_WORDS.has(w));

  if (queryWords.length === 0) return [];

  // Score relevance of approved lessons
  const scored = allApproved.map((lesson) => {
    const text = `${lesson.title} ${lesson.category} ${lesson.originalQuestion} ${lesson.lessonMarkdown}`.toLowerCase();
    let matchCount = 0;
    for (const word of queryWords) {
      const wordRegex = new RegExp(`\\b${word}\\b`, "i");
      if (wordRegex.test(text)) matchCount += 1;
    }
    return { lesson, matchCount };
  });

  const matching = scored
    .filter((s) => s.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount)
    .map((s) => s.lesson);

  return matching.slice(0, 3);
}

/**
 * Task 3.4: Autonomously compiles a lesson from a human critique or comment box.
 * Writes Markdown file to `lessons/<slug>.md` and records data record with status: "pending".
 */
export async function createLessonFromCorrection(params: {
  businessId: string;
  chatMessageId: string;
  originalQuestion: string;
  wrongAnswer: string;
  correctionWhy: string;
  author: string;
  category?: string;
}): Promise<LessonItem> {
  const category = params.category || inferCategory(params.originalQuestion, params.correctionWhy);
  const baseSlug = createSlug(category);
  const timestamp = Date.now();
  const slug = `${baseSlug}-${timestamp.toString().slice(-4)}`;
  const fileName = `lessons/${slug}.md`;
  const title = `Lesson: Protocol for ${category}`;

  const isWorkflowLevel =
    params.correctionWhy.length > 120 ||
    /workflow|procedure|protocol|step|sop|first.*then.*finally/i.test(params.correctionWhy);

  const suggestedSkillSlug = isWorkflowLevel ? `sop-${baseSlug}` : undefined;
  const suggestedSkillDiff = isWorkflowLevel
    ? `+ Proposed Skill Update for: ${category}\n+ Rule: ${params.correctionWhy}\n+ Golden Resolution: Inquire -> Apply Protocol -> Confirm with user`
    : undefined;

  const lessonMarkdown = `# ${title}

- **Category:** ${category}
- **Author:** ${params.author}
- **Created At:** ${new Date().toISOString()}
- **Originating Chat Message:** \`${params.chatMessageId}\`
- **Status:** Pending Human Approval (Strict Gate)
- **Scope:** ${isWorkflowLevel ? "Broad Workflow / Candidate Skill Upgrade" : "Standard Policy Rule"}

## Context & User Inquiry
> "${params.originalQuestion}"

## What Was Incorrect in the Previous Response
> "${params.wrongAnswer}"

## Human Expert Correction & Rule to Follow
${params.correctionWhy}

## Golden Standard Resolution Protocol
When a customer presents this inquiry, strictly apply the rule above.
Do not repeat the deprecated pattern.

---
*Notice: In strict compliance with Capstone governance, this lesson will NOT be used in active RAG until approved.*`;

  // Write markdown file to lessons/ directory
  try {
    ensureLessonsDir();
    const filePath = path.resolve(process.cwd(), fileName);
    fs.writeFileSync(filePath, lessonMarkdown, "utf8");
  } catch (fsErr) {
    console.warn("Notice: FS write warning for lesson markdown:", fsErr);
  }

  const newLesson: LessonItem = {
    id: `lesson-${timestamp}`,
    businessId: params.businessId,
    chatMessageId: params.chatMessageId,
    title,
    category,
    slug,
    fileName,
    originalQuestion: params.originalQuestion,
    wrongAnswer: params.wrongAnswer,
    correctionWhy: params.correctionWhy,
    lessonMarkdown,
    confidenceScore: 0.95,
    status: "pending", // ALWAYS pending on creation
    isActive: true,
    author: params.author,
    suggestedSkillSlug,
    suggestedSkillUpgrade: isWorkflowLevel,
    suggestedSkillDiff,
    approvedBy: null,
    approvedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Try DB persistence
  if (!isTestEnv) {
    try {
      const [inserted] = await db
        .insert(lessons)
        .values({
          businessId: params.businessId,
          chatMessageId: params.chatMessageId,
          title: newLesson.title,
          category: newLesson.category,
          slug: newLesson.slug,
          fileName: newLesson.fileName,
          originalQuestion: newLesson.originalQuestion,
          wrongAnswer: newLesson.wrongAnswer,
          correctionWhy: newLesson.correctionWhy,
          lessonMarkdown: newLesson.lessonMarkdown,
          confidenceScore: newLesson.confidenceScore.toFixed(2),
          status: newLesson.status,
          isActive: newLesson.isActive,
          author: newLesson.author,
          suggestedSkillSlug: newLesson.suggestedSkillSlug,
          suggestedSkillDiff: newLesson.suggestedSkillDiff,
        } as any)
        .returning();

      if (inserted) {
        newLesson.id = inserted.id;
      }
    } catch (dbErr) {
      console.warn("Notice: DB insert fallback for lesson:", dbErr);
    }
  }

  // Update in-memory store
  const current = inMemLessons.get(params.businessId) || [];
  inMemLessons.set(params.businessId, [newLesson, ...current]);

  return newLesson;
}

/**
 * Updates a lesson (editing title, category, markdown, or metadata)
 */
export async function updateLesson(
  businessId: string,
  lessonId: string,
  updates: Partial<LessonItem>
): Promise<LessonItem> {
  const currentLessons = await getLessons(businessId);
  const target = currentLessons.find((l) => l.id === lessonId);
  if (!target) {
    throw new Error(`Lesson ${lessonId} not found`);
  }

  const updated: LessonItem = {
    ...target,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // If markdown updated, sync to filesystem
  if (updates.lessonMarkdown && updated.fileName) {
    try {
      const filePath = path.resolve(process.cwd(), updated.fileName);
      fs.writeFileSync(filePath, updates.lessonMarkdown, "utf8");
    } catch (fsErr) {
      console.warn("Notice: FS write warning for lesson markdown:", fsErr);
    }
  }

  // DB update
  if (!isTestEnv) {
    try {
      await db
        .update(lessons)
        .set({
          title: updated.title,
          category: updated.category,
          lessonMarkdown: updated.lessonMarkdown,
          status: updated.status,
          isActive: updated.isActive,
          updatedAt: new Date(),
        } as any)
        .where(and(eq(lessons.id, lessonId as any), eq(lessons.businessId, businessId)));
    } catch (err) {
      console.warn("Notice: DB update fallback for lesson:", err);
    }
  }

  // Update in-memory store
  const inMem = inMemLessons.get(businessId) || [];
  const idx = inMem.findIndex((l) => l.id === lessonId);
  if (idx !== -1) {
    inMem[idx] = updated;
    inMemLessons.set(businessId, [...inMem]);
  }

  return updated;
}

/**
 * Approves a lesson (Strict Gate Transition)
 */
export async function approveLesson(
  businessId: string,
  lessonId: string,
  approvedBy?: string
): Promise<LessonItem> {
  const current = await getLessons(businessId);
  const target = current.find((l) => l.id === lessonId);
  if (!target) {
    throw new Error(`Lesson ${lessonId} not found`);
  }

  return updateLesson(businessId, lessonId, {
    status: "approved",
    isActive: true,
    approvedBy: approvedBy || "Human Approver",
    approvedAt: new Date().toISOString(),
  });
}

/**
 * Rejects a lesson
 */
export async function rejectLesson(businessId: string, lessonId: string): Promise<LessonItem> {
  return updateLesson(businessId, lessonId, {
    status: "rejected",
  });
}

/**
 * Toggles a lesson active/inactive
 */
export async function toggleLesson(
  businessId: string,
  lessonId: string,
  isActive: boolean
): Promise<LessonItem> {
  return updateLesson(businessId, lessonId, {
    isActive,
  });
}

/**
 * Deletes a lesson and removes its markdown file from disk
 */
export async function deleteLesson(businessId: string, lessonId: string): Promise<boolean> {
  const current = await getLessons(businessId);
  const target = current.find((l) => l.id === lessonId);

  // Remove markdown file if present
  if (target?.fileName) {
    try {
      const filePath = path.resolve(process.cwd(), target.fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fsErr) {
      console.warn("Notice: FS unlink warning for lesson markdown:", fsErr);
    }
  }

  // Delete from DB
  if (!isTestEnv) {
    try {
      await db
        .delete(lessons)
        .where(and(eq(lessons.id, lessonId as any), eq(lessons.businessId, businessId)));
    } catch (err) {
      console.warn("Notice: DB delete fallback for lesson:", err);
    }
  }

  // Delete from in-memory
  const inMem = inMemLessons.get(businessId) || [];
  inMemLessons.set(
    businessId,
    inMem.filter((l) => l.id !== lessonId)
  );

  return true;
}
