/**
 * Plain-English Instructions Management & Role Scoping
 * Task 2.5: Write, edit, switch on/off, delete instructions.
 * Scoping: Applies to all roles, or only to the roles the person picks (Task 1.4).
 * Precedence: Instructions take strict precedence over general knowledge.
 */

export interface InstructionItem {
  id: string;
  businessId: string;
  title: string;
  ruleText: string;
  appliesToRoles: string[]; // ["all"] or array of role slugs like ["support-engineer", "support-executive"]
  isActive: boolean;
  createdAt: string;
}

// In-memory store fallback for sandbox vitest runs
const inMemInstructions = new Map<string, InstructionItem[]>(); // businessId -> instructions

export function resetInMemoryInstructions(businessId?: string) {
  if (businessId) {
    inMemInstructions.delete(businessId);
  } else {
    inMemInstructions.clear();
  }
}

export const DEFAULT_INSTRUCTIONS: Array<Omit<InstructionItem, "id" | "businessId" | "createdAt">> = [
  {
    title: "Refund Escalation Policy",
    ruleText: "Never promise a refund. Send every refund question to the Billing team for human approval and review.",
    appliesToRoles: ["all"],
    isActive: true,
  },
  {
    title: "Technical Command Grounding",
    ruleText: "Always provide exact CLI commands (e.g. dig, curl, docker) and reference verified settings paths.",
    appliesToRoles: ["support-engineer"],
    isActive: true,
  },
  {
    title: "Warm Greeting & Simplicity",
    ruleText: "Greet customers warmly with friendly phrasing, avoid technical jargon, and check if they need more help.",
    appliesToRoles: ["support-executive"],
    isActive: true,
  },
  {
    title: "Pricing & Solution Steering",
    ruleText: "Highlight ROI and scalable SaaS benefits, steering the discussion toward an implementation quote.",
    appliesToRoles: ["ai-consultant"],
    isActive: true,
  },
];

/**
 * Initializes default instructions for a business if empty.
 */
export function seedDefaultInstructions(businessId: string): InstructionItem[] {
  let list = inMemInstructions.get(businessId);
  if (!list || list.length === 0) {
    list = DEFAULT_INSTRUCTIONS.map((d, index) => ({
      id: `inst-${index + 1}-${businessId.substring(0, 8)}`,
      businessId,
      title: d.title,
      ruleText: d.ruleText,
      appliesToRoles: d.appliesToRoles,
      isActive: d.isActive,
      createdAt: new Date().toISOString(),
    }));
    inMemInstructions.set(businessId, list);
  }
  return list;
}

/**
 * Retrieves all instructions for a business.
 */
export function getInstructions(businessId: string): InstructionItem[] {
  const existing = inMemInstructions.get(businessId);
  if (!existing || existing.length === 0) {
    return seedDefaultInstructions(businessId);
  }
  return existing;
}

/**
 * Creates a new instruction rule.
 */
export function createInstruction(
  businessId: string,
  data: {
    title: string;
    ruleText: string;
    appliesToRoles?: string[];
    isActive?: boolean;
  }
): InstructionItem {
  const list = getInstructions(businessId);
  const newItem: InstructionItem = {
    id: `inst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    businessId,
    title: data.title.trim(),
    ruleText: data.ruleText.trim(),
    appliesToRoles: data.appliesToRoles && data.appliesToRoles.length > 0 ? data.appliesToRoles : ["all"],
    isActive: data.isActive !== undefined ? data.isActive : true,
    createdAt: new Date().toISOString(),
  };

  list.unshift(newItem);
  inMemInstructions.set(businessId, list);
  return newItem;
}

/**
 * Updates an existing instruction.
 */
export function updateInstruction(
  businessId: string,
  id: string,
  updates: Partial<Pick<InstructionItem, "title" | "ruleText" | "appliesToRoles" | "isActive">>
): InstructionItem {
  const list = getInstructions(businessId);
  const index = list.findIndex((i) => i.id === id);
  if (index === -1) {
    throw new Error(`Instruction with id '${id}' not found.`);
  }

  const current = list[index];
  const updated: InstructionItem = {
    ...current,
    ...updates,
    title: updates.title !== undefined ? updates.title.trim() : current.title,
    ruleText: updates.ruleText !== undefined ? updates.ruleText.trim() : current.ruleText,
    appliesToRoles: updates.appliesToRoles !== undefined ? updates.appliesToRoles : current.appliesToRoles,
  };

  list[index] = updated;
  inMemInstructions.set(businessId, list);
  return updated;
}

/**
 * Switches an instruction ON or OFF.
 */
export function toggleInstruction(businessId: string, id: string, isActive: boolean): InstructionItem {
  return updateInstruction(businessId, id, { isActive });
}

/**
 * Deletes an instruction rule.
 */
export function deleteInstruction(businessId: string, id: string): boolean {
  const list = getInstructions(businessId);
  const filtered = list.filter((i) => i.id !== id);
  if (filtered.length === list.length) {
    return false;
  }
  inMemInstructions.set(businessId, filtered);
  return true;
}

/**
 * Task 2.5 Scoping: Filters active instructions applicable to a specific agent role.
 * Rule: Applies if isActive === true AND (appliesToRoles includes "all" OR includes roleSlug).
 */
export function getActiveInstructionsForRole(
  businessId: string,
  roleSlug: string
): InstructionItem[] {
  const all = getInstructions(businessId);
  return all.filter((item) => {
    if (!item.isActive) return false;
    if (item.appliesToRoles.includes("all")) return true;
    return item.appliesToRoles.includes(roleSlug);
  });
}

/**
 * Compiles active instructions into a formatted system prompt injection block.
 * Gives instructions highest precedence over standard knowledge base facts.
 */
export function compileInstructionsForPrompt(instructions: InstructionItem[]): string {
  if (instructions.length === 0) return "";

  const lines = instructions.map(
    (inst, idx) => `${idx + 1}. [${inst.title}]: ${inst.ruleText}`
  );

  return `\n\n[MANDATORY OPERATIONAL INSTRUCTIONS — HIGHEST PRECEDENCE]\n${lines.join(
    "\n"
  )}\nRule: You MUST adhere strictly to these instructions above all other guidelines. Never violate these rules.`;
}
