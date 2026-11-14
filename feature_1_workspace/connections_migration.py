"""
connections_migration.py
------------------------
Alembic migration helper for Task 1.2.

This module is NOT a full Alembic migration file; it documents the DDL that a
migration must apply and exposes a ``generate_migration_sql()`` helper so the
SQL can be printed, logged, or embedded into a real migration's ``op.execute()``
calls without duplicating it.

Usage in an Alembic migration::

    from feature_1_workspace.connections_migration import generate_migration_sql

    def upgrade() -> None:
        for statement in generate_migration_sql().split(";\\n"):
            statement = statement.strip()
            if statement:
                op.execute(statement)
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# DDL fragments
# ---------------------------------------------------------------------------

# 1. CREATE TABLE step_model_assignments
#    Mirrors StepModelAssignment (connections_models.py).
#
#    Columns
#    -------
#    id              UUID          Primary key (gen_random_uuid() default)
#    business_id     UUID          FK → businesses.id  ON DELETE CASCADE, NOT NULL
#    step_name       VARCHAR(50)   NOT NULL; constrained to the 7 pipeline steps
#    model_id        VARCHAR(200)  NOT NULL; free-text model identifier
#    created_at      TIMESTAMPTZ   auto-set on INSERT via DEFAULT now()
#    updated_at      TIMESTAMPTZ   auto-set on INSERT; app responsible for UPDATE
#
#    Constraints
#    -----------
#    uq_step_model_biz_step  UNIQUE(business_id, step_name)
#    ck_step_name_valid       CHECK(step_name IN ( … 7 steps … ))

_CREATE_STEP_MODEL_ASSIGNMENTS = """\
-- ============================================================
-- 1. Create step_model_assignments table
-- ============================================================
CREATE TABLE IF NOT EXISTS step_model_assignments (
    -- Primary key (UUID v4, DB-generated)
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),

    -- Tenant scoping: every assignment belongs to one business
    business_id     UUID        NOT NULL,

    -- Which pipeline step this assignment targets (one of 7 known steps)
    step_name       VARCHAR(50) NOT NULL,

    -- The model identifier chosen for this step
    -- (matches AVAILABLE_MODELS[*].id in connections_models.py)
    model_id        VARCHAR(200) NOT NULL,

    -- Audit timestamps (timezone-aware)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT pk_step_model_assignments
        PRIMARY KEY (id),

    CONSTRAINT fk_step_model_assignments_business
        FOREIGN KEY (business_id)
        REFERENCES businesses (id)
        ON DELETE CASCADE,

    CONSTRAINT uq_step_model_biz_step
        UNIQUE (business_id, step_name),

    CONSTRAINT ck_step_name_valid
        CHECK (step_name IN (
            'tag_job',
            'find_facts',
            'write_answer',
            'read_screenshot',
            'improve_skill',
            'write_lesson',
            'judge_answer'
        ))
);

-- Index to speed up per-business look-ups
CREATE INDEX IF NOT EXISTS ix_step_model_assignments_business_id
    ON step_model_assignments (business_id)"""

# 2. ALTER TABLE connections – ensure all encrypted columns are TEXT
#
#    In models.py every encrypted column is already declared as Text(); these
#    ALTER statements are idempotent no-ops when the type is already TEXT, but
#    they make the intent explicit and serve as a safety net for environments
#    where the column was created as VARCHAR(n) or some other type.
#
#    Encrypted columns (nonce + GCM ciphertext, base64url-encoded):
#      - encrypted_api_key
#      - encrypted_oauth_token
#      - encrypted_refresh_token

_ALTER_CONNECTIONS_ENCRYPTED_COLUMNS = """\
-- ============================================================
-- 2. Ensure encrypted columns in `connections` are TEXT
-- ============================================================
-- These are no-ops when the columns are already TEXT (PostgreSQL 14+).
-- For PostgreSQL < 14 you may need to drop & re-add or use a USING cast.

ALTER TABLE connections
    ALTER COLUMN encrypted_api_key           TYPE TEXT,
    ALTER COLUMN encrypted_oauth_token       TYPE TEXT,
    ALTER COLUMN encrypted_refresh_token TYPE TEXT"""

# ---------------------------------------------------------------------------
# Public helper
# ---------------------------------------------------------------------------


def generate_migration_sql() -> str:
    """Return the full DDL as a single string with inline comments.

    The returned string contains two logical sections separated by a blank
    line.  Each section ends with a semicolon so callers can split on ``";\\n"``
    to execute statements individually.

    Returns
    -------
    str
        Multi-line SQL string ready for printing, ``op.execute()``, or saving
        to a ``.sql`` file.

    Example
    -------
    >>> sql = generate_migration_sql()
    >>> print(sql)
    -- ============================================================
    -- 1. Create step_model_assignments table
    ...
    """
    sections = [
        _CREATE_STEP_MODEL_ASSIGNMENTS,
        _ALTER_CONNECTIONS_ENCRYPTED_COLUMNS,
    ]
    return ";\n\n".join(sections) + ";\n"


# ---------------------------------------------------------------------------
# CLI convenience – ``python -m feature_1_workspace.connections_migration``
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print(generate_migration_sql())
