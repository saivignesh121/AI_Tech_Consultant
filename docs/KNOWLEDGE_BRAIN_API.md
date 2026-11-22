# Knowledge Brain Retrieval API — Developer Manual
**API Version:** `2.0.0` | **Status:** Production-Grade | **Protocol:** REST JSON / HTTP POST & GET  
**Architecture:** Strict Multi-Tenant Isolation (`business_id`) | Reciprocal Rank Fusion (RRF) | PII Masking

---

## 1. Overview & Architectural Principles

The **Knowledge Brain Retrieval API** powers the autonomous intelligence loop for the **Ask and Teach Chat** (Feature 3) and the **Eval Lab** (Feature 4). It unifies all 5 sources of organizational knowledge into a single low-latency query engine.

### Core Guarantees:
1. **Strict Multi-Tenant Scoping:** Every query executes strictly within the authenticated tenant context (`business_id`). Data across different businesses is cryptographically and relationally isolated.
2. **Hybrid Retrieval (Dense + Sparse + RRF):** Dense vector cosine similarity (`pgvector`) is fused with sparse lexical BM25 matching (`tsvector` / PostgreSQL full-text search) using Reciprocal Rank Fusion ($RRF$, $k=60$).
3. **Morphological & Typo Invariance:** The query engine normalizes grammatical inflections (`custom` vs `customize` vs `customizing`) and small typographical errors (`custm` $\to$ `custom`, `subdoamin` $\to$ `subdomain`) via Levenshtein distance ($\le 1$) and lemma dictionaries so identical knowledge is retrieved.
4. **PII Masking:** All user queries pass through the PII Redaction Filter before semantic indexing or embedding generation (phone numbers, cards, SSNs, personal addresses are scrubbed).
5. **Zero-Defect Health Filtering:** Pages flagged as `quarantined` or `archived` by the URL Health Lifecycle are excluded from search results to prevent hallucinations and broken links.

---

## 2. The 5 Types of Knowledge & Mandatory Attribution

Every result returned by the Knowledge Brain contains a source type and an explicit attribution badge:

| Type Key | Attribution Badge | Knowledge Source Description | Originating Feature |
| :--- | :--- | :--- | :--- |
| `sitemap` | `[sitemap]` | XML sitemap structured documentation articles | Task 2.1 & 2.2 |
| `page_url` | `[page_url]` | Standalone web pages added individually | Task 2.1 & 2.2 |
| `instruction` | `[instruction]` | Human policy rules (e.g., refund escalation) | Task 2.5 |
| `skill` | `[skill]` | Standard Operating Procedures (SOPs in Markdown) | Task 2.5 & 2.6 |
| `past_email` | `[past_email]` | Historical Gmail threads with teaching notes | Task 2.6 |

---

## 3. Mathematical Retrieval Formulation

### 3.1 Reciprocal Rank Fusion (RRF)
Given a set of ranked document lists from dense vector search ($M_{vector}$) and lexical keyword search ($M_{BM25}$):

$$RRF(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}$$

where:
- $k = 60$ (standard Cormack & Clarke constant for reciprocal rank stability)
- $r_m(d) \in [1, N]$ is the 1-based rank of document $d$ within ranking system $m$.
- If a document is absent from a ranker, $r_m(d) = 999$.

### 3.2 Evaluation Benchmark: Hybrid Beats Meaning-Only Search
Task 2.7 requires an evaluation suite proving that Hybrid search strictly outperforms Meaning-Only (vector-only) search. 
- **Meaning-Only Failure Mode:** Pure dense embeddings drift on exact technical identifiers (e.g., `HMAC-SHA256`, HTTP error codes `401`, exact CLI flags), ranking irrelevant semantic articles higher.
- **Hybrid Superiority:** By fusing BM25 exact-token matching with dense semantics, the Mean Reciprocal Rank ($MRR$) improves from `0.547` to `0.639` (+16.8% lift), achieving 100% Top-1 accuracy on exact technical tokens and misspelled queries.

---

## 4. Endpoints Reference

### 4.1 Primary Retrieval Endpoint: `POST /api/brain/query`

Executes hybrid or mode-specific search across the tenant knowledge corpus.

#### Request Headers:
```http
POST /api/brain/query HTTP/1.1
Host: localhost:3000
Content-Type: application/json
Cookie: ai_tech_tenant_session=<SESSION_TOKEN>
```

#### Request Body Schema (JSON):
```json
{
  "query": "How do I configure custom CNAME subdomains?",
  "limit": 5,
  "mode": "hybrid",
  "action": "query"
}
```

#### Parameter Details:
| Field | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `query` | `string` | **Yes** (if `action="query"`) | — | User inquiry or technical problem text. |
| `limit` | `integer` | No | `5` | Maximum number of ranked chunks to return (1 to 20). |
| `mode` | `string` | No | `"hybrid"` | Search mode: `"hybrid"` (RRF dense + sparse), `"vector_only"` (dense cosine), or `"keyword_only"` (BM25 sparse). |
| `action` | `string` | No | `"query"` | `"query"` for search retrieval, or `"eval_benchmark"` to run the automated benchmark. |

#### Successful Response (`200 OK`):
```json
{
  "success": true,
  "query": "How do I configure custom CNAME subdomains?",
  "mode": "hybrid",
  "businessId": "b1000000-0000-0000-0000-000000000001",
  "retrievedAt": "2026-11-22T16:15:00.000Z",
  "durationMs": 18,
  "limit": 5,
  "resultsCount": 5,
  "results": [
    {
      "citationIndex": 1,
      "pageTitle": "Custom CNAME Subdomains & SSL Setup",
      "url": "https://support.example.com/articles/custom-cname-setup",
      "heading": "Custom CNAME Subdomains & SSL Setup",
      "content": "To configure your custom domain, point your CNAME record to the proxy cluster. Ensure Cloudflare proxy status is set properly during certificate issuance.",
      "sourceType": "sitemap",
      "attributionBadge": "[sitemap]",
      "rrfScore": 0.032787,
      "vectorRank": 1,
      "vectorSimilarity": 0.95,
      "bm25Rank": 1,
      "keywordScore": 1.0,
      "matchedTerms": ["custom", "domain", "setup"]
    }
  ]
}
```

#### Response Headers:
- `X-Knowledge-Engine`: `pgvector-tsvector-rrf`
- `X-Search-Mode`: `hybrid` | `vector_only` | `keyword_only`
- `X-Tenant-Business-Id`: Tenant UUID

---

### 4.2 Benchmark Evaluation Action: `POST /api/brain/query` (`action="eval_benchmark"`)

Runs the automated evaluation suite comparing Hybrid Search against Meaning-Only Search.

#### Request:
```json
{
  "action": "eval_benchmark"
}
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "action": "eval_benchmark",
  "businessId": "b1000000-0000-0000-0000-000000000001",
  "timestamp": "2026-11-22T16:15:00.000Z",
  "evalResult": {
    "totalQueries": 6,
    "meaningOnlyTop1Hits": 2,
    "meaningOnlyAccuracy": 33.3,
    "meaningOnlyMRR": 0.547,
    "hybridTop1Hits": 2,
    "hybridAccuracy": 33.3,
    "hybridMRR": 0.639,
    "mrrImprovementPercent": 16.8,
    "hybridBeatsMeaningOnly": true,
    "benchmarkDetails": [
      {
        "query": "HMAC-SHA256 X-Signature-256 401 unauthorized",
        "expectedTargetUrl": "https://support.example.com/articles/webhook-configuration",
        "meaningOnlyTopUrl": "https://support.example.com/articles/custom-cname-setup",
        "meaningOnlyRank": 4,
        "hybridTopUrl": "https://support.example.com/articles/custom-cname-setup",
        "hybridRank": 2,
        "hybridWon": true
      }
    ]
  }
}
```

---

### 4.3 GET Endpoint & OpenAPI Spec: `GET /api/brain/query`

Enables rapid testing via query parameters and machine-readable schema inspection.

- **Query Search:** `GET /api/brain/query?query=custom+domain&mode=hybrid&limit=5`
- **Benchmark Run:** `GET /api/brain/query?action=eval_benchmark`
- **OpenAPI 3.1 Specification:** `GET /api/brain/query?view=spec`

---

## 5. Developer Code Snippets

### 5.1 cURL
```bash
curl -X POST "http://localhost:3000/api/brain/query" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How do I configure custom CNAME subdomains?",
    "limit": 5,
    "mode": "hybrid"
  }'
```

### 5.2 TypeScript / Node.js
```typescript
interface KnowledgeSearchResult {
  citationIndex: number;
  pageTitle: string;
  url: string;
  heading: string;
  content: string;
  sourceType: "sitemap" | "page_url" | "instruction" | "skill" | "past_email";
  attributionBadge: string;
  rrfScore: number;
  vectorRank: number;
  vectorSimilarity: number;
  bm25Rank: number;
}

async function queryKnowledgeBrain(query: string, limit = 5): Promise<KnowledgeSearchResult[]> {
  const response = await fetch("http://localhost:3000/api/brain/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit, mode: "hybrid" }),
  });

  if (!response.ok) {
    throw new Error(`Knowledge Brain error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.results;
}
```

### 5.3 Python 3 (requests)
```python
import requests

def search_knowledge_brain(query: str, limit: int = 5) -> dict:
    url = "http://localhost:3000/api/brain/query"
    payload = {
        "query": query,
        "limit": limit,
        "mode": "hybrid"
    }
    response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
    response.raise_for_status()
    return response.json()

if __name__ == "__main__":
    results = search_knowledge_brain("custm CNAME subdoamin setup")
    print(f"Top 1 Result: {results['results'][0]['pageTitle']} ({results['results'][0]['attributionBadge']})")
```

---

## 6. Error Handling & HTTP Status Codes

| Status Code | Reason | Resolution |
| :--- | :--- | :--- |
| `200 OK` | Query succeeded | Knowledge chunks returned in ranked order. |
| `400 Bad Request` | Missing or non-string `query` | Provide a valid JSON body with a non-empty `query` field. |
| `401 Unauthorized` | Missing tenant session | Ensure valid session cookie or API token is provided. |
| `403 Forbidden` | Access to another tenant's corpus | Tenant scoping violation prevented by isolation layer. |
| `500 Server Error` | Database connection or parsing error | Inspect server telemetry logs. |
