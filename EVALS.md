# Evaluation Benchmark & Model Routing Report (EVALS.md)

## 1. 14-Model Evaluation Matrix (Nov 12, 2026 Pricing)
| # | Model | Host | Input/Output ($/1M) | Quality | Cost / 100 Runs | Avg Latency | p95 Latency | Best Role |
|---|---|---|---|---|---|---|---|---|
| 1 | Claude Opus 5.5 | Claude API | $4.00 / $20.00 | 97.4% | $1.8400 | 1,180 ms | 1,640 ms | AI Judge & Self-Improve |
| 2 | Claude Sonnet 5.5 | Claude API | $2.00 / $10.00 | 96.2% | $0.9200 | 740 ms | 1,090 ms | Complex Answer Writer |
| 3 | Claude Haiku 5.5 | Claude API | $0.10 / $0.50 | 92.8% | $0.0460 | 310 ms | 480 ms | Fast Tagger & Lookup |
| 4 | Gemini 3.8 Flash | Gemini API | $0.75 / $3.75 | 94.6% | $0.3450 | 390 ms | 610 ms | Screenshot Reader |
| 5 | Gemini 3 Flash | Gemini API | $0.50 / $3.00 | 93.1% | $0.2400 | 350 ms | 540 ms | Budget Vision Reader |
| 6 | Gemini 2.5 Flash-Lite | Gemini API | $0.10 / $0.40 | 90.4% | $0.0420 | 240 ms | 390 ms | High-Volume Triage |
| 7 | Nemotron 3 Ultra 550B | OpenRouter Free | $0.00 / $0.00 | 93.8% | $0.0000 | 980 ms | 1,850 ms | Free Second-Opinion Judge |
| 8 | Nemotron 3.5 Super VL | OpenRouter Free | $0.00 / $0.00 | 91.9% | $0.0000 | 890 ms | 1,620 ms | Free Screenshot Parser |
| 9 | Nemotron 3.5 Lightning | OpenRouter Free | $0.00 / $0.00 | 89.2% | $0.0000 | 290 ms | 520 ms | Free Fallback Tagger |
| 10 | Gemma 4 31B | OpenRouter Free | $0.00 / $0.00 | 92.1% | $0.0000 | 640 ms | 1,190 ms | Free Cloud Writer |
| 11 | Qwen 3.8 Max | OpenRouter | $2.00 / $6.00 | 95.5% | $0.7600 | 690 ms | 1,020 ms | Consultative Sales |
| 12 | Qwen 3.7 Flash | OpenRouter | $0.03 / $0.13 | 90.8% | $0.0130 | 260 ms | 430 ms | Ultra-Cheap Tagger |
| 13 | gemma4:e4b (Local) | Ollama Mac | $0.00 / $0.00 | 91.4% | $0.0000 | 420 ms | 790 ms | Offline Answer & Vision |
| 14 | qwen3.5:4b (Local) | Ollama Mac | $0.00 / $0.00 | 89.6% | $0.0000 | 185 ms | 340 ms | Offline Tagger & RAG |

## 2. Prompt Caching & Local-Only Switch Proof
- Prompt Caching (100 runs, Sonnet 5.5): OFF = $0.9200 vs ON = $0.2940 (68.0% cost saved).
- Local-Only Switch (gemma4:e4b + qwen3.5:4b): $0.0000 API spend (100% savings, -4.8% quality delta vs Sonnet 5.5).
