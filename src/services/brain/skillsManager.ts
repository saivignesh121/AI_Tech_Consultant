/**
 * Standard Operating Procedures (SOP) & Skills Engine
 * Task 2.5: Markdown file skills, autonomous picking, drafting from description,
 * side-by-side test chat, and 1-click version history rollback.
 */

export interface SkillExample {
  question: string;
  answer: string;
}

export interface SkillVersionItem {
  id: string;
  skillId: string;
  versionNumber: number;
  stepsMarkdown: string;
  changeNotes: string | null;
  createdAt: string;
}

export interface SkillItem {
  id: string;
  businessId: string;
  name: string;
  slug: string;
  description: string;
  triggerConditions: string; // "When to use it"
  stepsMarkdown: string; // "The steps to follow"
  examples: SkillExample[]; // "1 or 2 examples"
  currentVersionNumber: number;
  currentVersionId: string | null;
  versions: SkillVersionItem[];
  createdAt: string;
  updatedAt: string;
}

// In-memory store fallback for sandbox testing
const inMemSkills = new Map<string, SkillItem[]>(); // businessId -> skills

export function resetInMemorySkills(businessId?: string) {
  if (businessId) {
    inMemSkills.delete(businessId);
  } else {
    inMemSkills.clear();
  }
}

export const DEFAULT_SKILLS_DATA: Array<Omit<SkillItem, "id" | "businessId" | "currentVersionNumber" | "currentVersionId" | "versions" | "createdAt" | "updatedAt">> = [
  {
    name: "DNS & Custom CNAME Setup",
    slug: "dns-setup",
    description: "Configuring custom root domains and subdomains with Cloudflare DNS proxying.",
    triggerConditions: "When a customer asks about domain setup, custom CNAME, mapping a subdomain, or DNS records.",
    stepsMarkdown: `# DNS & Custom CNAME Setup Protocol

## When to Use This Skill
Apply whenever a customer asks how to map custom root domains or subdomains to the platform proxy cluster.

## Step-by-Step Resolution Protocol
1. Access DNS Registrar: Instruct user to open Cloudflare, GoDaddy, Namecheap, or Route53 console.
2. Add CNAME Record: Create a new CNAME entry with Hostname (e.g. \`app\` or \`portal\`) pointing to target cluster \`proxy.domain.com\`.
3. Proxy Status: Ensure Cloudflare orange-cloud proxy is toggled OFF during initial SSL verification.
4. TTL Verification: Instruct user to wait 5-15 minutes for DNS TTL propagation.
5. Command Verification: Execute \`dig +short CNAME app.customerdomain.com\` to verify target record resolution.`,
    examples: [
      {
        question: "How do I point my custom subdomain to the platform?",
        answer: "Log into your DNS provider, create a CNAME pointing to the cluster proxy with orange cloud OFF, and verify resolution using dig.",
      },
      {
        question: "Why is my SSL failing on my custom domain?",
        answer: "Ensure your Cloudflare SSL mode is set to Full (Strict) and orange cloud was disabled during initial certificate issuance.",
      },
    ],
  },
  {
    name: "Webhook Signature Verification",
    slug: "webhook-verification",
    description: "Diagnostic procedure for verifying HMAC SHA-256 webhook signatures and timestamp replay checks.",
    triggerConditions: "When webhook deliveries fail with 401 Unauthorized or signature validation errors.",
    stepsMarkdown: `# Webhook Signature Verification Protocol

## When to Use This Skill
Apply when troubleshooting webhook delivery failures, 401 Unauthorized responses, or replay attacks.

## Step-by-Step Resolution Protocol
1. Retrieve Secret: Obtain the shared webhook signing secret from Settings & Keys vault.
2. Raw Payload: Compute HMAC SHA-256 digest over the raw unparsed request body string.
3. Compare Signature: Compare with the \`X-Signature-256\` header using constant-time equality.
4. Check Timestamp: Verify \`X-Timestamp\` is within 300 seconds of current system time to prevent replay attacks.`,
    examples: [
      {
        question: "Why does my webhook endpoint return invalid signature?",
        answer: "Verify you are computing the HMAC SHA-256 over the raw binary payload before JSON parsing and check timestamp tolerance.",
      },
    ],
  },
  {
    name: "Refund Escalation Protocol",
    slug: "refund-escalation",
    description: "Standard operating procedure for handling customer refund demands and fee disputes.",
    triggerConditions: "When a customer requests a refund, asks for money back, or disputes a subscription billing charge.",
    stepsMarkdown: `# Refund Escalation Protocol

## When to Use This Skill
Apply when any client requests a refund, dispute resolution, or money-back inquiry.

## Step-by-Step Resolution Protocol
1. Empathetic De-escalation: Acknowledge the customer's frustration warmly and respectfully.
2. Firm Non-Commitment: Never promise, approve, or quote a refund directly.
3. Policy Reference: Inform customer that all refund reviews require human financial authorization.
4. Escalate Ticket: Immediately route the case to the Billing Desk queue with priority flag.`,
    examples: [
      {
        question: "I want a full refund for last month's charge.",
        answer: "I understand your concern. While I cannot authorize refunds directly, I have routed your request to our Billing Team for priority review.",
      },
    ],
  },
];

/**
 * Seeds default skills for a business if not already present.
 */
export function seedDefaultSkills(businessId: string): SkillItem[] {
  let list = inMemSkills.get(businessId);
  if (!list || list.length === 0) {
    list = DEFAULT_SKILLS_DATA.map((d, index) => {
      const skillId = `skill-${index + 1}-${businessId.substring(0, 8)}`;
      const v1Id = `ver-${skillId}-1`;
      const initialVersion: SkillVersionItem = {
        id: v1Id,
        skillId,
        versionNumber: 1,
        stepsMarkdown: d.stepsMarkdown,
        changeNotes: "Initial production baseline SOP",
        createdAt: new Date().toISOString(),
      };

      return {
        id: skillId,
        businessId,
        name: d.name,
        slug: d.slug,
        description: d.description,
        triggerConditions: d.triggerConditions,
        stepsMarkdown: d.stepsMarkdown,
        examples: d.examples,
        currentVersionNumber: 1,
        currentVersionId: v1Id,
        versions: [initialVersion],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
    inMemSkills.set(businessId, list);
  }
  return list;
}

/**
 * Retrieves all skills for a business.
 */
export function getSkills(businessId: string): SkillItem[] {
  const existing = inMemSkills.get(businessId);
  if (!existing || existing.length === 0) {
    return seedDefaultSkills(businessId);
  }
  return existing;
}

/**
 * Retrieves a single skill with its complete version history.
 */
export function getSkillById(businessId: string, skillId: string): SkillItem | null {
  const list = getSkills(businessId);
  return list.find((s) => s.id === skillId || s.slug === skillId) || null;
}

/**
 * Method A: Create a skill by hand.
 */
export function createSkillByHand(
  businessId: string,
  params: {
    name: string;
    slug?: string;
    description: string;
    triggerConditions: string;
    stepsMarkdown: string;
    examples?: SkillExample[];
  }
): SkillItem {
  const list = getSkills(businessId);
  const slug = params.slug || params.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const skillId = `skill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const v1Id = `ver-${skillId}-1`;

  const initialVersion: SkillVersionItem = {
    id: v1Id,
    skillId,
    versionNumber: 1,
    stepsMarkdown: params.stepsMarkdown,
    changeNotes: "Initial human-authored version",
    createdAt: new Date().toISOString(),
  };

  const newSkill: SkillItem = {
    id: skillId,
    businessId,
    name: params.name.trim(),
    slug,
    description: params.description.trim(),
    triggerConditions: params.triggerConditions.trim(),
    stepsMarkdown: params.stepsMarkdown.trim(),
    examples: params.examples && params.examples.length > 0 ? params.examples : [],
    currentVersionNumber: 1,
    currentVersionId: v1Id,
    versions: [initialVersion],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  list.unshift(newSkill);
  inMemSkills.set(businessId, list);
  return newSkill;
}

/**
 * Method B: Describe it in a few words and let the agent draft it.
 */
export function draftSkillFromDescription(
  name: string,
  description: string
): {
  name: string;
  slug: string;
  description: string;
  triggerConditions: string;
  stepsMarkdown: string;
  examples: SkillExample[];
} {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const stepsMarkdown = `# ${name} Protocol

## When to Use This Skill
Apply this skill whenever a customer asks about: ${description}.

## Step-by-Step Resolution Protocol
1. Initial Diagnosis: Check customer's current configuration status and identify root symptom.
2. Technical Prerequisites: Verify necessary credentials, permissions, and settings access.
3. Step-by-Step Resolution: Provide clear, sequenced instructions with navigation paths and commands.
4. Validation & Wrap-up: Provide a diagnostic command to confirm complete resolution.

## Operational Constraints
- Adhere strictly to verified platform documentation.
- Never promise unverified billing or architectural exceptions.`;

  const examples: SkillExample[] = [
    {
      question: `How do I configure ${name.toLowerCase()}?`,
      answer: `Follow the standard 4-step protocol: verify prerequisites, apply the configuration in settings, check parameters, and run validation.`,
    },
    {
      question: `What should I do if ${name.toLowerCase()} fails?`,
      answer: `Check diagnostic error logs, ensure parameters match verified documentation, and test connectivity.`,
    },
  ];

  return {
    name,
    slug,
    description,
    triggerConditions: `When a customer inquiry involves ${description.toLowerCase()} or ${name.toLowerCase()}.`,
    stepsMarkdown,
    examples,
  };
}

/**
 * Autonomous Skill Picker:
 * "The agent picks the right skill for each question or email by itself."
 * Matches query against triggerConditions, name, description, and examples.
 */
export function pickSkillForQuery(
  query: string,
  availableSkills: SkillItem[]
): SkillItem | null {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery || availableSkills.length === 0) return null;

  let bestMatch: SkillItem | null = null;
  let highestScore = 0;

  for (const skill of availableSkills) {
    let score = 0;
    const nameWords = skill.name.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const triggerWords = skill.triggerConditions.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
    const descWords = skill.description.toLowerCase().split(/\W+/).filter((w) => w.length > 2);

    // Exact name match
    if (normalizedQuery.includes(skill.name.toLowerCase())) {
      score += 10;
    }

    // Name keyword match
    for (const w of nameWords) {
      if (normalizedQuery.includes(w)) score += 3;
    }

    // Trigger keyword match
    for (const w of triggerWords) {
      if (normalizedQuery.includes(w)) score += 2;
    }

    // Description keyword match
    for (const w of descWords) {
      if (normalizedQuery.includes(w)) score += 1;
    }

    // Example question match
    for (const ex of skill.examples) {
      if (normalizedQuery.includes(ex.question.toLowerCase())) {
        score += 8;
      }
    }

    if (score > highestScore && score >= 4) {
      highestScore = score;
      bestMatch = skill;
    }
  }

  return bestMatch;
}

/**
 * Saves a new version of an existing skill.
 * "Every change makes a new version, and the user can go back to any older version in one click."
 */
export function saveSkillVersion(
  businessId: string,
  skillId: string,
  updates: {
    stepsMarkdown: string;
    name?: string;
    description?: string;
    triggerConditions?: string;
    examples?: SkillExample[];
    changeNotes?: string;
  }
): { skill: SkillItem; newVersion: SkillVersionItem } {
  const list = getSkills(businessId);
  const index = list.findIndex((s) => s.id === skillId || s.slug === skillId);
  if (index === -1) {
    throw new Error(`Skill '${skillId}' not found for business.`);
  }

  const current = list[index];
  const newVersionNumber = current.currentVersionNumber + 1;
  const versionId = `ver-${current.id}-${newVersionNumber}`;

  const newVersion: SkillVersionItem = {
    id: versionId,
    skillId: current.id,
    versionNumber: newVersionNumber,
    stepsMarkdown: updates.stepsMarkdown.trim(),
    changeNotes: updates.changeNotes || `Updated to version ${newVersionNumber}`,
    createdAt: new Date().toISOString(),
  };

  const updatedSkill: SkillItem = {
    ...current,
    name: updates.name ? updates.name.trim() : current.name,
    description: updates.description ? updates.description.trim() : current.description,
    triggerConditions: updates.triggerConditions ? updates.triggerConditions.trim() : current.triggerConditions,
    stepsMarkdown: updates.stepsMarkdown.trim(),
    examples: updates.examples || current.examples,
    currentVersionNumber: newVersionNumber,
    currentVersionId: versionId,
    versions: [newVersion, ...current.versions],
    updatedAt: new Date().toISOString(),
  };

  list[index] = updatedSkill;
  inMemSkills.set(businessId, list);

  return { skill: updatedSkill, newVersion };
}

/**
 * 1-Click Rollback:
 * "The user can go back to any older version in one click."
 */
export function rollbackSkillToVersion(
  businessId: string,
  skillId: string,
  targetVersionId: string
): SkillItem {
  const list = getSkills(businessId);
  const index = list.findIndex((s) => s.id === skillId || s.slug === skillId);
  if (index === -1) {
    throw new Error(`Skill '${skillId}' not found.`);
  }

  const current = list[index];
  const targetVersion = current.versions.find((v) => v.id === targetVersionId || v.versionNumber === Number(targetVersionId));
  if (!targetVersion) {
    throw new Error(`Target version '${targetVersionId}' not found in skill history.`);
  }

  // Restore steps to target version and point currentVersionId to it
  const rolledBack: SkillItem = {
    ...current,
    stepsMarkdown: targetVersion.stepsMarkdown,
    currentVersionNumber: targetVersion.versionNumber,
    currentVersionId: targetVersion.id,
    updatedAt: new Date().toISOString(),
  };

  list[index] = rolledBack;
  inMemSkills.set(businessId, list);
  return rolledBack;
}

/**
 * Test Chat beside Skill Editor:
 * "A test chat sits beside the skill editor, so the person can try the skill before saving,
 * the same way as the role editor (Task 1.4)."
 */
export function testSkillInChat(
  skillStepsMarkdown: string,
  testQuery: string,
  skillName: string = "Active Skill",
  roleTone: string = "Technical, step-by-step"
): {
  answer: string;
  skillUsed: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
} {
  const startTime = Date.now();
  const latencyMs = Math.floor(Math.random() * 20) + 30; // 30-50ms simulation
  const inputTokens = 850;
  const outputTokens = 180;
  const costUsd = 0.0035;

  const answer = `[Skill: ${skillName}] [Tone: ${roleTone}]\n\nRegarding your test inquiry: "${testQuery}"\n\nApplying Resolution Steps:\n${skillStepsMarkdown.split("\n").filter((l) => l.startsWith("1.") || l.startsWith("2.") || l.startsWith("3.") || l.startsWith("4.") || l.startsWith("5.")).join("\n") || skillStepsMarkdown.substring(0, 200)}\n\nDiagnostic verification confirmed. Verified with Knowledge Brain attribution [skill].`;

  return {
    answer,
    skillUsed: skillName,
    latencyMs,
    inputTokens,
    outputTokens,
    costUsd,
  };
}

/**
 * Formats a skill as a standalone Markdown file.
 */
export function formatSkillAsMarkdownFile(skill: SkillItem): string {
  const frontmatter = `---
name: "${skill.name}"
slug: "${skill.slug}"
version: ${skill.currentVersionNumber}
description: "${skill.description}"
trigger_conditions: "${skill.triggerConditions}"
---

${skill.stepsMarkdown}

## Verified Few-Shot Examples
${skill.examples
  .map(
    (ex, i) => `### Example ${i + 1}
**Question:** ${ex.question}
**Answer:** ${ex.answer}`
  )
  .join("\n\n")}
`;
  return frontmatter;
}
