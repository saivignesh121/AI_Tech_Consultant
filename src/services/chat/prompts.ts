/**
 * Default System Prompts & Variable Validation
 * Task 1.3: Master System, QA Template, Lesson Generator, Judge, Job Tagger
 */
export interface SystemPromptTemplate {
  key: string;
  description: string;
  templateText: string;
  requiredVariables: string[];
}

export const DEFAULT_PROMPTS: SystemPromptTemplate[] = [
  {
    key: "master_system",
    description: "Master governance prompt applied to all consultant chats.",
    templateText: `You are the AI Tech Consultant representing {business_name}.
You operate strictly within the provided knowledge base.
Rules:
1. Grounding: Answer ONLY using facts from the provided context. Never hallucinate features or policies.
2. Citations: Every claim must be attributed with an inline markdown citation [1], [2].
3. Safety: If a customer requests legal action, expresses severe anger, or demands a refund, trigger immediate escalation.
4. Tone: Adopt the persona and voice specified in your active agent role: {role_tone}.`,
    requiredVariables: ["business_name", "role_tone"],
  },
  {
    key: "qa_answer",
    description: "Question answering prompt combining user query, role instructions, and retrieved context.",
    templateText: `Context from Knowledge Brain:
{knowledge_results}

Active Skill:
{active_skill}

Active Instructions:
{active_instructions}

Customer Query:
{customer_query}

Provide a direct, complete, and cited response adhering to your active role persona.`,
    requiredVariables: ["knowledge_results", "customer_query"],
  },
  {
    key: "write_lesson",
    description: "Generates a structured Markdown lesson from a human correction or chat critique.",
    templateText: `You are the Lesson Synthesizer for the AI Tech Consultant.
A human expert corrected an AI answer.

Original Question:
{customer_query}

Original AI Answer:
{original_answer}

Human Expert Correction & Reason:
{human_critique}

Synthesize this correction into a clear, durable Markdown lesson formatted with:
- Title
- Category
- What Went Wrong
- Correct Protocol / Rule
- Few-Shot Example`,
    requiredVariables: ["customer_query", "original_answer", "human_critique"],
  },
  {
    key: "judge_eval",
    description: "Automated AI Judge grading an answer against expected ground truth on 0-100 scale.",
    templateText: `You are the impartial AI Evaluation Judge.
Evaluate the candidate answer against the test case and expected ground truth.

Question:
{question}

Expected Ground Truth Answer:
{expected_answer}

Candidate AI Answer:
{actual_answer}

Grade on a scale from 0 to 100 based on:
1. Accuracy & Correctness (50 points)
2. Grounding & Citations (30 points)
3. Tone & Completeness (20 points)

Return strictly JSON format:
{
  "score": number,
  "passed": boolean,
  "reason": "One concise line explaining the grade"
}`,
    requiredVariables: ["question", "expected_answer", "actual_answer"],
  },
  {
    key: "job_tagger",
    description: "Rapid classification of user request into task type and complexity for cost routing.",
    templateText: `Analyze the incoming customer message and classify its task type and complexity.

Message:
{user_message}

Return strictly JSON:
{
  "task_type": "find_facts" | "write_reply" | "read_screenshot" | "escalation",
  "complexity": "low" | "medium" | "high",
  "is_angry_or_legal": boolean
}`,
    requiredVariables: ["user_message"],
  },
];

/**
 * Validates that all required variables exist in the prompt template.
 * Returns missing variables if any.
 */
export function validatePromptVariables(templateText: string, requiredVars: string[]): {
  isValid: boolean;
  missingVariables: string[];
} {
  const missing: string[] = [];
  for (const v of requiredVars) {
    const pattern = new RegExp(`\\{${v}\\}`, "g");
    if (!pattern.test(templateText)) {
      missing.push(v);
    }
  }
  return {
    isValid: missing.length === 0,
    missingVariables: missing,
  };
}
