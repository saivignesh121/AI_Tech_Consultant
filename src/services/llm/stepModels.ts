export interface StepModelMeta {
  label: string;
  description: string;
  defaultModel: string;
}

export const DEFAULT_STEP_MODELS: Record<string, StepModelMeta> = {
  find_facts: {
    label: "Find Facts & Triage",
    description: "Token-efficient search triage, fact-finding, and query tagger.",
    defaultModel: "claude-haiku-5.5",
  },
  write_reply: {
    label: "Write the Answer / Reply",
    description: "Core consultant conversational reply generation and step-by-step guidance.",
    defaultModel: "claude-sonnet-5.5",
  },
  read_screenshot: {
    label: "Read a Screenshot (Vision)",
    description: "Multimodal inspection of customer screenshots, UI forms, and OCR error logs.",
    defaultModel: "gemini-3.8-flash",
  },
  improve_skill: {
    label: "Improve a Skill & Synthesize Lessons",
    description: "Autonomous lesson synthesis and high-reasoning skill SOP updates.",
    defaultModel: "claude-opus-5.5",
  },
  judge_eval: {
    label: "Judge Answers (Eval Lab)",
    description: "Ground truth evaluation benchmark judge and answer accuracy scoring.",
    defaultModel: "claude-opus-5.5",
  },
};
