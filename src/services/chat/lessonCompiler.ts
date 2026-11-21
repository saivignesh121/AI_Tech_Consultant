/**
 * Structured Markdown Lesson Compiler
 * Task 3.4 & D10: Converts human chat corrections into durable Markdown lessons & records.
 */

export interface LessonRecord {
  id: string;
  businessId: string;
  chatMessageId: string;
  title: string;
  category: string;
  fileName: string;
  lessonMarkdown: string;
  confidenceScore: number;
  status: "pending" | "approved" | "rejected";
  author: string;
  createdAt: string;
  suggestedSkillUpgrade?: boolean;
}

/**
 * Compiles a structured Markdown lesson from a chat feedback critique.
 */
export function compileLessonFromCorrection(params: {
  businessId: string;
  chatMessageId: string;
  category: string;
  originalQuestion: string;
  wrongAnswer: string;
  correctionWhy: string;
  author: string;
}): LessonRecord {
  const slug = params.category
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");

  const fileName = `lessons/${slug}.md`;
  const title = `Lesson: Protocol for ${params.category}`;

  const lessonMarkdown = `# ${title}

- **Category:** ${params.category}
- **Author:** ${params.author}
- **Created At:** ${new Date().toISOString()}
- **Originating Chat Message:** \`${params.chatMessageId}\`

## Context & User Inquiry
> "${params.originalQuestion}"

## What Was Incorrect in the Previous Response
> "${params.wrongAnswer}"

## Human Expert Correction & Rule to Follow
${params.correctionWhy}

## Golden Standard Resolution
When a customer presents this inquiry, strictly apply the rule above. Do not repeat the deprecated pattern.

---
*Status: Pending Human Review — Approved lessons automatically index into active RAG memory.*`;

  return {
    id: `lesson-${Date.now()}`,
    businessId: params.businessId,
    chatMessageId: params.chatMessageId,
    title,
    category: params.category,
    fileName,
    lessonMarkdown,
    confidenceScore: 0.95,
    status: "pending",
    author: params.author,
    createdAt: new Date().toISOString(),
    suggestedSkillUpgrade: params.correctionWhy.length > 120, // Suggests full skill upgrade if rule is extensive
  };
}

/**
 * Resolves priority when two lessons cover the same topic.
 * Rule: Newer approved lessons take precedence; conflicting unapproved lessons are flagged.
 */
export function resolveLessonPrecedence(
  existingLesson: LessonRecord,
  newLesson: LessonRecord
): { activeLesson: LessonRecord; conflictFlagged: boolean } {
  if (existingLesson.category === newLesson.category) {
    if (newLesson.status === "approved" && existingLesson.status !== "approved") {
      return { activeLesson: newLesson, conflictFlagged: false };
    }
    if (newLesson.status === "approved" && existingLesson.status === "approved") {
      // Newer approved supersedes older approved
      return { activeLesson: newLesson, conflictFlagged: true };
    }
  }
  return { activeLesson: existingLesson, conflictFlagged: false };
}
