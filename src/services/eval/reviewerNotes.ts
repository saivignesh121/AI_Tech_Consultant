/**
 * Human Reviewer Notes Management Service
 * Task 4.2: "For each case and each model, the human reviewer can add a note (what was good, what was wrong)."
 */

import fs from "fs";
import path from "path";

export interface ReviewerNote {
  id: string; // `${caseId}_${modelId}`
  caseId: string;
  modelId: string;
  whatWasGood: string;
  whatWasWrong: string;
  generalNote?: string;
  reviewer: string;
  updatedAt: string;
}

export interface ReviewerNoteInput {
  caseId: string;
  modelId: string;
  whatWasGood: string;
  whatWasWrong: string;
  generalNote?: string;
  reviewer?: string;
}

const NOTES_FILE_PATH = path.join(process.cwd(), "benchmark", "reviewer_notes.json");

// In-memory cache for ultra-fast access
let notesCache: Map<string, ReviewerNote> | null = null;

// Initial seed notes for demonstration
const INITIAL_SEED_NOTES: ReviewerNote[] = [
  {
    id: "seed-01_claude-sonnet-5.5",
    caseId: "seed-01",
    modelId: "claude-sonnet-5.5",
    whatWasGood: "Directly gave the DNS CNAME record pointing instructions with exact host format and authoritative tone.",
    whatWasWrong: "Could have mentioned standard DNS TTL propagation timeframe (24-48 hours) earlier in the answer.",
    reviewer: "Senior Cloud Engineer",
    updatedAt: "2026-11-20T10:15:00.000Z",
  },
  {
    id: "seed-01_qwen/qwen3.8-max-0902",
    caseId: "seed-01",
    modelId: "qwen/qwen3.8-max-0902",
    whatWasGood: "Clean markdown formatting with code blocks for DNS values.",
    whatWasWrong: "Included unnecessary background explanation on root nameservers that was not requested.",
    reviewer: "Support Lead",
    updatedAt: "2026-11-20T10:30:00.000Z",
  },
  {
    id: "seed-01_gemma4:e4b",
    caseId: "seed-01",
    modelId: "gemma4:e4b",
    whatWasGood: "Fully offline inference on local laptop; zero cloud cost ($0) and accurate CNAME value.",
    whatWasWrong: "Output latency was 1,900 ms, slower than cloud Gemini Flash.",
    reviewer: "Privacy Compliance Officer",
    updatedAt: "2026-11-20T11:00:00.000Z",
  },
  {
    id: "seed-03_claude-sonnet-5.5",
    caseId: "seed-03",
    modelId: "claude-sonnet-5.5",
    whatWasGood: "Strict adherence to company instruction: did not promise refunds and routed billing inquiries cleanly.",
    whatWasWrong: "None; exemplary policy compliance.",
    reviewer: "Operations Director",
    updatedAt: "2026-11-20T11:45:00.000Z",
  },
  {
    id: "seed-03_gemma4:e4b",
    caseId: "seed-03",
    modelId: "gemma4:e4b",
    whatWasGood: "Properly refused unauthorized refund promise.",
    whatWasWrong: "Tone was somewhat terse; could have phrased the billing escalation with greater empathy.",
    reviewer: "Customer Experience Manager",
    updatedAt: "2026-11-20T12:00:00.000Z",
  },
];

/**
 * Initializes the reviewer notes cache from disk or defaults.
 */
function initializeNotes(): Map<string, ReviewerNote> {
  if (notesCache) return notesCache;

  notesCache = new Map<string, ReviewerNote>();

  try {
    if (fs.existsSync(NOTES_FILE_PATH)) {
      const data = fs.readFileSync(NOTES_FILE_PATH, "utf-8");
      const parsed: ReviewerNote[] = JSON.parse(data);
      for (const note of parsed) {
        notesCache.set(note.id, note);
      }
    } else {
      // Seed initial notes
      for (const note of INITIAL_SEED_NOTES) {
        notesCache.set(note.id, note);
      }
      persistNotesToDisk();
    }
  } catch (err) {
    console.warn("Could not read reviewer_notes.json, using in-memory store:", err);
    for (const note of INITIAL_SEED_NOTES) {
      notesCache.set(note.id, note);
    }
  }

  return notesCache;
}

/**
 * Persists the notes cache to disk.
 */
function persistNotesToDisk(): void {
  if (!notesCache) return;
  try {
    const dir = path.dirname(NOTES_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const arr = Array.from(notesCache.values());
    fs.writeFileSync(NOTES_FILE_PATH, JSON.stringify(arr, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not persist reviewer notes to disk:", err);
  }
}

/**
 * Saves or updates a reviewer note for a case and model.
 */
export function saveReviewerNote(input: ReviewerNoteInput): ReviewerNote {
  const cache = initializeNotes();
  const id = `${input.caseId}_${input.modelId}`;

  const note: ReviewerNote = {
    id,
    caseId: input.caseId,
    modelId: input.modelId,
    whatWasGood: input.whatWasGood.trim(),
    whatWasWrong: input.whatWasWrong.trim(),
    generalNote: input.generalNote?.trim(),
    reviewer: input.reviewer?.trim() || "Human Reviewer",
    updatedAt: new Date().toISOString(),
  };

  cache.set(id, note);
  persistNotesToDisk();
  return note;
}

/**
 * Gets a reviewer note for a specific case and model.
 */
export function getReviewerNote(caseId: string, modelId: string): ReviewerNote | null {
  const cache = initializeNotes();
  const id = `${caseId}_${modelId}`;
  return cache.get(id) || null;
}

/**
 * Gets all reviewer notes in the system.
 */
export function getAllReviewerNotes(): ReviewerNote[] {
  const cache = initializeNotes();
  return Array.from(cache.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/**
 * Gets notes filtered by model.
 */
export function getNotesByModel(modelId: string): ReviewerNote[] {
  const cache = initializeNotes();
  return Array.from(cache.values()).filter((n) => n.modelId === modelId);
}

/**
 * Gets notes filtered by test case.
 */
export function getNotesByCase(caseId: string): ReviewerNote[] {
  const cache = initializeNotes();
  return Array.from(cache.values()).filter((n) => n.caseId === caseId);
}

/**
 * Deletes a reviewer note.
 */
export function deleteReviewerNote(caseId: string, modelId: string): boolean {
  const cache = initializeNotes();
  const id = `${caseId}_${modelId}`;
  const deleted = cache.delete(id);
  if (deleted) {
    persistNotesToDisk();
  }
  return deleted;
}
