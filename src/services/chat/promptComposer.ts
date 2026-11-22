import { DEFAULT_PROMPTS, SystemPromptTemplate } from "./prompts";
import { AgentRoleDefinition } from "./roles";
import { InstructionItem } from "../brain/instructionsManager";
import { SkillItem } from "../brain/skillsManager";

export interface ComposedAgentPrompt {
  promptTemplateKey: string;
  systemPrompt: string;
  userPrompt: string;
  composedVariables: Record<string, string>;
  selectedSkill?: SkillItem | null;
  appliedInstructions: string[];
}

/**
 * Autonomously builds the model prompt for each user inquiry.
 * Task 3.2: "The agent writes its own prompts for each question, starting from the prompts
 *            in Settings (Task 1.3) and the right skills (Task 2.5). Users must not need to write detailed prompts."
 */
export function composeAutonomousAgentPrompt(params: {
  businessName: string;
  customerQuery: string;
  customerName?: string;
  role: AgentRoleDefinition;
  formattedKnowledgeContext: string;
  activeInstructions: InstructionItem[];
  matchedSkill?: SkillItem | null;
  customTemplate?: SystemPromptTemplate;
}): ComposedAgentPrompt {
  const {
    businessName,
    customerQuery,
    customerName = "Valued Customer",
    role,
    formattedKnowledgeContext,
    activeInstructions,
    matchedSkill,
    customTemplate,
  } = params;

  // 1. Resolve master system prompt
  const masterTemplate =
    DEFAULT_PROMPTS.find((p) => p.key === "master_system") || DEFAULT_PROMPTS[0];

  let systemPrompt = masterTemplate.templateText
    .replace(/{business_name}/g, businessName)
    .replace(/{role_tone}/g, role.tone);

  // Append role-specific goal and persona directives
  systemPrompt += `\n\nActive Role: ${role.name}\nGoal: ${role.goal}\nPersona System Directives:\n${role.systemPrompt}`;

  // 2. Format role-scoped instructions
  const instructionLines =
    activeInstructions.length > 0
      ? activeInstructions
          .map((inst, i) => `${i + 1}. [POLICY: ${inst.title}] ${inst.ruleText}`)
          .join("\n")
      : "No special policy overrides active. Adhere strictly to standard operating procedures.";

  // 3. Format matched skill
  const skillSection = matchedSkill
    ? `Active SOP: ${matchedSkill.name}\nTrigger: ${matchedSkill.triggerConditions}\nSteps:\n${matchedSkill.stepsMarkdown}`
    : "No specialized SOP skill triggered. Apply standard knowledge grounding.";

  // 4. Resolve QA template
  const qaTemplate =
    customTemplate ||
    DEFAULT_PROMPTS.find((p) => p.key === "qa_answer") ||
    DEFAULT_PROMPTS[1];

  const userPrompt = qaTemplate.templateText
    .replace(/{knowledge_results}/g, formattedKnowledgeContext || "No verified documentation chunks found.")
    .replace(/{customer_name}/g, customerName)
    .replace(/{customer_query}/g, customerQuery)
    .replace(/{active_skill}/g, skillSection)
    .replace(/{active_instructions}/g, instructionLines);

  return {
    promptTemplateKey: qaTemplate.key,
    systemPrompt,
    userPrompt,
    composedVariables: {
      business_name: businessName,
      role_tone: role.tone,
      role_goal: role.goal,
      customer_name: customerName,
      customer_query: customerQuery,
      active_skill: matchedSkill ? matchedSkill.name : "none",
      active_instructions: activeInstructions.map((i) => i.title).join(", ") || "none",
    },
    selectedSkill: matchedSkill,
    appliedInstructions: activeInstructions.map((i) => i.title),
  };
}
