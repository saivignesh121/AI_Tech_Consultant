/**
 * Benchmark Versioning Manager
 * Task 4.1: The test set from Step 4 of "How to start", saved as files in the repo, with version numbers.
 */

import fs from "fs";
import path from "path";

export interface BenchmarkVersionMetadata {
  version: string;
  name: string;
  description: string;
  totalCases: number;
  filePath: string;
  releaseDate: string;
  categories: string[];
}

export interface BenchmarkManifest {
  activeVersion: string;
  versions: BenchmarkVersionMetadata[];
}

export interface BenchmarkCaseItem {
  id: string;
  category: string;
  question: string;
  expectedAnswer: string;
  expectedSource?: string;
  expectedAction?: string;
}

export type BenchmarkCase = BenchmarkCaseItem;

export interface BenchmarkDataset {
  version: string;
  name: string;
  description: string;
  totalCases: number;
  cases: BenchmarkCaseItem[];
}

/**
 * Returns registry of benchmark versions.
 */
export function getBenchmarkVersions(): BenchmarkManifest {
  try {
    const versionsPath = path.join(process.cwd(), "benchmark", "versions.json");
    if (fs.existsSync(versionsPath)) {
      const content = fs.readFileSync(versionsPath, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Failed to read benchmark/versions.json:", err);
  }

  // Fallback manifest
  return {
    activeVersion: "2.0.0",
    versions: [
      {
        version: "1.0.0",
        name: "Step 4 Seed Test Set",
        description: "Initial 20-case seed test set from Step 4",
        totalCases: 20,
        filePath: "benchmark/v1.0.0/test_set.json",
        releaseDate: "2026-11-20T10:00:00.000Z",
        categories: ["DNS & Domains", "Security & SSL", "Billing & Escalation"],
      },
      {
        version: "2.0.0",
        name: "Production 180 Benchmark Suite",
        description: "180-test benchmark suite",
        totalCases: 180,
        filePath: "benchmark/v2.0.0/benchmark_180.json",
        releaseDate: "2026-11-21T16:21:31.513Z",
        categories: ["Knowledge Brain", "Ask & Teach", "Safety"],
      },
    ],
  };
}

/**
 * Loads the test cases for a specific version.
 * If version is omitted, loads the active version (v2.0.0 or v1.0.0).
 */
export function loadBenchmarkCasesByVersion(version?: string): BenchmarkDataset {
  const manifest = getBenchmarkVersions();
  const targetVer = version?.replace(/^v/, "") || manifest.activeVersion;

  const foundMeta = manifest.versions.find((v) => v.version === targetVer) || manifest.versions[0];
  const absPath = path.join(process.cwd(), foundMeta.filePath);

  try {
    if (fs.existsSync(absPath)) {
      const content = fs.readFileSync(absPath, "utf-8");
      const parsed = JSON.parse(content);
      return {
        version: parsed.version || targetVer,
        name: parsed.name || foundMeta.name,
        description: parsed.description || foundMeta.description,
        totalCases: parsed.cases?.length || 0,
        cases: parsed.cases || [],
      };
    }
  } catch (err) {
    console.error(`Failed to load benchmark cases from ${absPath}:`, err);
  }

  // Fallback seed cases if file missing
  return {
    version: targetVer,
    name: foundMeta.name,
    description: foundMeta.description,
    totalCases: 20,
    cases: Array.from({ length: 20 }, (_, i) => ({
      id: `case-${i + 1}`,
      category: "General",
      question: `Benchmark inquiry ${i + 1}`,
      expectedAnswer: `Expected answer for benchmark inquiry ${i + 1}`,
    })),
  };
}
