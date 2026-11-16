# Feature Idea 4: Zero-Config Multilingual Consultation & Auto-Localization

## 1. The Problem It Solves, and For Whom
- **Target User:** Global B2B SaaS teams whose documentation is written only in English, but whose customers write in Spanish, German, French, Hindi, or Japanese.
- **Problem:** Non-English customer queries suffer poor keyword overlap against English sitemaps, and manually translating 500+ help pages is prohibitively expensive.

## 2. Who Would Pay For It, and Why
- **Buyer:** International SaaS businesses and global marketplaces ($99–$349/month Global Enterprise add-on).
- **Why They Pay:** Delivers native-language support with verified English source citations without maintaining duplicate localized documentation trees.

## 3. The User Flow (Step-by-Step)
1. Customer submits a question in Spanish or German (via `/chat`, Gmail, or the Web Widget).
2. Tier-1 job tagger (`Claude Haiku 5.5` or `qwen3.5:4b`) detects `{language: "es"}` and translates the search query into canonical English search terms while preserving the original message.
3. `hybrid_retrieve_context()` retrieves the highest-scoring English `KnowledgePage`, `Instruction`, and `Skill` chunks.
4. Answer writer generates the response in the customer's exact detected language while keeping code snippets, UI button labels, and citation URLs intact, plus a toggleable English back-translation in the **Answer Trace Panel** for English-speaking QA reviewers.

## 4. Screens and Tabs Needed (Task 0 Map Placement)
- **Settings → Business (`/settings/business`):** Toggle for **Auto-Detect & Reply in Customer Language** + supported language allowlist.
- **Ask & Teach Chat (`/chat` Answer Trace Panel):** Displays `Detected Language: ES` badge and an **Inspect English Translation** toggle for operators.

## 5. New Tables and Columns (Linked to `DATABASE.md`)
- **`chat_messages` (alteration):** Add `detected_language` (`VARCHAR(10) DEFAULT 'en'`) and `english_backtranslation` (`TEXT NULL`).
- **`businesses` (alteration):** Add `multilingual_enabled` (`BOOLEAN DEFAULT FALSE`) and `supported_languages` (`TEXT[] DEFAULT ARRAY['en']`).

## 6. How It Connects to Built Features
- **Feature 1 (`feature_1_workspace`):** Extends the Step-1 Job Tagger prompt in `prompt_versions` with language detection.
- **Feature 2 (`feature_2_knowledge_brain`):** Enables cross-lingual retrieval without duplicating `knowledge_pages`.
- **Feature 4 (`feature_4_eval_lab`):** Adds a 20-question multilingual paraphrase slice to the benchmark suite scored by the AI Judge.

## 7. How We Measure That It Works
- **Done when:** 20 non-English customer queries (Spanish, French, German, Hindi) against an English-only sitemap achieve `>=95%` citation accuracy and `>=92%` AI Judge quality score, with English back-translations visible in the trace panel.

## 8. Risks and What Could Go Wrong
- **Translating UI Labels or Code Tokens:** Translating `"Settings -> Keys & Connections"` or CLI commands breaks customer troubleshooting. *Mitigation:* Explicit system prompt rule keeping code blocks, API keys, and exact UI navigation labels in English with localized explanations.

## 9. Build Time Estimate
- **Total Estimate:** **10 hours** (3h schema + language tagger prompt update, 4h cross-lingual retrieval + UI trace toggle, 3h 20-case multilingual eval test).
