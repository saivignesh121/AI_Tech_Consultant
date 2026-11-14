-- ============================================================================
-- Migration 0001: Initial Schema for AI Tech Consultant Capstone
-- Database Engine: PostgreSQL 18
-- Extensions: vector (>= 0.8.7), pg_trgm, pgcrypto
-- Multi-Tenancy: Row-Level Security (RLS) with business_id scoping
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- 2. Core Workspace & Multi-Tenancy Tables (Feature 1 & Feature 6)
-- ============================================================================

-- Businesses (Tenants)
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    domain VARCHAR(255),
    support_email VARCHAR(255),
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    industry VARCHAR(100),
    autonomous_mode BOOLEAN NOT NULL DEFAULT false,
    readiness_threshold NUMERIC(5,2) NOT NULL DEFAULT 85.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT ck_businesses_readiness CHECK (readiness_threshold >= 0 AND readiness_threshold <= 100)
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT ck_users_role CHECK (role IN ('owner', 'admin', 'member'))
);

-- Connections (Encrypted Provider Keys & OAuth)
CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    encrypted_api_key TEXT,
    base_url VARCHAR(255),
    encrypted_oauth_token TEXT,
    encrypted_refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    scopes TEXT[],
    status VARCHAR(50) NOT NULL DEFAULT 'unverified',
    last_tested_at TIMESTAMPTZ,
    last_ping_latency_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_connections_biz_provider UNIQUE (business_id, provider),
    CONSTRAINT ck_connections_status CHECK (status IN ('active', 'invalid', 'expired', 'unverified'))
);

-- Onboarding Status (15-Minute Wizard Progression)
CREATE TABLE IF NOT EXISTS onboarding_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
    current_step INTEGER NOT NULL DEFAULT 1,
    step_1_business_profile BOOLEAN NOT NULL DEFAULT false,
    step_2_api_keys BOOLEAN NOT NULL DEFAULT false,
    step_3_knowledge_ingestion BOOLEAN NOT NULL DEFAULT false,
    step_4_role_persona BOOLEAN NOT NULL DEFAULT false,
    step_5_live_verification BOOLEAN NOT NULL DEFAULT false,
    step_6_email_activation BOOLEAN NOT NULL DEFAULT false,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    readiness_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT ck_onboarding_step CHECK (current_step BETWEEN 1 AND 6),
    CONSTRAINT ck_onboarding_score CHECK (readiness_score >= 0 AND readiness_score <= 100)
);

-- Agent Roles
CREATE TABLE IF NOT EXISTS agent_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    system_prompt TEXT NOT NULL,
    tone VARCHAR(50) NOT NULL DEFAULT 'technical',
    verbosity INTEGER NOT NULL DEFAULT 3,
    technical_depth INTEGER NOT NULL DEFAULT 3,
    politeness INTEGER NOT NULL DEFAULT 3,
    permitted_skills TEXT[],
    handover_criteria JSONB NOT NULL DEFAULT '{"auto_handover_on_refund": true, "auto_handover_on_legal": true}'::jsonb,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_agent_roles_biz_slug UNIQUE (business_id, slug),
    CONSTRAINT ck_agent_roles_sliders CHECK (
        verbosity BETWEEN 1 AND 5 AND 
        technical_depth BETWEEN 1 AND 5 AND 
        politeness BETWEEN 1 AND 5
    )
);

-- Prompt Versions (Settings & Version History)
CREATE TABLE IF NOT EXISTS prompt_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    prompt_type VARCHAR(50) NOT NULL,
    version_number INTEGER NOT NULL,
    template_text TEXT NOT NULL,
    variables TEXT[] NOT NULL,
    change_summary TEXT,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_prompt_versions_biz_type_ver UNIQUE (business_id, prompt_type, version_number),
    CONSTRAINT ck_prompt_versions_type CHECK (prompt_type IN (
        'master_system', 'user_wrapper', 'lesson_injection', 'skill_calling', 'judge_evaluation'
    ))
);

-- Model Call Logs (Auditing, Observability & Cost Tracking)
CREATE TABLE IF NOT EXISTS model_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    role_id UUID REFERENCES agent_roles(id) ON DELETE SET NULL,
    prompt_version_id UUID REFERENCES prompt_versions(id) ON DELETE SET NULL,
    job_type VARCHAR(50) NOT NULL,
    model_id VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cached_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.000000,
    latency_ms INTEGER NOT NULL,
    ttft_ms INTEGER,
    masked_prompt TEXT,
    masked_response TEXT,
    status_code INTEGER NOT NULL DEFAULT 200,
    error_message TEXT,
    was_fallback BOOLEAN NOT NULL DEFAULT false,
    fallback_reason VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT ck_model_call_logs_tokens CHECK (input_tokens >= 0 AND output_tokens >= 0 AND cached_tokens >= 0),
    CONSTRAINT ck_model_call_logs_cost CHECK (cost_usd >= 0)
);

-- Failed Jobs (Queue Dead-Letter Office)
CREATE TABLE IF NOT EXISTS failed_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    queue_name VARCHAR(100) NOT NULL DEFAULT 'default',
    job_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    resolved_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT ck_failed_jobs_status CHECK (status IN ('pending', 'retrying', 'resolved', 'abandoned'))
);

-- ============================================================================
-- 3. Knowledge Ingestion Brain (Feature 2)
-- ============================================================================

-- Sitemaps (Hierarchical via parent_id)
CREATE TABLE IF NOT EXISTS sitemaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES sitemaps(id) ON DELETE CASCADE,
    url VARCHAR(1024) NOT NULL,
    crawl_frequency VARCHAR(50) NOT NULL DEFAULT 'weekly',
    total_urls_discovered INTEGER NOT NULL DEFAULT 0,
    total_chunks_embedded INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    last_crawled_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_sitemaps_biz_url UNIQUE (business_id, url),
    CONSTRAINT ck_sitemaps_freq CHECK (crawl_frequency IN ('daily', 'weekly', 'fifteen_days', 'monthly', 'manual')),
    CONSTRAINT ck_sitemaps_status CHECK (status IN ('pending', 'crawling', 'completed', 'failed', 'archived'))
);

-- Knowledge Pages (Canonical Webpages)
CREATE TABLE IF NOT EXISTS knowledge_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    url VARCHAR(1024) NOT NULL,
    normalized_url VARCHAR(1024) NOT NULL,
    title VARCHAR(512),
    http_status INTEGER,
    health_level VARCHAR(50) NOT NULL DEFAULT 'active',
    failure_count INTEGER NOT NULL DEFAULT 0,
    content_hash VARCHAR(64),
    etag VARCHAR(100),
    redirect_url VARCHAR(1024),
    is_standalone BOOLEAN NOT NULL DEFAULT false,
    last_checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_knowledge_pages_biz_norm_url UNIQUE (business_id, normalized_url),
    CONSTRAINT ck_knowledge_pages_health CHECK (health_level IN ('active', 'watch', 'quarantined', 'archived')),
    CONSTRAINT ck_knowledge_pages_failures CHECK (failure_count >= 0)
);

-- Sitemap URLs (M:N Cross-Link Between Sitemaps and Canonical Pages)
CREATE TABLE IF NOT EXISTS sitemap_urls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    sitemap_id UUID NOT NULL REFERENCES sitemaps(id) ON DELETE CASCADE,
    knowledge_page_id UUID NOT NULL REFERENCES knowledge_pages(id) ON DELETE CASCADE,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    is_duplicate BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT uq_sitemap_urls_sitemap_page UNIQUE (sitemap_id, knowledge_page_id)
);

-- Page Versions (Historical Content Snapshots)
CREATE TABLE IF NOT EXISTS page_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    knowledge_page_id UUID NOT NULL REFERENCES knowledge_pages(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title VARCHAR(512),
    raw_html TEXT,
    cleaned_markdown TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    screenshot_url VARCHAR(1024),
    change_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_page_versions_page_ver UNIQUE (knowledge_page_id, version_number)
);

-- Knowledge Chunks (Vectors & Generated Full-Text TSVector)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    knowledge_page_id UUID NOT NULL REFERENCES knowledge_pages(id) ON DELETE CASCADE,
    page_version_id UUID NOT NULL REFERENCES page_versions(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    heading VARCHAR(512),
    content TEXT NOT NULL,
    image_description TEXT,
    token_count INTEGER NOT NULL,
    embedding vector(1536) NOT NULL,
    tsv tsvector GENERATED ALWAYS AS (
        to_tsvector('english', 
            coalesce(heading, '') || ' ' || 
            content || ' ' || 
            coalesce(image_description, '')
        )
    ) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_knowledge_chunks_ver_idx UNIQUE (page_version_id, chunk_index),
    CONSTRAINT ck_knowledge_chunks_tokens CHECK (token_count > 0)
);

-- Instructions (Explicit Guidelines & Constraints)
CREATE TABLE IF NOT EXISTS instructions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    rule_text TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 1,
    target_roles TEXT[],
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT ck_instructions_priority CHECK (priority IN (0, 1))
);

-- Skills (Actionable Tool Runbooks)
CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_skills_biz_slug UNIQUE (business_id, slug)
);

-- Skill Versions (Change History, Approvals & Teaching Notes)
CREATE TABLE IF NOT EXISTS skill_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    instructions_markdown TEXT NOT NULL,
    notes TEXT,
    trigger_type VARCHAR(50) NOT NULL DEFAULT 'manual',
    is_approved BOOLEAN NOT NULL DEFAULT false,
    approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_skill_versions_skill_ver UNIQUE (skill_id, version_number),
    CONSTRAINT ck_skill_versions_trigger CHECK (trigger_type IN ('manual', 'email_note', 'opus_optimizer'))
);

-- Email Threads (Gmail Synced Threads)
CREATE TABLE IF NOT EXISTS email_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    gmail_thread_id VARCHAR(255) NOT NULL,
    subject VARCHAR(512),
    snippet TEXT,
    message_count INTEGER NOT NULL DEFAULT 1,
    first_message_at TIMESTAMPTZ,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_email_threads_biz_gmail UNIQUE (business_id, gmail_thread_id)
);

-- Email Messages (Thread Content)
CREATE TABLE IF NOT EXISTS email_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    thread_id UUID NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
    gmail_message_id VARCHAR(255) NOT NULL,
    sender VARCHAR(255) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    body_text TEXT NOT NULL,
    body_html TEXT,
    attachment_metadata JSONB NOT NULL DEFAULT '[]'::jsonb,
    sent_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_email_messages_biz_gmail UNIQUE (business_id, gmail_message_id)
);

-- Email Notes (Human Feedback Promoting to Skill Changes)
CREATE TABLE IF NOT EXISTS email_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    thread_id UUID NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
    message_id UUID REFERENCES email_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    applied_to_skill_version_id UUID REFERENCES skill_versions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ============================================================================
-- 4. Ask & Teach Interactive Chat (Feature 3)
-- ============================================================================

-- Chats (Internal Conversations)
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
    mode VARCHAR(50) NOT NULL DEFAULT 'ask',
    active_role_id UUID NOT NULL REFERENCES agent_roles(id) ON DELETE RESTRICT,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT ck_chats_mode CHECK (mode IN ('ask', 'teach'))
);

-- Chat Messages (Turns, Citations, Feedback & Human Corrections)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    role_id UUID REFERENCES agent_roles(id) ON DELETE SET NULL,
    prompt_version_id UUID REFERENCES prompt_versions(id) ON DELETE SET NULL,
    model_call_log_id UUID REFERENCES model_call_logs(id) ON DELETE SET NULL,
    citations JSONB NOT NULL DEFAULT '[]'::jsonb,
    used_skills TEXT[],
    used_lessons UUID[],
    confidence_score NUMERIC(5,2),
    feedback_rating VARCHAR(20),
    human_correction TEXT,
    correction_root_cause VARCHAR(100),
    requires_human BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT ck_chat_messages_sender CHECK (sender_type IN ('user', 'assistant', 'system')),
    CONSTRAINT ck_chat_messages_feedback CHECK (feedback_rating IN ('thumbs_up', 'thumbs_down', 'neutral') OR feedback_rating IS NULL),
    CONSTRAINT ck_chat_messages_root_cause CHECK (correction_root_cause IN (
        'missing_knowledge', 'incorrect_reasoning', 'wrong_tone', 'outdated_info'
    ) OR correction_root_cause IS NULL)
);

-- Lessons (Synthesized Heuristics from Chat Corrections)
CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    source_chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    source_message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    rule_text TEXT NOT NULL,
    file_path VARCHAR(255),
    root_cause VARCHAR(100),
    confidence NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    is_approved BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ============================================================================
-- 5. Eval Lab & Self-Improvement Loop (Feature 4 & Feature 5)
-- ============================================================================

-- Eval Runs (Matrix Benchmark Sessions)
CREATE TABLE IF NOT EXISTS eval_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    benchmark_suite VARCHAR(100) NOT NULL,
    trigger_type VARCHAR(50) NOT NULL DEFAULT 'manual',
    models_tested TEXT[] NOT NULL,
    total_cases INTEGER NOT NULL DEFAULT 0,
    passed_cases INTEGER NOT NULL DEFAULT 0,
    failed_cases INTEGER NOT NULL DEFAULT 0,
    overall_accuracy NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    total_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.000000,
    total_latency_ms INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'running',
    started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT ck_eval_runs_status CHECK (status IN ('running', 'completed', 'failed')),
    CONSTRAINT ck_eval_runs_accuracy CHECK (overall_accuracy >= 0 AND overall_accuracy <= 100)
);

-- Eval Results (Granular Test Case Evaluations)
CREATE TABLE IF NOT EXISTS eval_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    eval_run_id UUID NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
    test_case_id VARCHAR(100) NOT NULL,
    test_category VARCHAR(50) NOT NULL,
    model_id VARCHAR(100) NOT NULL,
    input_query TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    actual_output TEXT NOT NULL,
    judge_model_id VARCHAR(100),
    judge_score NUMERIC(5,2) NOT NULL,
    judge_reason TEXT,
    human_score NUMERIC(5,2),
    human_notes TEXT,
    is_passed BOOLEAN NOT NULL,
    latency_ms INTEGER NOT NULL,
    cost_usd NUMERIC(10, 6) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_eval_results_run_case_model UNIQUE (eval_run_id, test_case_id, model_id),
    CONSTRAINT ck_eval_results_judge_score CHECK (judge_score >= 0 AND judge_score <= 100),
    CONSTRAINT ck_eval_results_latency CHECK (latency_ms >= 0)
);

-- Self-Improve Runs (Autonomous Opus 5.5 Optimization Cycles)
CREATE TABLE IF NOT EXISTS self_improve_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    eval_run_id UUID REFERENCES eval_runs(id) ON DELETE SET NULL,
    generation_number INTEGER NOT NULL,
    trigger_source VARCHAR(50) NOT NULL,
    git_branch VARCHAR(255) NOT NULL,
    baseline_accuracy NUMERIC(5,2) NOT NULL,
    candidate_accuracy NUMERIC(5,2) NOT NULL,
    prompt_diff TEXT,
    skill_diff TEXT,
    rounds_used INTEGER NOT NULL DEFAULT 1,
    max_rounds INTEGER NOT NULL DEFAULT 5,
    total_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.000000,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_review',
    reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT ck_self_improve_status CHECK (status IN ('pending_review', 'promoted', 'rejected', 'rolled_back')),
    CONSTRAINT ck_self_improve_rounds CHECK (rounds_used <= max_rounds)
);

-- ============================================================================
-- 6. Comprehensive Indexing Strategy
-- ============================================================================

-- B-tree Foreign Key & Tenant Scoping Indexes
CREATE INDEX IF NOT EXISTS idx_users_biz_email ON users(business_id, email);
CREATE INDEX IF NOT EXISTS idx_connections_biz_provider ON connections(business_id, provider);
CREATE INDEX IF NOT EXISTS idx_onboarding_biz ON onboarding_status(business_id);
CREATE INDEX IF NOT EXISTS idx_agent_roles_biz_slug ON agent_roles(business_id, slug);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_biz_type_ver ON prompt_versions(business_id, prompt_type, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_model_call_logs_biz_created ON model_call_logs(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_call_logs_job_model ON model_call_logs(job_type, model_id);
CREATE INDEX IF NOT EXISTS idx_failed_jobs_biz_status ON failed_jobs(business_id, status);
CREATE INDEX IF NOT EXISTS idx_sitemaps_biz_parent ON sitemaps(business_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_pages_biz_health ON knowledge_pages(business_id, health_level);
CREATE INDEX IF NOT EXISTS idx_knowledge_pages_biz_norm_url ON knowledge_pages(business_id, normalized_url);
CREATE INDEX IF NOT EXISTS idx_sitemap_urls_sitemap_page ON sitemap_urls(sitemap_id, knowledge_page_id);
CREATE INDEX IF NOT EXISTS idx_page_versions_page_ver ON page_versions(knowledge_page_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_version_idx ON knowledge_chunks(page_version_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_instructions_biz_active_prio ON instructions(business_id, is_active, priority);
CREATE INDEX IF NOT EXISTS idx_skills_biz_slug ON skills(business_id, slug);
CREATE INDEX IF NOT EXISTS idx_skill_versions_skill_ver ON skill_versions(skill_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_email_threads_biz_gmail ON email_threads(business_id, gmail_thread_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_thread_sent ON email_messages(thread_id, sent_at ASC);
CREATE INDEX IF NOT EXISTS idx_email_notes_thread_msg ON email_notes(thread_id, message_id);
CREATE INDEX IF NOT EXISTS idx_chats_biz_user_created ON chats(business_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_created ON chat_messages(chat_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_lessons_biz_approved_active ON lessons(business_id, is_approved, is_active);
CREATE INDEX IF NOT EXISTS idx_eval_runs_biz_created ON eval_runs(business_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_eval_results_run_model_case ON eval_results(eval_run_id, model_id, test_case_id);
CREATE INDEX IF NOT EXISTS idx_self_improve_runs_biz_gen ON self_improve_runs(business_id, generation_number DESC);

-- GIN Indexes (Full-Text Search & Fuzzy Trigram Lookups)
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_tsv ON knowledge_chunks USING gin (tsv);
CREATE INDEX IF NOT EXISTS idx_knowledge_pages_title_trgm ON knowledge_pages USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_content_trgm ON knowledge_chunks USING gin (content gin_trgm_ops);

-- HNSW Vector Index (Semantic Similarity Search via pgvector)
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_hnsw 
ON knowledge_chunks 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- ============================================================================
-- 7. Row-Level Security (RLS) Isolation Policies
-- ============================================================================

DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'users', 'connections', 'onboarding_status', 'agent_roles', 'prompt_versions',
        'model_call_logs', 'failed_jobs', 'sitemaps', 'knowledge_pages', 'sitemap_urls',
        'page_versions', 'knowledge_chunks', 'instructions', 'skills', 'skill_versions',
        'email_threads', 'email_messages', 'email_notes', 'chats', 'chat_messages',
        'lessons', 'eval_runs', 'eval_results', 'self_improve_runs'
    ];
BEGIN
    FOR tbl IN SELECT unnest(tables) LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', tbl || '_tenant_isolation', tbl);
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR ALL ' ||
            'USING (business_id = NULLIF(current_setting(''app.current_business_id'', true), '''')::UUID) ' ||
            'WITH CHECK (business_id = NULLIF(current_setting(''app.current_business_id'', true), '''')::UUID);',
            tbl || '_tenant_isolation', tbl
        );
    END LOOP;
END $$;
