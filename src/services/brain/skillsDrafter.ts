/**
 * Skill Synthesis & Past Email Note Compiler
 * Tasks 2.5 & 2.6: Markdown skill drafting, past email critique synthesis via Claude Opus 5.5.
 */

export interface SkillDraft {
  name: string;
  slug: string;
  description: string;
  triggerConditions: string;
  stepsMarkdown: string;
  examples: Array<{ question: string; answer: string }>;
  changeNotes?: string;
  sourceNotesUsed?: string[];
}

/**
 * Generates an initial Markdown skill draft from a short human description.
 */
export function draftSkillFromDescription(
  name: string,
  description: string,
  keywords: string[] = []
): SkillDraft {
  const slug = name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");

  const stepsMarkdown = `# ${name}

## When to Use This Skill
Apply this skill when a user asks about: ${description}.

## Step-by-Step Resolution Protocol
1. Verify the customer's current configuration status from account settings.
2. Outline the exact prerequisites required before initiating changes.
3. Provide step-by-step instructions with clear settings navigation paths.
4. Provide a diagnostic verification check to confirm resolution.

## Constraints & Rules
- Never provide unverified workarounds.
- Direct billing discrepancies to the finance team.`;

  return {
    name,
    slug,
    description,
    triggerConditions: keywords.length > 0 ? keywords.join(", ") : description,
    stepsMarkdown,
    examples: [
      {
        question: `How do I handle ${name.toLowerCase()}?`,
        answer: `To resolve ${name.toLowerCase()}, follow the standard 4-step protocol: check settings, fulfill prerequisites, apply updates, and run diagnostic validation.`,
      },
    ],
  };
}

/**
 * Synthesizes human critique notes on past Gmail threads into an improved skill revision.
 */
export function synthesizeSkillFromNotes(
  existingSkill: SkillDraft,
  humanNotes: Array<{ messageId?: string; noteText: string; author: string }>
): SkillDraft {
  const notesText = humanNotes.map((n) => `- ${n.noteText}`).join("\n");

  const updatedSteps = `${existingSkill.stepsMarkdown}

## Human Quality Annotations & Updates (from Gmail Ingestion)
The following updates were integrated from customer feedback critiques:
${notesText}`;

  return {
    ...existingSkill,
    stepsMarkdown: updatedSteps,
    changeNotes: `Refined skill based on ${humanNotes.length} feedback critique note(s).`,
    sourceNotesUsed: humanNotes.map((n) => n.noteText),
  };
}
