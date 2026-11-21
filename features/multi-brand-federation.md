# Feature Proposal 4: Multi-Brand & White-Label Federation

**Author:** Principal Full-Stack Software Architect  
**Status:** Planned Feature Specification  

---

## 1. The Problem It Solves, and for Whom
Agencies, holding companies, and enterprise franchises often operate 5 to 50 distinct sub-brands, products, or regional websites. Currently, an agency must set up and pay for separate workspaces for each brand, preventing cross-product knowledge sharing, centralized billing telemetry, and unified team management. This feature provides hierarchical multi-brand federation under a single enterprise tenant.

## 2. Who Would Pay for It, and Why
Digital agencies, SaaS aggregators, and enterprise software conglomerates ($500k+ ARR). They would pay an enterprise tier ($600–$1,200/mo) to manage all their portfolio brands under one master login with sub-tenant data boundaries and shared global knowledge bases.

## 3. User Flow, Step by Step
1. **Brand Hierarchy Setup:** Master owner opens `/settings/brands`, clicks "Add Sub-Brand", and enters brand name, custom domain, and logo.
2. **Knowledge Partitioning:** Knowledge pages, sitemaps, and skills can be marked as "Global Shared" (e.g. corporate security guidelines) or "Brand Specific" (e.g. Product A vs. Product B documentation).
3. **White-Label Chat Embed:** Generates a custom JavaScript snippet with the brand's primary color, custom logo, and domain CNAME (`support.clientbrand.com`).
4. **Isolated Analytics:** Telemetry tracks model costs per sub-brand while aggregating total consumption into the master account invoice.

## 4. Screens and Tabs on Task 0 Map
- **Location:** In the sidebar workspace dropdown, an hierarchical switcher: `Master Agency -> Sub-Brand A / Sub-Brand B`.
- **Brand Studio:** In `/settings`, adds a new tab: **White-Label & Sub-Brands** (`/settings/brands`).

## 5. New Database Tables and Columns (Linked to DATABASE.md)
```sql
CREATE TABLE sub_brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    custom_domain VARCHAR(255),
    brand_color_hex VARCHAR(10) DEFAULT '#2563EB',
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_sub_brands_slug UNIQUE (business_id, slug)
);

-- Adds sub_brand_id to knowledge_sources and chat_sessions
ALTER TABLE knowledge_sources ADD COLUMN sub_brand_id UUID REFERENCES sub_brands(id) ON DELETE CASCADE;
ALTER TABLE chat_sessions ADD COLUMN sub_brand_id UUID REFERENCES sub_brands(id) ON DELETE CASCADE;
```

## 6. Connection to Existing Architecture
- **Multi-Tenancy:** Extends RLS query filtering to optionally filter on `sub_brand_id` while preserving `business_id` scoping.
- **Router:** Allows setting per-brand model budgets and routing tables in `src/services/llm/router.ts`.
- **Knowledge API:** `/api/brain/query` accepts optional `subBrandId` parameter to restrict retrieval to that brand plus global shared chunks.

## 7. How to Measure Success ("Done When")
**Done when:** An agency creates 2 sub-brands under one business account, proves that Brand A customer chat cannot retrieve Brand B's proprietary documentation, and generates a unified monthly telemetry cost invoice broken down by sub-brand.

## 8. Risks and Failure Modes
- **Cross-Brand Data Leakage:** Query accidentally omitting the `sub_brand_id` filter. *Mitigation:* Enforce strict sub-brand database view or composite foreign key constraints.

## 9. Estimated Hours to Build
**38 Engineering Hours** (Hierarchical schema & RLS: 12h, Brand styling & widget builder: 10h, Multi-brand switcher & UI: 10h, Tests: 6h).
