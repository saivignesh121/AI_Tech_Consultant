"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  Sparkles,
  FileCode,
  Users,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Save,
  Plus,
  Send,
  Zap,
  TrendingUp,
  Cpu,
  Layers,
  HelpCircle,
  Clock,
  DollarSign,
  ShieldCheck,
  BookOpen,
  FileText,
  History,
  Copy,
  Check,
  Wrench,
  Lock,
  Key,
  ShieldAlert,
  XCircle,
  UserCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { validatePromptVariables } from "@/services/chat/prompts";
import { SUPPORTED_MODELS } from "@/services/llm/pricing";

interface SkillVersionItem {
  id: string;
  skillId: string;
  versionNumber: number;
  stepsMarkdown: string;
  changeNotes: string | null;
  createdAt: string;
}

interface SkillExample {
  question: string;
  answer: string;
}

interface SkillItem {
  id: string;
  businessId: string;
  name: string;
  slug: string;
  description: string;
  triggerConditions: string;
  stepsMarkdown: string;
  examples: SkillExample[];
  currentVersionNumber: number;
  currentVersionId: string | null;
  versions: SkillVersionItem[];
  createdAt: string;
  updatedAt: string;
}

interface PromptVersion {
  id: string;
  versionNumber: number;
  templateText: string;
  variables: string[];
  changeSummary: string | null;
  createdAt: string;
}

interface PromptItem {
  id: string;
  key: string;
  description: string;
  currentVersionId: string | null;
  requiredVariables: string[];
  defaultTemplateText?: string;
  currentVersion: PromptVersion | null;
  versions: PromptVersion[];
}

interface RoleItem {
  id: string;
  name: string;
  slug: string;
  goal: string;
  tone: string;
  systemPrompt: string;
  modelId: string;
  allowedSkills: string[];
  knowledgeSources?: string[];
  handoverRule?: string;
  isBuiltin: boolean;
}

interface ChatTestMessage {
  sender: "user" | "consultant";
  text: string;
  telemetry?: {
    latencyMs: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    modelId: string;
    isBlocked?: boolean;
  };
}

export default function RolesAndPromptsPage() {
  const [activeTab, setActiveTab] = useState<"prompts" | "roles" | "skills" | "security_matrix">("prompts");
  const [switchingRoleName, setSwitchingRoleName] = useState<string | null>(null);
  const [roleSwitchToast, setRoleSwitchToast] = useState("");

  const handleSwitchRoleLive = async (targetRole: string) => {
    setSwitchingRoleName(targetRole);
    try {
      const res = await fetch("/api/auth/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole }),
      });
      if (res.ok) {
        setRoleSwitchToast(`Switched active role to ${targetRole.toUpperCase()}`);
        setTimeout(() => {
          window.location.reload();
        }, 800);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSwitchingRoleName(null);
    }
  };

  // ================= Prompts Tab State =================
  const [promptsList, setPromptsList] = useState<PromptItem[]>([]);
  const [selectedPromptKey, setSelectedPromptKey] = useState<string>("master_system");
  const [editorText, setEditorText] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const [selectedCompareVersionId, setSelectedCompareVersionId] = useState<string>("");
  const [diffMode, setDiffMode] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  // Prompt Caching Simulator State
  const [simModel, setSimModel] = useState("claude-sonnet-5.5");
  const [simTasks, setSimTasks] = useState(100);
  const [simStaticTokens, setSimStaticTokens] = useState(2500);
  const [simDynamicTokens, setSimDynamicTokens] = useState(200);
  const [simOutputTokens, setSimOutputTokens] = useState(350);
  const [simResult, setSimResult] = useState<{
    costWithoutCachingUsd: number;
    costWithCachingUsd: number;
    dollarsSavedUsd: number;
    percentSaved: number;
    breakdown: {
      cachingOff: { inputTokens: number; outputTokens: number };
      cachingOn: { cachedReadTokens: number; uncachedInputTokens: number };
    };
  } | null>(null);

  // ================= Roles Tab State =================
  const [rolesList, setRolesList] = useState<RoleItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: "",
    slug: "",
    goal: "",
    tone: "",
    systemPrompt: "",
    modelId: "claude-sonnet-5.5",
    allowedSkills: [] as string[],
    knowledgeSources: ["technical_docs", "sitemaps"] as string[],
    handoverRule: "Escalate to human expert on angry customer sentiment > 0.8, legal threats, or refund disputes.",
    isBuiltin: false,
  });
  const [savingRole, setSavingRole] = useState(false);
  const [roleSuccessMsg, setRoleSuccessMsg] = useState("");

  // Split-Screen Test Chat State
  const [testMessages, setTestMessages] = useState<ChatTestMessage[]>([
    {
      sender: "consultant",
      text: "Hello! I am initialized with your active role configuration. Ask any technical or consultative question to test my persona and response telemetry.",
    },
  ]);
  const [testInput, setTestInput] = useState("");
  const [testSending, setTestSending] = useState(false);

  // ================= Skills Tab State (Task 2.5) =================
  const [skillsList, setSkillsList] = useState<SkillItem[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [skillForm, setSkillForm] = useState({
    name: "",
    slug: "",
    description: "",
    triggerConditions: "",
    stepsMarkdown: "",
    examples: [{ question: "", answer: "" }],
    changeNotes: "",
  });
  const [savingSkill, setSavingSkill] = useState(false);
  const [skillSuccessMsg, setSkillSuccessMsg] = useState("");
  const [skillRollbackLoading, setSkillRollbackLoading] = useState(false);

  // AI Drafting Modal State
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [draftingSkill, setDraftingSkill] = useState(false);

  // Markdown File View Modal State
  const [markdownViewOpen, setMarkdownViewOpen] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);

  // Split-Screen Skill Test Chat State
  const [skillTestMessages, setSkillTestMessages] = useState<ChatTestMessage[]>([
    {
      sender: "consultant",
      text: "Skill test sandbox initialized. Enter a question or paste an email to test how this skill's step-by-step SOP resolves customer inquiries before saving.",
    },
  ]);
  const [skillTestInput, setSkillTestInput] = useState("");
  const [skillTestSending, setSkillTestSending] = useState(false);

  useEffect(() => {
    fetchPrompts();
    fetchRoles();
    fetchSkills();
    runSimulator();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "skills" || tabParam === "roles" || tabParam === "prompts") {
        setActiveTab(tabParam);
      }
    }
  }, []);

  // Update simulator whenever sliders change
  useEffect(() => {
    runSimulator();
  }, [simModel, simTasks, simStaticTokens, simDynamicTokens, simOutputTokens]);

  const fetchPrompts = async () => {
    try {
      const res = await fetch("/api/prompts");
      const data = await res.json();
      if (data.prompts) {
        setPromptsList(data.prompts);
        const current = data.prompts.find((p: PromptItem) => p.key === selectedPromptKey) || data.prompts[0];
        if (current) {
          setSelectedPromptKey(current.key);
          setEditorText(current.currentVersion?.templateText || "");
          if (current.versions.length > 1) {
            setSelectedCompareVersionId(current.versions[1].id);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/roles");
      const data = await res.json();
      if (data.roles && data.roles.length > 0) {
        setRolesList(data.roles);
        selectRole(data.roles[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectRole = (role: RoleItem) => {
    setSelectedRoleId(role.id);
    setRoleForm({
      name: role.name,
      slug: role.slug,
      goal: role.goal,
      tone: role.tone,
      systemPrompt: role.systemPrompt,
      modelId: role.modelId,
      allowedSkills: role.allowedSkills || [],
      knowledgeSources: role.knowledgeSources || ["technical_docs", "sitemaps"],
      handoverRule: role.handoverRule || "Escalate to human expert on angry customer sentiment > 0.8, legal threats, or refund disputes.",
      isBuiltin: role.isBuiltin,
    });
  };

  const fetchSkills = async () => {
    try {
      const res = await fetch("/api/brain/skills");
      const data = await res.json();
      if (data.skills && data.skills.length > 0) {
        setSkillsList(data.skills);
        if (!selectedSkillId) {
          selectSkill(data.skills[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectSkill = (skill: SkillItem) => {
    setSelectedSkillId(skill.id);
    setSkillForm({
      name: skill.name,
      slug: skill.slug,
      description: skill.description,
      triggerConditions: skill.triggerConditions,
      stepsMarkdown: skill.stepsMarkdown,
      examples: skill.examples && skill.examples.length > 0 ? skill.examples : [{ question: "", answer: "" }],
      changeNotes: "",
    });
  };

  const handleNewSkillByHand = () => {
    setSelectedSkillId(null);
    setSkillForm({
      name: "",
      slug: "",
      description: "",
      triggerConditions: "",
      stepsMarkdown: `# New Skill SOP Protocol\n\n## When to Use This Skill\nDescribe query trigger here...\n\n## Step-by-Step Resolution Protocol\n1. Initial verification...\n2. Configure parameter...\n3. Execute validation command...\n`,
      examples: [{ question: "", answer: "" }],
      changeNotes: "Initial human-authored baseline",
    });
    setSkillSuccessMsg("Editor cleared. You can now write your skill by hand.");
    setTimeout(() => setSkillSuccessMsg(""), 3000);
  };

  const handleSaveSkillVersion = async () => {
    if (!skillForm.name.trim() || !skillForm.stepsMarkdown.trim()) return;
    setSavingSkill(true);
    setSkillSuccessMsg("");
    try {
      const res = await fetch("/api/brain/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          id: selectedSkillId,
          name: skillForm.name,
          slug: skillForm.slug,
          description: skillForm.description,
          triggerConditions: skillForm.triggerConditions,
          stepsMarkdown: skillForm.stepsMarkdown,
          examples: skillForm.examples.filter((ex) => ex.question.trim() || ex.answer.trim()),
          changeNotes: skillForm.changeNotes || "Updated via Skill Studio",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSkillSuccessMsg(data.message || "Skill saved successfully!");
        await fetchSkills();
        if (data.skill) {
          selectSkill(data.skill);
        }
        setTimeout(() => setSkillSuccessMsg(""), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingSkill(false);
    }
  };

  const handleSkillRollback = async (versionId: string) => {
    if (!selectedSkillId) return;
    setSkillRollbackLoading(true);
    try {
      const res = await fetch("/api/brain/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rollback",
          id: selectedSkillId,
          versionId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSkillSuccessMsg(data.message);
        await fetchSkills();
        if (data.skill) {
          selectSkill(data.skill);
        }
        setTimeout(() => setSkillSuccessMsg(""), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSkillRollbackLoading(false);
    }
  };

  const handleDraftSkill = async () => {
    if (!draftName.trim() || !draftDesc.trim()) return;
    setDraftingSkill(true);
    try {
      const res = await fetch("/api/brain/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "draft",
          name: draftName,
          description: draftDesc,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.draftedSkill) {
        setSelectedSkillId(null);
        setSkillForm({
          name: data.draftedSkill.name,
          slug: data.draftedSkill.slug,
          description: data.draftedSkill.description,
          triggerConditions: data.draftedSkill.triggerConditions,
          stepsMarkdown: data.draftedSkill.stepsMarkdown,
          examples: data.draftedSkill.examples,
          changeNotes: "AI-drafted baseline from description",
        });
        setDraftModalOpen(false);
        setDraftName("");
        setDraftDesc("");
        setSkillSuccessMsg(`AI drafted skill '${data.draftedSkill.name}'! Test it in the chat beside and click Save.`);
        setTimeout(() => setSkillSuccessMsg(""), 5000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDraftingSkill(false);
    }
  };

  const handleSendSkillTestChat = async () => {
    if (!skillTestInput.trim() || skillTestSending) return;
    const userMsg = skillTestInput;
    setSkillTestInput("");
    setSkillTestSending(true);

    setSkillTestMessages((prev) => [...prev, { sender: "user", text: userMsg }]);

    try {
      const res = await fetch("/api/brain/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          testQuery: userMsg,
          name: skillForm.name || "Draft Skill",
          stepsMarkdown: skillForm.stepsMarkdown,
          roleTone: "Technical, step-by-step resolution",
        }),
      });
      const data = await res.json();
      if (data.success && data.testResult) {
        setSkillTestMessages((prev) => [
          ...prev,
          {
            sender: "consultant",
            text: data.testResult.answer,
            telemetry: {
              latencyMs: data.testResult.latencyMs,
              inputTokens: data.testResult.inputTokens,
              outputTokens: data.testResult.outputTokens,
              costUsd: data.testResult.costUsd,
              modelId: "claude-sonnet-5.5",
            },
          },
        ]);
      }
    } catch (e) {
      console.error(e);
      setSkillTestMessages((prev) => [
        ...prev,
        {
          sender: "consultant",
          text: "Error executing skill test call.",
        },
      ]);
    } finally {
      setSkillTestSending(false);
    }
  };

  const runSimulator = async () => {
    try {
      const res = await fetch("/api/prompts/caching-simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: simModel,
          taskCount: simTasks,
          staticPromptTokens: simStaticTokens,
          dynamicPromptTokens: simDynamicTokens,
          outputTokensPerCall: simOutputTokens,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSimResult(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Variable validation check
  const activePrompt = promptsList.find((p) => p.key === selectedPromptKey);
  const validation = validatePromptVariables(editorText, activePrompt?.requiredVariables || []);

  const handleSavePromptVersion = async () => {
    if (!validation.isValid) return;
    setSavingPrompt(true);
    setSaveSuccessMsg("");
    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptId: activePrompt?.id,
          key: selectedPromptKey,
          templateText: editorText,
          changeSummary: changeSummary || "Updated via Prompt Studio",
        }),
      });
      if (res.ok) {
        setSaveSuccessMsg("New prompt version saved successfully!");
        setChangeSummary("");
        fetchPrompts();
        setTimeout(() => setSaveSuccessMsg(""), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleRollback = async (versionId: string) => {
    if (!activePrompt) return;
    setRollbackLoading(true);
    try {
      const res = await fetch("/api/prompts/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptId: activePrompt.id,
          versionId,
        }),
      });
      if (res.ok) {
        const targetVer = activePrompt.versions.find((v) => v.id === versionId);
        if (targetVer) setEditorText(targetVer.templateText);
        setSaveSuccessMsg(`Prompt rolled back to Version ${targetVer?.versionNumber}`);
        fetchPrompts();
        setTimeout(() => setSaveSuccessMsg(""), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRollbackLoading(false);
    }
  };

  const handleRestoreDefault = () => {
    if (!activePrompt) return;
    const defaultText =
      activePrompt.defaultTemplateText ||
      activePrompt.versions[activePrompt.versions.length - 1]?.templateText ||
      "";
    setEditorText(defaultText);
    setChangeSummary("Restored to built-in default baseline template");
    setSaveSuccessMsg(
      `Restored built-in default template for ${activePrompt.key}. You can edit or click "Save New Version" to commit it.`
    );
    setTimeout(() => setSaveSuccessMsg(""), 5000);
  };

  const handleSaveRole = async () => {
    setSavingRole(true);
    setRoleSuccessMsg("");
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRoleId,
          ...roleForm,
        }),
      });
      if (res.ok) {
        setRoleSuccessMsg("Role configuration updated successfully!");
        fetchRoles();
        setTimeout(() => setRoleSuccessMsg(""), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingRole(false);
    }
  };

  const handleSendTestChat = async () => {
    if (!testInput.trim() || testSending) return;
    const userMsg = testInput;
    setTestInput("");
    setTestSending(true);

    // Add user message to UI
    setTestMessages((prev) => [...prev, { sender: "user", text: userMsg }]);

    try {
      const res = await fetch("/api/roles/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: selectedRoleId,
          roleSlug: roleForm.slug,
          systemPrompt: roleForm.systemPrompt,
          modelId: roleForm.modelId,
          tone: roleForm.tone,
          message: userMsg,
        }),
      });
      const data = await res.json();
      setTestMessages((prev) => [
        ...prev,
        {
          sender: "consultant",
          text: data.reply,
          telemetry: {
            latencyMs: data.latencyMs,
            inputTokens: data.inputTokens,
            outputTokens: data.outputTokens,
            costUsd: data.costUsd,
            modelId: data.modelId,
            isBlocked: data.isBlocked,
          },
        },
      ]);
    } catch (e) {
      console.error(e);
      setTestMessages((prev) => [
        ...prev,
        {
          sender: "consultant",
          text: "Test invocation encountered a connection error.",
        },
      ]);
    } finally {
      setTestSending(false);
    }
  };

  const comparedVersion = activePrompt?.versions.find((v) => v.id === selectedCompareVersionId);
  const activeSkill = skillsList.find((s) => s.id === selectedSkillId) || skillsList[0];

  const formatCurrentSkillAsMarkdown = () => {
    return `---
name: "${skillForm.name || "Untitled Skill"}"
slug: "${skillForm.slug || "untitled"}"
version: ${activeSkill?.currentVersionNumber || 1}
description: "${skillForm.description || ""}"
trigger_conditions: "${skillForm.triggerConditions || ""}"
---

${skillForm.stepsMarkdown}

## Verified Few-Shot Examples
${skillForm.examples
  .filter((e) => e.question && e.answer)
  .map(
    (ex, i) => `### Example ${i + 1}
**Question:** ${ex.question}
**Answer:** ${ex.answer}`
  )
  .join("\n\n")}
`;
  };

  return (
    <AppShell breadcrumbs={[{ label: "Role & Prompt Studio" }]}>
      <div className="space-y-8">
        {/* Header Banner: Proteus Royal Blue to Violet/Purple */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1D4ED8] via-[#4338CA] to-[#7E22CE] text-white p-8 md:p-10 shadow-md">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-cyan-200 text-xs font-mono font-medium">
                <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                <span>Autonomous Prompt &amp; Role Engineering</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Role &amp; Prompt Studio
              </h1>
              <p className="text-sm text-purple-100 max-w-2xl leading-relaxed">
                Refine governance prompts with variable validation, simulate prompt caching savings, and test agent personas live.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selection in Rounded-Full Pills */}
        <div className="flex flex-wrap gap-2.5 items-center pb-2 border-b border-[#DCE6F5]">
          <button
            onClick={() => setActiveTab("prompts")}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-full transition whitespace-nowrap shadow-xs ${
              activeTab === "prompts"
                ? "bg-[#1D4ED8] text-white shadow-sm font-bold"
                : "bg-white text-[#4A5B78] border border-[#DCE6F5] hover:bg-[#EEF4FF] hover:text-[#0B1B3A]"
            }`}
          >
            <FileCode className="h-3.5 w-3.5" />
            <span>Prompt Studio &amp; Caching Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab("roles")}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-full transition whitespace-nowrap shadow-xs ${
              activeTab === "roles"
                ? "bg-[#1D4ED8] text-white shadow-sm font-bold"
                : "bg-white text-[#4A5B78] border border-[#DCE6F5] hover:bg-[#EEF4FF] hover:text-[#0B1B3A]"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Role Studio &amp; Persona Sandbox</span>
          </button>

          <button
            onClick={() => setActiveTab("skills")}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-full transition whitespace-nowrap shadow-xs ${
              activeTab === "skills"
                ? "bg-[#1D4ED8] text-white shadow-sm font-bold"
                : "bg-white text-[#4A5B78] border border-[#DCE6F5] hover:bg-[#EEF4FF] hover:text-[#0B1B3A]"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Structured Skills &amp; SOPs</span>
          </button>

          <button
            onClick={() => setActiveTab("security_matrix")}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-full transition whitespace-nowrap shadow-xs ${
              activeTab === "security_matrix"
                ? "bg-[#1D4ED8] text-white shadow-sm font-bold"
                : "bg-white text-[#4A5B78] border border-[#DCE6F5] hover:bg-[#EEF4FF] hover:text-[#0B1B3A]"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Role Security Matrix &amp; Fencing</span>
          </button>
        </div>

        {/* ================= TAB 1: PROMPT STUDIO (Task 1.3) ================= */}
        {activeTab === "prompts" && (
          <div className="space-y-6">
            {/* Prompt Selector Pills */}
            <div className="flex flex-wrap gap-2">
              {promptsList.map((p) => (
                <button
                  key={p.key}
                  onClick={() => {
                    setSelectedPromptKey(p.key);
                    setEditorText(p.currentVersion?.templateText || "");
                    if (p.versions.length > 1) {
                      setSelectedCompareVersionId(p.versions[1].id);
                    }
                  }}
                  className={`rounded-lg px-3.5 py-2 text-xs font-medium transition flex items-center gap-2 ${
                    selectedPromptKey === p.key
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "bg-white border border-[#DCE6F5] text-gray-300 hover:border-[#C3D3EA]"
                  }`}
                >
                  <FileCode className="h-3.5 w-3.5" />
                  <span>{p.key}</span>
                  {p.currentVersion && (
                    <span className="rounded bg-[#EEF4FF] text-[#2563EB] px-1.5 py-0.2 font-mono text-[10px]">
                      v{p.currentVersion.versionNumber}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Notification alert */}
            {saveSuccessMsg && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {/* Self-Improve Loop Notice (Task 1.3 requirement) */}
            <div className="rounded-xl border border-[#DCE6F5] bg-indigo-50 p-3 text-xs text-indigo-300 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                <span>
                  <strong>Self-Improve Loop Integration:</strong> Proposed prompt patches from automated runs (Feature 5) are tested on isolated branches and only publish as new versions here after human approval.
                </span>
              </div>
              <a
                href="/approvals"
                className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 underline shrink-0"
              >
                Approvals Inbox →
              </a>
            </div>

            {/* Validation Warning Alert (Task 1.3 requirement) */}
            {!validation.isValid && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 text-xs text-amber-300 flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Variable Validation Warning:</strong> Your template is missing required system variables:{" "}
                  <span className="font-mono text-amber-200 font-semibold">
                    {validation.missingVariables.map((v) => `{${v}}`).join(", ")}
                  </span>
                  . You must include these variables before publishing a new version.
                </div>
              </div>
            )}

            {/* Main Prompt Editor Area */}
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#DCE6F5] pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#0B1B3A] flex items-center gap-2">
                    Template: <span className="font-mono text-indigo-400">{selectedPromptKey}</span>
                  </h3>
                  <p className="text-xs text-gray-400">{activePrompt?.description}</p>
                </div>

                {/* Version Controls */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Compare with:</span>
                  <select
                    value={selectedCompareVersionId}
                    onChange={(e) => setSelectedCompareVersionId(e.target.value)}
                    className="rounded-lg border border-[#C3D3EA] bg-white px-2 py-1 text-xs text-gray-200 focus:outline-none max-w-[200px] truncate"
                  >
                    {activePrompt?.versions.map((v) => (
                      <option key={v.id} value={v.id}>
                        v{v.versionNumber} {v.changeSummary ? `— ${v.changeSummary}` : `(${new Date(v.createdAt).toLocaleDateString()})`}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setDiffMode(!diffMode)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      diffMode ? "bg-[#2563EB] text-white" : "border border-[#C3D3EA] bg-white text-[#4A5B78] hover:bg-[#EEF4FF]"
                    }`}
                  >
                    {diffMode ? "Close Diff" : "View Diff"}
                  </button>
                  {selectedCompareVersionId &&
                    selectedCompareVersionId !== activePrompt?.currentVersionId && (
                      <button
                        onClick={() => handleRollback(selectedCompareVersionId)}
                        disabled={rollbackLoading}
                        className="flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-300 transition"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Rollback to v{comparedVersion?.versionNumber}</span>
                      </button>
                    )}
                  <button
                    onClick={handleRestoreDefault}
                    className="flex items-center gap-1 rounded-lg border border-[#BFDBFE] bg-blue-50 hover:bg-blue-100 px-2.5 py-1 text-xs font-medium text-cyan-300 transition"
                    title="Load built-in default template into editor"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Restore Default</span>
                  </button>
                </div>
              </div>

              {/* Diff Viewer or Editor */}
              {diffMode && comparedVersion ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-semibold text-gray-400 block mb-1">
                      Historical Version (v{comparedVersion.versionNumber})
                    </span>
                    <pre className="rounded-lg border-l-4 border-l-red-500 border border-red-200 bg-red-50 p-4 text-xs font-mono text-red-900 overflow-x-auto whitespace-pre-wrap h-80">
                      {comparedVersion.templateText}
                    </pre>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-indigo-400 block mb-1">
                      Current Draft / Active (v{activePrompt?.currentVersion?.versionNumber})
                    </span>
                    <pre className="rounded-lg border-l-4 border-l-emerald-500 border border-emerald-200 bg-emerald-50 p-4 text-xs font-mono text-emerald-900 overflow-x-auto whitespace-pre-wrap h-80">
                      {editorText}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    rows={12}
                    value={editorText}
                    onChange={(e) => setEditorText(e.target.value)}
                    className="w-full rounded-xl border border-[#DCE6F5] bg-[#F1F6FF] p-4 text-xs font-mono text-[#1E3A8A] focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] focus:outline-none"
                    placeholder="Enter system prompt instructions..."
                  />

                  {/* Variables Helper Pills */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400 font-medium">Required Variables:</span>
                    {activePrompt?.requiredVariables.map((v) => {
                      const present = editorText.includes(`{${v}}`);
                      return (
                        <span
                          key={v}
                          className={`rounded px-2 py-0.5 text-[11px] font-mono border ${
                            present
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20 animate-pulse"
                          }`}
                        >
                          {present ? "✓" : "✗"} &#123;{v}&#125;
                        </span>
                      );
                    })}
                  </div>

                  {/* Change Summary Input & Save */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-[#DCE6F5]">
                    <input
                      type="text"
                      value={changeSummary}
                      onChange={(e) => setChangeSummary(e.target.value)}
                      placeholder="Summary of changes (e.g. Added citation grounding rule)"
                      className="flex-1 rounded-lg border border-[#C3D3EA] bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />

                    <button
                      onClick={handleSavePromptVersion}
                      disabled={!validation.isValid || savingPrompt}
                      className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-semibold text-white transition disabled:opacity-40 shadow-sm"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>{savingPrompt ? "Saving..." : "Save New Version"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ================= 100-Run Prompt Caching Cost Simulator (Task 1.3) ================= */}
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-[#DCE6F5] pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-400" />
                  <div>
                    <h3 className="text-sm font-semibold text-[#0B1B3A]">Prompt Caching &amp; Cost Simulator</h3>
                    <p className="text-xs text-gray-400">
                      Simulate 100 customer tech consultations to prove exact dollar and percentage savings with prompt caching ON.
                    </p>
                  </div>
                </div>
                <span className="rounded bg-indigo-500/10 text-indigo-400 text-xs px-2.5 py-1 font-mono border border-[#DCE6F5]">
                  Anthropic Claude Prompt Caching API
                </span>
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Model: <span className="font-mono text-indigo-400">{simModel}</span>
                  </label>
                  <select
                    value={simModel}
                    onChange={(e) => setSimModel(e.target.value)}
                    className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="claude-sonnet-5.5">Claude Sonnet 5.5 ($2.00 / $10.00)</option>
                    <option value="claude-haiku-5.5">Claude Haiku 5.5 ($0.10 / $0.50)</option>
                    <option value="claude-opus-5.5">Claude Opus 5.5 ($4.00 / $20.00)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Static Knowledge Tokens: <span className="font-mono text-indigo-400">{simStaticTokens}</span>
                  </label>
                  <input
                    type="range"
                    min={1000}
                    max={10000}
                    step={250}
                    value={simStaticTokens}
                    onChange={(e) => setSimStaticTokens(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                    <span>1,000</span>
                    <span>10,000</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Dynamic User Tokens: <span className="font-mono text-indigo-400">{simDynamicTokens}</span>
                  </label>
                  <input
                    type="range"
                    min={50}
                    max={1000}
                    step={50}
                    value={simDynamicTokens}
                    onChange={(e) => setSimDynamicTokens(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                    <span>50</span>
                    <span>1,000</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Simulated Invocations: <span className="font-mono text-indigo-400">{simTasks}</span>
                  </label>
                  <input
                    type="range"
                    min={20}
                    max={500}
                    step={20}
                    value={simTasks}
                    onChange={(e) => setSimTasks(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                    <span>20</span>
                    <span>500</span>
                  </div>
                </div>
              </div>

              {/* Results Comparison Grid */}
              {simResult && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="rounded-xl border border-[#DCE6F5] bg-[#F6F9FF] p-4">
                    <span className="text-xs text-gray-400 block">Caching OFF Cost</span>
                    <div className="text-2xl font-bold text-gray-300 font-mono mt-1">
                      ${simResult.costWithoutCachingUsd.toFixed(6)}
                    </div>
                    <span className="text-[11px] text-gray-500 mt-1 block">Full rate on all {simTasks} calls</span>
                  </div>

                  <div className="rounded-xl border border-[#BFDBFE] bg-indigo-50 p-4">
                    <span className="text-xs text-indigo-300 block">Caching ON Cost</span>
                    <div className="text-2xl font-bold text-indigo-400 font-mono mt-1">
                      ${simResult.costWithCachingUsd.toFixed(6)}
                    </div>
                    <span className="text-[11px] text-indigo-300/80 mt-1 block">90% discount on static cache reads</span>
                  </div>

                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 p-4">
                    <span className="text-xs text-emerald-300 block">Demonstrated Savings</span>
                    <div className="text-2xl font-bold text-emerald-400 font-mono mt-1 flex items-baseline gap-2">
                      <span>${simResult.dollarsSavedUsd.toFixed(6)}</span>
                      <span className="text-xs font-semibold text-emerald-300">({simResult.percentSaved}%)</span>
                    </div>
                    <span className="text-[11px] text-emerald-400/80 mt-1 block">
                      {simResult.breakdown.cachingOn.cachedReadTokens.toLocaleString()} tokens cached
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: AGENT ROLES & SPLIT-SCREEN TEST (Task 1.4) ================= */}
        {activeTab === "roles" && (
          <div className="space-y-6">
            {roleSuccessMsg && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>{roleSuccessMsg}</span>
              </div>
            )}

            {/* Split Screen Grid: Left = Role Editor, Right = Live Test Chat */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (6 Cols): Role Selector & Form */}
              <div className="lg:col-span-6 space-y-4">
                {/* Role Selector Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {rolesList.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => selectRole(r)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition whitespace-nowrap ${
                        selectedRoleId === r.id
                          ? "bg-indigo-600 text-white shadow"
                          : "bg-white border border-[#DCE6F5] text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {r.name}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setSelectedRoleId(null);
                      setRoleForm({
                        name: "Custom Specialist",
                        slug: "custom-specialist",
                        goal: "Tailored domain expert for technical troubleshooting.",
                        tone: "Professional, structured, precise",
                        systemPrompt: "You are a specialized consultant for...",
                        modelId: "claude-sonnet-5.5",
                        allowedSkills: ["answer_from_brain", "write_reply"],
                        knowledgeSources: ["technical_docs", "sitemaps"],
                        handoverRule: "Escalate to human expert on angry customer sentiment > 0.8, legal threats, or refund disputes.",
                        isBuiltin: false,
                      });
                    }}
                    className="flex items-center gap-1 rounded-lg border border-dashed border-[#C3D3EA] bg-white px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900"
                  >
                    <Plus className="h-3 w-3" />
                    <span>New Role</span>
                  </button>
                </div>

                {/* Role Configuration Form */}
                <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-[#DCE6F5] pb-3">
                    <h3 className="text-sm font-semibold text-[#0B1B3A]">Configure Role Persona</h3>
                    {roleForm.isBuiltin && (
                      <span className="rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-mono px-2 py-0.5 border border-[#DCE6F5]">
                        Built-in Core Role
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Role Name</label>
                      <input
                        type="text"
                        value={roleForm.name}
                        onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                        className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Default Model</label>
                      <select
                        value={roleForm.modelId}
                        onChange={(e) => setRoleForm({ ...roleForm, modelId: e.target.value })}
                        className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none"
                      >
                        {Object.values(SUPPORTED_MODELS).map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.displayName} ({m.provider})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Persona Tone</label>
                    <input
                      type="text"
                      value={roleForm.tone}
                      onChange={(e) => setRoleForm({ ...roleForm, tone: e.target.value })}
                      placeholder="e.g. Technical, precise, step-by-step, code-first"
                      className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Operational Goal</label>
                    <input
                      type="text"
                      value={roleForm.goal}
                      onChange={(e) => setRoleForm({ ...roleForm, goal: e.target.value })}
                      placeholder="e.g. Provide technical step-by-step fixes..."
                      className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">System Prompt Persona</label>
                    <textarea
                      rows={5}
                      value={roleForm.systemPrompt}
                      onChange={(e) => setRoleForm({ ...roleForm, systemPrompt: e.target.value })}
                      className="w-full rounded-lg border border-[#C3D3EA] bg-white p-3 text-xs font-mono text-gray-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Authorized Role Skills Matrix (Task 1.4) */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Authorized Role Skills
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { id: "answer_from_brain", label: "Answer from Knowledge Brain", desc: "Attributed answers with citations" },
                        { id: "write_reply", label: "Write Reply Human Can Send", desc: "Draft ready-to-send polite customer replies" },
                        { id: "create_expert_task", label: "Create Expert Task", desc: "File task for human specialist review" },
                        { id: "share_price", label: "Share a Price (Quote & Next Steps)", desc: "Commercial quote & tier rates (AI Consultant only)" },
                      ].map((sk) => {
                        const isChecked = roleForm.allowedSkills?.includes(sk.id);
                        const isPrice = sk.id === "share_price";
                        const isConsultant = roleForm.slug === "ai-consultant";
                        const disabled = isPrice && !isConsultant;

                        return (
                          <div
                            key={sk.id}
                            onClick={() => {
                              if (disabled) return;
                              const current = roleForm.allowedSkills || [];
                              const updated = current.includes(sk.id)
                                ? current.filter((s) => s !== sk.id)
                                : [...current, sk.id];
                              setRoleForm({ ...roleForm, allowedSkills: updated });
                            }}
                            className={`p-2.5 rounded-lg border text-xs cursor-pointer transition flex items-start gap-2.5 ${
                              isChecked
                                ? "border-[#2563EB] bg-blue-50 text-cyan-200"
                                : disabled
                                ? "border-[#DCE6F5] bg-[#EEF4FF] text-gray-500 cursor-not-allowed opacity-60"
                                : "border-[#DCE6F5] bg-white text-[#4A5B78] hover:border-[#C3D3EA]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={disabled}
                              onChange={() => {}}
                              className="mt-0.5 accent-cyan-400"
                            />
                            <div>
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                <span>{sk.label}</span>
                                {isPrice && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    AI Consultant Only
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-400">{sk.desc}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Grounding Knowledge Sources */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Grounding Knowledge Sources
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {["technical_docs", "sitemaps", "github_repo", "troubleshooting_sop", "pricing_matrix"].map((src) => {
                        const isSelected = roleForm.knowledgeSources?.includes(src);
                        return (
                          <button
                            key={src}
                            type="button"
                            onClick={() => {
                              const curr = roleForm.knowledgeSources || [];
                              const updated = curr.includes(src) ? curr.filter((s) => s !== src) : [...curr, src];
                              setRoleForm({ ...roleForm, knowledgeSources: updated });
                            }}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition ${
                              isSelected
                                ? "border-cyan-400 bg-blue-100 text-cyan-300"
                                : "border-[#DCE6F5] bg-white text-[#4A5B78] hover:border-[#C3D3EA]"
                            }`}
                          >
                            {src}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Handover-to-Human Rule */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Handover-to-Human Rule
                    </label>
                    <textarea
                      rows={2}
                      value={roleForm.handoverRule || ""}
                      onChange={(e) => setRoleForm({ ...roleForm, handoverRule: e.target.value })}
                      placeholder="e.g. Escalate to human expert on angry customer sentiment > 0.8, legal threats, or refund disputes."
                      className="w-full rounded-lg border border-[#C3D3EA] bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveRole}
                      disabled={savingRole}
                      className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition shadow-sm disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>{savingRole ? "Saving Role..." : "Save Role Configuration"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column (6 Cols): Split-Screen Live Test Chat Sandbox (Task 1.4) */}
              <div className="lg:col-span-6 flex flex-col rounded-xl border border-[#DCE6F5] bg-white shadow-sm overflow-hidden h-[620px]">
                {/* Chat Sandbox Header */}
                <div className="border-b border-[#DCE6F5] p-4 bg-[#F6F9FF] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-400" />
                    <div>
                      <h4 className="text-xs font-semibold text-[#0B1B3A]">Live Role Test Sandbox</h4>
                      <p className="text-[10px] text-gray-400">
                        Testing as: <span className="text-indigo-300 font-mono">{roleForm.name}</span> ({roleForm.modelId})
                      </p>
                    </div>
                  </div>
                  <span className="rounded bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 font-mono border border-emerald-500/20">
                    Live Telemetry
                  </span>
                </div>

                {/* Messages Stream */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {testMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                    >
                      {/* Telemetry metadata chip above consultant response */}
                      {msg.telemetry && (
                        <div className="mb-1 flex items-center gap-2 text-[10px] font-mono text-gray-400 bg-[#F6F9FF] px-2 py-0.5 rounded border border-[#DCE6F5]">
                          <span className="text-amber-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {msg.telemetry.latencyMs}ms
                          </span>
                          <span>&bull;</span>
                          <span>
                            {msg.telemetry.inputTokens}in / {msg.telemetry.outputTokens}out
                          </span>
                          <span>&bull;</span>
                          <span className="text-emerald-400 font-semibold">
                            ${msg.telemetry.costUsd.toFixed(6)}
                          </span>
                        </div>
                      )}

                      <div
                        className={`rounded-xl p-3.5 text-xs max-w-[85%] leading-relaxed ${
                          msg.sender === "user"
                            ? "bg-indigo-600 text-white rounded-br-none"
                            : "bg-[#EEF4FF]/90 text-gray-200 border border-[#DCE6F5] rounded-bl-none whitespace-pre-wrap font-sans"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {testSending && (
                    <div className="flex items-center gap-2 text-xs text-gray-400 font-mono p-2">
                      <div className="h-2 w-2 rounded-full bg-indigo-500 animate-ping"></div>
                      <span>Synthesizing response adhering to {roleForm.name} persona...</span>
                    </div>
                  )}
                </div>

                {/* Pre-fill Quick Chips */}
                <div className="px-4 py-2 bg-[#F6F9FF] border-t border-[#DCE6F5] flex items-center gap-1.5 overflow-x-auto text-[11px]">
                  <span className="text-gray-500 whitespace-nowrap">Try:</span>
                  <button
                    onClick={() => setTestInput("How do I configure custom webhook alerts?")}
                    className="text-slate-500 hover:text-slate-900 rounded bg-[#EEF4FF] px-2 py-0.5 truncate max-w-[150px]"
                  >
                    Webhook alerts?
                  </button>
                  <button
                    onClick={() => setTestInput("I need quotation pricing for 50 users.")}
                    className="text-slate-500 hover:text-slate-900 rounded bg-[#EEF4FF] px-2 py-0.5 truncate max-w-[150px]"
                  >
                    50-user quote?
                  </button>
                  <button
                    onClick={() => setTestInput("I am furious, give me a full refund right now!")}
                    className="text-slate-500 hover:text-slate-900 rounded bg-[#EEF4FF] px-2 py-0.5 truncate max-w-[150px]"
                  >
                    Angry escalation test
                  </button>
                </div>

                {/* Chat Input Bar */}
                <div className="p-3 bg-[#F1F6FF] border-t border-[#DCE6F5] flex items-center gap-2">
                  <input
                    type="text"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendTestChat();
                    }}
                    placeholder={`Ask ${roleForm.name} a question...`}
                    className="flex-1 rounded-lg border border-[#DCE6F5] bg-[#EEF4FF] px-3 py-2 text-xs text-slate-900 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleSendTestChat}
                    disabled={!testInput.trim() || testSending}
                    className="rounded-lg bg-indigo-600 hover:bg-indigo-500 p-2 text-white transition disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: SKILLS & SOP STUDIO (Task 2.5) ================= */}
        {activeTab === "skills" && (
          <div className="space-y-6">
            {/* Success message banner */}
            {skillSuccessMsg && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 p-3.5 text-xs text-emerald-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span>{skillSuccessMsg}</span>
                </div>
                <button
                  onClick={() => setSkillSuccessMsg("")}
                  className="text-slate-500 hover:text-slate-900 text-xs"
                >
                  &times;
                </button>
              </div>
            )}

            {/* Top Toolbar & Skills Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {skillsList.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => selectSkill(skill)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition border ${
                      selectedSkillId === skill.id
                        ? "bg-purple-50 border-purple-500 text-purple-300"
                        : "bg-[#EEF4FF] border-[#DCE6F5] text-gray-400 hover:border-[#C3D3EA] hover:text-gray-200"
                    }`}
                  >
                    <BookOpen className="h-3.5 w-3.5 text-purple-400" />
                    <span>{skill.name}</span>
                    <span className="rounded bg-purple-500/20 text-purple-300 text-[10px] px-1.5 py-0.5 font-bold">
                      v{skill.currentVersionNumber}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleNewSkillByHand}
                  className="flex items-center gap-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition border border-[#C3D3EA]"
                >
                  <Plus className="h-3.5 w-3.5 text-gray-300" />
                  <span>Write by Hand</span>
                </button>

                <button
                  onClick={() => setDraftModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 text-xs font-medium text-white transition shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5 text-indigo-200" />
                  <span>Draft with AI</span>
                </button>
              </div>
            </div>

            {/* Split Screen: Left = Editor & Version History, Right = Test Chat */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (7 Cols): Skill SOP Editor */}
              <div className="lg:col-span-7 space-y-5">
                <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-[#DCE6F5] pb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#0B1B3A] flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-purple-400" />
                        <span>Skill Specification &amp; SOP Instructions</span>
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Markdown file skill definition. The agent autonomously matches questions and emails to this procedure.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {activeSkill && (
                        <span className="text-[11px] font-mono bg-purple-950/50 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded">
                          Active Version: v{activeSkill.currentVersionNumber}
                        </span>
                      )}
                      <button
                        onClick={() => setMarkdownViewOpen(true)}
                        className="flex items-center gap-1 text-[11px] font-mono text-slate-600 hover:text-slate-900 bg-[#EEF4FF] border border-[#DCE6F5] hover:border-[#C3D3EA] px-2.5 py-1 rounded transition"
                      >
                        <FileText className="h-3 w-3 text-gray-400" />
                        <span>View .md</span>
                      </button>
                    </div>
                  </div>

                  {/* Basic Metadata Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-400 mb-1">Skill Name *</label>
                      <input
                        type="text"
                        value={skillForm.name}
                        onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
                        placeholder="e.g. DNS & Custom CNAME Setup"
                        className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Slug Identifier</label>
                      <input
                        type="text"
                        value={skillForm.slug}
                        onChange={(e) => setSkillForm({ ...skillForm, slug: e.target.value })}
                        placeholder="dns-cname-setup"
                        className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Short Description</label>
                    <input
                      type="text"
                      value={skillForm.description}
                      onChange={(e) => setSkillForm({ ...skillForm, description: e.target.value })}
                      placeholder="e.g. Configuring custom root domains and subdomains with Cloudflare DNS proxying."
                      className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* When to Use It (Trigger Conditions) */}
                  <div>
                    <label className="block text-xs font-medium text-amber-300 mb-1">
                      When to Use This Skill (Trigger Conditions) *
                    </label>
                    <textarea
                      rows={2}
                      value={skillForm.triggerConditions}
                      onChange={(e) => setSkillForm({ ...skillForm, triggerConditions: e.target.value })}
                      placeholder="When a customer asks about domain setup, custom CNAME, mapping a subdomain, or DNS records."
                      className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3.5 py-2 text-xs text-amber-200 placeholder-gray-500 focus:outline-none focus:border-amber-500 font-mono"
                    />
                    <span className="text-[10px] text-gray-500 mt-1 block">
                      Autonomous skill router checks semantic intent, trigger conditions, and example queries to pick this skill automatically.
                    </span>
                  </div>

                  {/* Steps to Follow (Markdown) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-gray-400">
                        The Steps to Follow (Markdown SOP) *
                      </label>
                      <span className="text-[10px] text-gray-500 font-mono">
                        Markdown supported (headings, lists, code blocks)
                      </span>
                    </div>
                    <textarea
                      rows={10}
                      value={skillForm.stepsMarkdown}
                      onChange={(e) => setSkillForm({ ...skillForm, stepsMarkdown: e.target.value })}
                      placeholder="# Step-by-Step Resolution Protocol&#10;1. Initial diagnosis...&#10;2. Apply configuration...&#10;3. Verify with CLI: dig +short CNAME custom.domain.com"
                      className="w-full rounded-lg border border-[#C3D3EA] bg-white p-3.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono leading-relaxed"
                    />
                  </div>

                  {/* Verified Few-Shot Examples */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium text-gray-300">
                        Verified Examples (1 or 2 examples)
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setSkillForm({
                            ...skillForm,
                            examples: [...skillForm.examples, { question: "", answer: "" }],
                          })
                        }
                        className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-mono"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Example</span>
                      </button>
                    </div>

                    {skillForm.examples.map((ex, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-[#DCE6F5] bg-[#F1F6FF] p-3 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
                          <span>Example #{idx + 1}</span>
                          {skillForm.examples.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = skillForm.examples.filter((_, i) => i !== idx);
                                setSkillForm({ ...skillForm, examples: updated });
                              }}
                              className="text-red-400 hover:text-red-300 text-[10px]"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={ex.question}
                          onChange={(e) => {
                            const updated = [...skillForm.examples];
                            updated[idx].question = e.target.value;
                            setSkillForm({ ...skillForm, examples: updated });
                          }}
                          placeholder="Example Customer Question (e.g. How do I configure my CNAME?)"
                          className="w-full rounded border border-[#DCE6F5] bg-[#EEF4FF] px-3 py-1.5 text-xs text-slate-900 placeholder-gray-600 focus:outline-none focus:border-purple-500"
                        />
                        <textarea
                          rows={2}
                          value={ex.answer}
                          onChange={(e) => {
                            const updated = [...skillForm.examples];
                            updated[idx].answer = e.target.value;
                            setSkillForm({ ...skillForm, examples: updated });
                          }}
                          placeholder="Example Resolution Answer Grounded in this Skill..."
                          className="w-full rounded border border-[#DCE6F5] bg-[#EEF4FF] px-3 py-1.5 text-xs text-slate-900 placeholder-gray-600 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Save New Version Card */}
                  <div className="pt-3 border-t border-[#DCE6F5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <input
                      type="text"
                      value={skillForm.changeNotes}
                      onChange={(e) => setSkillForm({ ...skillForm, changeNotes: e.target.value })}
                      placeholder="Change notes (e.g. Added Cloudflare orange-cloud proxy check)..."
                      className="flex-1 rounded-lg border border-[#C3D3EA] bg-white px-3 py-2 text-xs text-slate-900 placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    />

                    <button
                      onClick={handleSaveSkillVersion}
                      disabled={savingSkill || !skillForm.name.trim() || !skillForm.stepsMarkdown.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-xs font-semibold text-white transition disabled:opacity-50 flex-shrink-0 shadow-sm"
                    >
                      <Save className="h-4 w-4" />
                      <span>{savingSkill ? "Saving Version..." : "Save New Version"}</span>
                    </button>
                  </div>
                </div>

                {/* Version History Drawer with 1-Click Rollback */}
                {activeSkill && activeSkill.versions && activeSkill.versions.length > 0 && (
                  <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-[#DCE6F5] pb-2.5">
                      <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-indigo-400" />
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                          Version History &amp; 1-Click Rollback
                        </h4>
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {activeSkill.versions.length} versions recorded
                      </span>
                    </div>

                    <div className="space-y-2 divide-y divide-gray-800/40">
                      {activeSkill.versions.map((v) => {
                        const isCurrent = v.versionNumber === activeSkill.currentVersionNumber;
                        return (
                          <div
                            key={v.id}
                            className="pt-2 flex items-center justify-between gap-3 text-xs hover:bg-[#EEF4FF] p-2 rounded transition"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                                    isCurrent
                                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                      : "bg-gray-800 text-gray-400"
                                  }`}
                                >
                                  v{v.versionNumber} {isCurrent && "(Active)"}
                                </span>
                                <span className="text-[11px] text-gray-400">
                                  {new Date(v.createdAt).toLocaleDateString()} at{" "}
                                  {new Date(v.createdAt).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-300 italic">{v.changeNotes || "No notes"}</p>
                            </div>

                            {!isCurrent && (
                              <button
                                onClick={() => handleSkillRollback(v.id)}
                                disabled={skillRollbackLoading}
                                className="flex items-center gap-1 rounded bg-indigo-50 hover:bg-indigo-900/80 text-indigo-300 text-[10px] font-mono px-2.5 py-1 transition border border-[#BFDBFE] disabled:opacity-50"
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span>Rollback to v{v.versionNumber}</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column (5 Cols): Split-Screen Test Chat */}
              <div className="lg:col-span-5 rounded-xl border border-[#DCE6F5] bg-white flex flex-col h-[780px] shadow-sm overflow-hidden sticky top-6">
                {/* Test Chat Header */}
                <div className="p-3.5 bg-[#F1F6FF] border-b border-[#DCE6F5] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse"></div>
                    <div>
                      <h4 className="text-xs font-bold text-[#0B1B3A] flex items-center gap-1.5">
                        <span>Side-by-Side Test Chat</span>
                      </h4>
                      <p className="text-[10px] text-gray-400">
                        Testing skill: <span className="text-purple-300 font-mono">{skillForm.name || "Draft Skill"}</span>
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] bg-purple-50 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20 font-mono">
                    [skill test]
                  </span>
                </div>

                {/* Test Chat Message Stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#090D16]">
                  {skillTestMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                    >
                      {msg.telemetry && (
                        <div className="flex items-center gap-1 text-[9px] font-mono text-gray-500 mb-1 px-1">
                          <span className="text-purple-400 font-semibold">Attribution: [skill]</span>
                          <span>&bull;</span>
                          <span>{msg.telemetry.latencyMs}ms</span>
                          <span>&bull;</span>
                          <span className="text-emerald-400 font-semibold">
                            ${msg.telemetry.costUsd.toFixed(6)}
                          </span>
                        </div>
                      )}

                      <div
                        className={`rounded-xl p-3 text-xs max-w-[90%] leading-relaxed ${
                          msg.sender === "user"
                            ? "bg-purple-600 text-white rounded-br-none"
                            : "bg-[#EEF4FF]/90 text-gray-200 border border-[#DCE6F5] rounded-bl-none whitespace-pre-wrap font-sans"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {skillTestSending && (
                    <div className="flex items-center gap-2 text-xs text-gray-400 font-mono p-2">
                      <div className="h-2 w-2 rounded-full bg-purple-500 animate-ping"></div>
                      <span>Simulating skill SOP execution against draft protocol...</span>
                    </div>
                  )}
                </div>

                {/* Pre-fill Quick Chips for Testing */}
                <div className="px-4 py-2 bg-[#F6F9FF] border-t border-[#DCE6F5] flex items-center gap-1.5 overflow-x-auto text-[11px]">
                  <span className="text-gray-500 whitespace-nowrap">Try:</span>
                  <button
                    onClick={() => setSkillTestInput("How do I point my custom subdomain to the platform?")}
                    className="text-slate-500 hover:text-slate-900 rounded bg-[#EEF4FF] px-2 py-0.5 truncate max-w-[150px]"
                  >
                    Custom subdomain?
                  </button>
                  <button
                    onClick={() => setSkillTestInput("Why is SSL verification failing on Cloudflare?")}
                    className="text-slate-500 hover:text-slate-900 rounded bg-[#EEF4FF] px-2 py-0.5 truncate max-w-[150px]"
                  >
                    SSL verification fail?
                  </button>
                  <button
                    onClick={() => setSkillTestInput("How do I verify webhook signature HMAC SHA256?")}
                    className="text-slate-500 hover:text-slate-900 rounded bg-[#EEF4FF] px-2 py-0.5 truncate max-w-[150px]"
                  >
                    Webhook 401 error?
                  </button>
                </div>

                {/* Test Chat Input Bar */}
                <div className="p-3 bg-[#F1F6FF] border-t border-[#DCE6F5] flex items-center gap-2">
                  <input
                    type="text"
                    value={skillTestInput}
                    onChange={(e) => setSkillTestInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendSkillTestChat();
                    }}
                    placeholder={`Test "${skillForm.name || "this skill"}" with a question...`}
                    className="flex-1 rounded-lg border border-[#DCE6F5] bg-[#EEF4FF] px-3 py-2 text-xs text-slate-900 placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={handleSendSkillTestChat}
                    disabled={!skillTestInput.trim() || skillTestSending}
                    className="rounded-lg bg-purple-600 hover:bg-purple-500 p-2 text-white transition disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* AI Drafting Modal: Mode B ("Describe it in a few words and let the agent draft it") */}
            {draftModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1B3A]/35 backdrop-blur-sm p-4">
                <div className="rounded-2xl border border-[#DCE6F5] bg-white w-full max-w-lg p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-[#DCE6F5] pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-indigo-400" />
                      <h3 className="text-base font-bold text-[#0B1B3A]">AI Skill Drafting Assistant</h3>
                    </div>
                    <button
                      onClick={() => setDraftModalOpen(false)}
                      className="text-slate-500 hover:text-slate-900 text-sm"
                    >
                      &times;
                    </button>
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed">
                    Describe what this skill should do in a few words. The agent will autonomously author the complete Markdown SOP protocol, including trigger conditions, step-by-step resolution, and few-shot examples.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Skill Name *</label>
                      <input
                        type="text"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        placeholder="e.g. Stripe Webhook & Event Reconciliation"
                        className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        Short Description of the Procedure *
                      </label>
                      <textarea
                        rows={3}
                        value={draftDesc}
                        onChange={(e) => setDraftDesc(e.target.value)}
                        placeholder="e.g. Handling invoice payment failures, verifying Stripe secret signatures, and checking idempotency keys."
                        className="w-full rounded-lg border border-[#C3D3EA] bg-white p-3 text-xs text-slate-900 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DCE6F5]">
                    <button
                      type="button"
                      onClick={() => setDraftModalOpen(false)}
                      className="rounded-lg bg-gray-800 hover:bg-gray-700 px-4 py-2 text-xs font-medium text-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDraftSkill}
                      disabled={draftingSkill || !draftName.trim() || !draftDesc.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-semibold text-white transition disabled:opacity-50"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>{draftingSkill ? "Drafting SOP..." : "Draft Skill with AI"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Markdown File View Modal */}
            {markdownViewOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1B3A]/35 backdrop-blur-sm p-4">
                <div className="rounded-2xl border border-[#DCE6F5] bg-white w-full max-w-2xl p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-[#DCE6F5] pb-3">
                    <div className="flex items-center gap-2">
                      <FileCode className="h-5 w-5 text-purple-400" />
                      <h3 className="text-base font-bold text-[#0B1B3A]">
                        Markdown File Representation ({skillForm.slug || "skill"}.md)
                      </h3>
                    </div>
                    <button
                      onClick={() => setMarkdownViewOpen(false)}
                      className="text-slate-500 hover:text-slate-900 text-sm"
                    >
                      &times;
                    </button>
                  </div>

                  <p className="text-xs text-gray-400">
                    Each skill is stored as a formatted Markdown file with YAML frontmatter, operational SOP steps, and verified few-shot examples.
                  </p>

                  <pre className="rounded-lg border border-[#DCE6F5] bg-[#F1F6FF] text-[#1E3A8A] border border-[#DCE6F5] p-4 text-xs font-mono text-purple-200 whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
                    {formatCurrentSkillAsMarkdown()}
                  </pre>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DCE6F5]">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(formatCurrentSkillAsMarkdown());
                        setCopiedMd(true);
                        setTimeout(() => setCopiedMd(false), 2000);
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-semibold text-white transition"
                    >
                      {copiedMd ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      <span>{copiedMd ? "Copied!" : "Copy Markdown"}</span>
                    </button>
                    <button
                      onClick={() => setMarkdownViewOpen(false)}
                      className="rounded-lg bg-gray-800 hover:bg-gray-700 px-4 py-2 text-xs font-medium text-gray-300"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: ACCESS CONTROL & SECURITY ARCHITECTURE MATRIX ================= */}
        {activeTab === "security_matrix" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {roleSwitchToast && (
              <div className="rounded-xl border border-[#BFDBFE] bg-blue-50 p-3.5 text-xs text-cyan-300 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                  <span>{roleSwitchToast} — Refreshing environment view...</span>
                </div>
              </div>
            )}

            {/* Zero Leakage Multi-Tenant Guarantee Banner */}
            <div className="rounded-2xl border border-[#BFDBFE] bg-gradient-to-r from-[#071329] via-[#091C3E] to-[#071329] p-6 shadow-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DCE6F5]/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-blue-100 text-cyan-400 flex items-center justify-center border border-[#BFDBFE]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0B1B3A] flex items-center gap-2">
                      <span>Cross-Tenant Privacy &amp; Zero-Leakage Guarantee</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        ABSOLUTE ISOLATION
                      </span>
                    </h3>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Users from Company A (<code className="text-cyan-300 font-mono">acme-corp</code>) can never see Company B (<code className="text-purple-300 font-mono">beta-dynamics</code>) chats, documents, API keys, or evals.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-50 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                  <Lock className="h-3.5 w-3.5" />
                  <span>SQL: where(eq(table.businessId, currentTenantId))</span>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Every single SQL query across all 22 tables strictly scopes to the authenticated tenant. Any manual URL tampering, query parameter manipulation, or header spoofing results in an immediate <strong>HTTP 403 Forbidden / 404 Not Found</strong>.
              </p>
            </div>

            {/* Part 3: What Each Role Can Access (Dashboard Matrix) */}
            <div className="rounded-2xl border border-[#DCE6F5] bg-white p-6 space-y-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DCE6F5] pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#0B1B3A] flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-400" />
                    <span>3. What Each Role Can Access (Dashboard Matrix)</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    The application enforces strict Role-Based Access Control (RBAC) across every feature and workspace interface:
                  </p>
                </div>
                <span className="text-[10px] font-mono text-indigo-300 bg-indigo-50 px-2.5 py-1 rounded border border-[#BFDBFE]">
                  5 Roles &bull; 8 Workspaces Enforced
                </span>
              </div>

              {/* Matrix Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-[#F6F9FF] border-b border-[#DCE6F5] text-gray-300 uppercase font-semibold text-[11px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3 min-w-[200px]">Workspace / Feature</th>
                      <th className="px-3 py-3 text-center">
                        <div className="font-bold text-slate-900">Owner</div>
                        <button
                          onClick={() => handleSwitchRoleLive("owner")}
                          disabled={switchingRoleName !== null}
                          className="mt-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-mono underline block mx-auto"
                        >
                          {switchingRoleName === "owner" ? "Switching..." : "Test Role"}
                        </button>
                      </th>
                      <th className="px-3 py-3 text-center">
                        <div className="font-bold text-slate-900">Admin</div>
                        <button
                          onClick={() => handleSwitchRoleLive("admin")}
                          disabled={switchingRoleName !== null}
                          className="mt-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-mono underline block mx-auto"
                        >
                          {switchingRoleName === "admin" ? "Switching..." : "Test Role"}
                        </button>
                      </th>
                      <th className="px-3 py-3 text-center">
                        <div className="font-bold text-slate-900">Expert / Reviewer</div>
                        <button
                          onClick={() => handleSwitchRoleLive("expert")}
                          disabled={switchingRoleName !== null}
                          className="mt-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-mono underline block mx-auto"
                        >
                          {switchingRoleName === "expert" ? "Switching..." : "Test Role"}
                        </button>
                      </th>
                      <th className="px-3 py-3 text-center">
                        <div className="font-bold text-slate-900">Team Member</div>
                        <button
                          onClick={() => handleSwitchRoleLive("team")}
                          disabled={switchingRoleName !== null}
                          className="mt-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-mono underline block mx-auto"
                        >
                          {switchingRoleName === "team" ? "Switching..." : "Test Role"}
                        </button>
                      </th>
                      <th className="px-3 py-3 text-center">
                        <div className="font-bold text-slate-900">Customer / Guest</div>
                        <button
                          onClick={() => handleSwitchRoleLive("customer")}
                          disabled={switchingRoleName !== null}
                          className="mt-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-mono underline block mx-auto"
                        >
                          {switchingRoleName === "customer" ? "Switching..." : "Test Role"}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 font-mono text-[11px]">
                    <tr className="hover:bg-[#EEF4FF] transition">
                      <td className="px-4 py-3 font-medium text-slate-900 font-sans flex items-center gap-2">
                        <span className="font-semibold">Chat Sandbox</span>
                        <code className="text-gray-400 text-[10px]">(/chat)</code>
                      </td>
                      <td className="px-3 py-3 text-center"><span className="text-emerald-400 font-semibold">✓ Full</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-emerald-400 font-semibold">✓ Full</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-emerald-400 font-semibold">✓ Full</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-emerald-400 font-semibold">✓ Full</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-cyan-300 font-medium">✓ Interacts with AI</span></td>
                    </tr>

                    <tr className="hover:bg-[#EEF4FF] transition">
                      <td className="px-4 py-3 font-medium text-slate-900 font-sans flex items-center gap-2">
                        <span className="font-semibold">Approvals Inbox</span>
                        <code className="text-gray-400 text-[10px]">(/approvals)</code>
                      </td>
                      <td className="px-3 py-3 text-center"><span className="text-emerald-400 font-semibold">✓ Full</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-emerald-400 font-semibold">✓ Full</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-amber-400 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-500/30">★ Primary Workstation</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-red-400 font-medium">✕ Blocked</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-red-400 font-medium">✕ Blocked</span></td>
                    </tr>

                    <tr className="hover:bg-[#EEF4FF] transition">
                      <td className="px-4 py-3 font-medium text-slate-900 font-sans flex items-center gap-2">
                        <span className="font-semibold">Knowledge Brain</span>
                        <code className="text-gray-400 text-[10px]">(/knowledge)</code>
                      </td>
                      <td className="px-3 py-3 text-center"><span className="text-emerald-400 font-semibold">✓ Full</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-emerald-400 font-semibold">✓ Full</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-indigo-300 font-medium">✓ View &amp; Search</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-indigo-300 font-medium">✓ View &amp; Search</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-red-400 font-medium">✕ Blocked</span></td>
                    </tr>

                    <tr className="hover:bg-[#EEF4FF] transition">
                      <td className="px-4 py-3 font-medium text-slate-900 font-sans flex items-center gap-2">
                        <span className="font-semibold">The Eval Lab</span>
                        <code className="text-gray-400 text-[10px]">(/evals)</code>
                      </td>
                      <td className="px-3 py-3 text-center"><span className="text-emerald-400 font-semibold">✓ Full</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-emerald-400 font-semibold">✓ Full</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-indigo-300 font-medium">✓ Grade benchmarks</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-gray-400 font-medium">✓ View Only</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-red-400 font-medium">✕ Blocked</span></td>
                    </tr>

                    <tr className="hover:bg-[#EEF4FF] transition">
                      <td className="px-4 py-3 font-medium text-slate-900 font-sans flex items-center gap-2">
                        <span className="font-semibold">Self-Improve Loop</span>
                        <code className="text-gray-400 text-[10px]">(/self-improve)</code>
                      </td>
                      <td className="px-3 py-3 text-center"><span className="text-emerald-400 font-semibold">✓ Full / Approve &amp; Undo</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-emerald-400 font-semibold">✓ Full</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-indigo-300 font-medium">✓ View reports</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-red-400 font-medium">✕ Blocked</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-red-400 font-medium">✕ Blocked</span></td>
                    </tr>

                    <tr className="hover:bg-[#EEF4FF] transition">
                      <td className="px-4 py-3 font-medium text-slate-900 font-sans flex items-center gap-2">
                        <span className="font-semibold">Role &amp; Prompt Studio</span>
                        <code className="text-gray-400 text-[10px]">(/settings/roles-prompts)</code>
                      </td>
                      <td className="px-3 py-3 text-center"><span className="text-emerald-400 font-semibold">✓ Full</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-emerald-400 font-semibold">✓ Full</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-red-400 font-medium">✕ Blocked</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-red-400 font-medium">✕ Blocked</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-red-400 font-medium">✕ Blocked</span></td>
                    </tr>

                    <tr className="hover:bg-[#EEF4FF] transition">
                      <td className="px-4 py-3 font-medium text-slate-900 font-sans flex items-center gap-2">
                        <span className="font-semibold">Settings &amp; API Vault</span>
                        <code className="text-gray-400 text-[10px]">(/settings)</code>
                      </td>
                      <td className="px-3 py-3 text-center"><span className="text-emerald-400 font-semibold">✓ Full</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-emerald-400 font-semibold">✓ Full</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-red-400 font-medium">✕ Blocked</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-red-400 font-medium">✕ Blocked</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-red-400 font-medium">✕ Blocked</span></td>
                    </tr>

                    <tr className="hover:bg-[#EEF4FF] transition">
                      <td className="px-4 py-3 font-medium text-slate-900 font-sans flex items-center gap-2">
                        <span className="font-semibold">Platform Fleet Admin</span>
                        <code className="text-gray-400 text-[10px]">(/admin)</code>
                      </td>
                      <td className="px-3 py-3 text-center"><span className="text-cyan-300 font-bold bg-blue-50 px-2 py-0.5 rounded border border-[#BFDBFE]">Owner Only</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-red-400 font-medium">✕ Blocked</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-red-400 font-medium">✕ Blocked</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-red-400 font-medium">✕ Blocked</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-red-400 font-medium">✕ Blocked</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Part 4: Deep-Dive: What Each Dashboard Shows */}
            <div className="space-y-4">
              <div className="border-b border-[#DCE6F5] pb-2">
                <h3 className="text-base font-bold text-[#0B1B3A] flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-400" />
                  <span>Deep-Dive: What Each Dashboard Shows</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Tailored workstations designed with zero-leakage privacy and role-specific boundaries within the same organization.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* A. Team Member */}
                <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider border-b border-[#DCE6F5] pb-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold">A</span>
                    <span>Team Member (/chat)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-mono font-bold block">Focus</span>
                    <p className="text-xs text-gray-300 mt-0.5">Day-to-day customer communication &amp; AI assistance.</p>
                  </div>
                  <div className="space-y-1.5 text-xs text-gray-400">
                    <span className="text-[10px] text-cyan-400 font-mono font-bold block uppercase">Capabilities</span>
                    <p>&bull; Switch between 3 AI personas (Support Engineer, Support Executive, AI Consultant).</p>
                    <p>&bull; See citation traces ([1], [2]), model names, and cost in $ for each answer.</p>
                    <p>&bull; Click &quot;This was right&quot; / &quot;This was wrong&quot; to propose lessons.</p>
                  </div>
                  <div className="pt-2 border-t border-[#DCE6F5] text-[11px] text-red-300/80">
                    <strong className="text-red-400 block font-mono text-[10px]">Restrictions:</strong>
                    Cannot edit prompt versions, cannot view secret API keys, cannot deploy code changes. Private draft chats are isolated.
                  </div>
                </div>

                {/* B. Expert Reviewer */}
                <div className="rounded-xl border border-amber-500/30 bg-amber-950/10 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider border-b border-[#DCE6F5] pb-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold">B</span>
                    <span>Expert Reviewer (/approvals)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-mono font-bold block">Focus</span>
                    <p className="text-xs text-gray-300 mt-0.5">Governance &amp; Human-in-the-Loop quality control.</p>
                  </div>
                  <div className="space-y-1.5 text-xs text-gray-400">
                    <span className="text-[10px] text-amber-400 font-mono font-bold block uppercase">Workspaces Displayed</span>
                    <p>&bull; <strong>Escalated Tasks Queue:</strong> Angry customers, legal terms, database crashes.</p>
                    <p>&bull; <strong>Pending Lessons Queue:</strong> Drafted markdown lessons (<code className="text-amber-200">lessons/*.md</code>).</p>
                    <p>&bull; <strong>Self-Improve Review:</strong> Inspect PRs from Claude Opus 5.5.</p>
                  </div>
                  <div className="pt-2 border-t border-[#DCE6F5] text-[11px] text-amber-200/80">
                    <strong className="text-amber-300 block font-mono text-[10px]">Privacy &amp; Boundaries:</strong>
                    Only sees escalated tasks. Cannot inspect another team member&apos;s private draft chats. Cannot view API vault keys or billing.
                  </div>
                </div>

                {/* C. Owner & Admin */}
                <div className="rounded-xl border border-[#BFDBFE] bg-indigo-950/10 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider border-b border-[#DCE6F5] pb-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-bold">C</span>
                    <span>Owner &amp; Admin (/settings, /evals)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-mono font-bold block">Focus</span>
                    <p className="text-xs text-gray-300 mt-0.5">Security, pricing, prompt engineering &amp; governance.</p>
                  </div>
                  <div className="space-y-1.5 text-xs text-gray-400">
                    <span className="text-[10px] text-indigo-400 font-mono font-bold block uppercase">Workspaces Displayed</span>
                    <p>&bull; <strong>Vault Connections:</strong> AES-256 encrypted API keys &amp; Local-Only switch.</p>
                    <p>&bull; <strong>Prompt &amp; Role Studios:</strong> Goals, tone, allowed skills, diff rollback.</p>
                    <p>&bull; <strong>The Eval Lab:</strong> 100+ tests on 14 models, quality vs. cost.</p>
                    <p>&bull; <strong>Release Gate:</strong> Blocks test regressions.</p>
                  </div>
                  <div className="pt-2 border-t border-[#DCE6F5] text-[11px] text-indigo-200/80">
                    <strong className="text-indigo-300 block font-mono text-[10px]">Full Authority:</strong>
                    Inspect workspace analytics, total spend, and system-wide eval scores across the organization.
                  </div>
                </div>

                {/* D. Customer / Guest */}
                <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 space-y-3">
                  <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider border-b border-[#DCE6F5] pb-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20 text-[10px] font-bold">D</span>
                    <span>Customer / Guest (/chat)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-mono font-bold block">Focus</span>
                    <p className="text-xs text-gray-300 mt-0.5">Live technical consultation &amp; customer self-service.</p>
                  </div>
                  <div className="space-y-1.5 text-xs text-gray-400">
                    <span className="text-[10px] text-purple-400 font-mono font-bold block uppercase">Capabilities</span>
                    <p>&bull; Conversational AI grounded in verified company documents.</p>
                    <p>&bull; Inline citations [1], [2] for verifiable answers.</p>
                    <p>&bull; Seamless automated handover on refund or legal requests.</p>
                  </div>
                  <div className="pt-2 border-t border-[#DCE6F5] text-[11px] text-red-300/80">
                    <strong className="text-red-400 block font-mono text-[10px]">Zero Internal Exposure:</strong>
                    Internal prompt engineering, telemetry traces, model cost in $, and evaluation tabs are completely hidden.
                  </div>
                </div>
              </div>
            </div>

            {/* Part 5: Security Architecture for Each Role */}
            <div className="space-y-4">
              <div className="border-b border-[#DCE6F5] pb-2">
                <h3 className="text-base font-bold text-[#0B1B3A] flex items-center gap-2">
                  <Lock className="h-5 w-5 text-emerald-400" />
                  <span>5. Security Architecture for Each Role</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Multi-layered defense verifying identity, session integrity, code-level tool fencing, and release safety:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Argon2id */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <Key className="h-4 w-4" />
                      <span>Argon2id Password Security</span>
                    </div>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      19 MiB RAM
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Passwords are never stored in plain text. Hashed with modern <strong>argon2id</strong> (memory cost 19MB = 19456, 2 time iterations, 1 parallelism) to defeat brute-force and GPU rainbow-table attacks.
                  </p>
                  <div className="text-[10px] text-gray-500 font-mono pt-1 border-t border-emerald-950">
                    Verified: Zero plaintext storage in PostgreSQL.
                  </div>
                </div>

                {/* 2. Session Integrity */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <UserCheck className="h-4 w-4" />
                      <span>PostgreSQL Session Integrity</span>
                    </div>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      HTTP-Only Cookies
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Sessions are cryptographically tied to user IDs and business IDs in PostgreSQL with strict expiration timestamps. Cookie tampering or cross-tenant token replay is intercepted immediately.
                  </p>
                  <div className="text-[10px] text-gray-500 font-mono pt-1 border-t border-emerald-950">
                    Scoped: business_id &bull; user_id &bull; user_role
                  </div>
                </div>

                {/* 3. Role Skill Fencing */}
                <div className="rounded-xl border border-[#BFDBFE] bg-blue-50/10 p-5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                      <ShieldAlert className="h-4 w-4" />
                      <span>Role Skill Fencing (canRoleSharePrice)</span>
                    </div>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-cyan-300 border border-[#BFDBFE]">
                      Code-Level Gate
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Hardcoded logic guarantees that even if a prompt injection attempts to force the Support Engineer to offer discounts, the model runner rejects the <code className="text-cyan-300">share_price</code> tool execution.
                  </p>
                  <div className="text-[10px] text-gray-500 font-mono pt-1 border-t border-[#DCE6F5]">
                    Function: canRoleSharePrice(slug) === &apos;ai-consultant&apos;
                  </div>
                </div>

                {/* 4. Prompt Injection Shield */}
                <div className="rounded-xl border border-red-500/30 bg-red-950/10 p-5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Prompt Injection Shield</span>
                    </div>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                      10 Attack Vectors
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Intercepts messages before they hit LLMs. Scans for 10 injection vectors including system prompt overrides, delimiter attacks, fake system tags, markdown image exploits, and hidden CSS payloads.
                  </p>
                  <div className="text-[10px] text-gray-500 font-mono pt-1 border-t border-red-950">
                    Status: Active Shield Intercepts in &lt;1ms.
                  </div>
                </div>

                {/* 5. PII Masking Layer */}
                <div className="rounded-xl border border-purple-500/30 bg-purple-950/10 p-5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                      <EyeOff className="h-4 w-4" />
                      <span>PII Masking Layer</span>
                    </div>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Luhn Validation
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Credit card numbers (validated via Luhn algorithm), phone numbers, and SSNs are redacted (<code className="text-purple-300">[REDACTED_PHONE]</code>, <code className="text-purple-300">[REDACTED_CARD]</code>) before text is transmitted to cloud APIs or stored.
                  </p>
                  <div className="text-[10px] text-gray-500 font-mono pt-1 border-t border-purple-950">
                    Compliance: Zero sensitive personal data logged.
                  </div>
                </div>

                {/* 6. Release Gate Protection */}
                <div className="rounded-xl border border-[#BFDBFE] bg-indigo-950/10 p-5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Release Gate Protection</span>
                    </div>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-[#BFDBFE]">
                      Hard Automated Bar
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Even an Admin or Owner cannot push a corrupted prompt to production. If an edited prompt drops the benchmark score below baseline, the Release Gate rejects the change and blocks activation.
                  </p>
                  <div className="text-[10px] text-gray-500 font-mono pt-1 border-t border-indigo-950">
                    Enforcement: Candidate Score &gt;= Baseline Score.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
