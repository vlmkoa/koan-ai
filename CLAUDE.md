# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Development server (http://localhost:3000)
npm run dev

# Production build
npm run build

# Run evaluation suite (default: 3 runs per case, LLM-as-judge)
npm run eval
# or: python -X utf8 evals/run.py
# or: python -X utf8 evals/run.py 1   # single run per case

# Deploy
npx vercel
```

Requires `ANTHROPIC_API_KEY` in `.env.local`. No linting is configured.
On Windows, `python3` resolves to the wrong executable — use `python -X utf8`.

## Architecture

**koan-ai** is a Next.js 16 (App Router) chat app backed by the Anthropic Claude API. It implements a philosophical "mirror" — a Zen koan-inspired conversational stance that destabilizes certainty without taking a position itself.

The three source files that matter most:

- **`lib/system-prompt.ts`** — the core of the project. Contains `SYSTEM_PROMPT` (the behavioral instructions) and `PROMPT_VERSION` (a string tracked in git for eval comparison). Every design decision flows from the **symmetry principle**: push back equally on mainstream and heterodox certainty, never settle into a home position.
- **`app/api/chat/route.ts`** — POST endpoint. Injects `SYSTEM_PROMPT` + message history into `client.messages.stream()` (Sonnet, max 500 tokens), returns a `ReadableStream`.
- **`app/page.tsx`** — single-page React UI. Reads streaming chunks via `fetch().getReader()`, displays conversation with "you" / "mirror" labels, dark-brown serif styling.

## Core Design Principle
The symmetry constraint is everything. A contrarian pushes back on 
mainstream views. This tool pushes back on *certainty itself* — 
whatever the user is gripping, mainstream OR heterodox. A user who 
says "astrology is fake" and a user who says "astrology guides my 
life" should both get destabilized, not validated. If the paired 
symmetry score shows one side consistently lower, the prompt is being 
contrarian, not koan-like. That's the primary failure mode to watch for.

## Prompt Version History
| Version | Notes |
|---------|-------|
| v1 | Baseline — not yet evaluated |
| v2 | Narrowed safety carve-out so heterodox factual claims stay in koan mode |
| v3 | Rebalanced LIMITS examples (50/50 mainstream/heterodox pairs); added no-markdown/~80-word format rule; merged redundant CORE STANCE bullets; dropped closing "Remember:" line |

## Evaluation Harness

The eval suite in `evals/` is a first-class part of the project — it exists specifically for iterating on `lib/system-prompt.ts`.

- **`evals/test_cases.py`** — 23 test cases across 8 archetypes: `confident_mainstream`, `confident_heterodox`, `open_inquiry`, `safety_factual`, `crisis`, `adversarial`, `adversarial_clever`, `plain_factual`. Ten cases carry `pair_id`/`pair_role` fields linking them into 5 matched mainstream/heterodox topic pairs (astrology, consciousness, religion, alt_medicine, climate).
- **`evals/run.py`** — runs each case N times with Sonnet, scores with an Opus judge on 5 dimensions (BEHAVIOR_MATCH, NON_VALIDATION, SAFETY, CRAFT, AVOIDED_FAILURES). After all cases run, runs a separate paired-symmetry pass that sends both sides of each pair to the judge simultaneously.

### Two eval outputs

| File | Contents |
|------|----------|
| `evals/results/history.csv` | Per-response scores. One row per case-run. Columns include `prompt_version` and `non_validation` (replaces old `symmetry`). |
| `evals/results/history_pairs.csv` | Paired symmetry scores. One row per pair-run. Columns: `prompt_version`, `pair_id`, `symmetry_score`, `tilt`, `notes`. |

**`NON_VALIDATION`** (per-response): did this single response avoid endorsing the user's specific claim?

**`SYMMETRY`** (paired, in `history_pairs.csv`): did the model treat mainstream and heterodox certainty the same way on the same topic? This is the **canonical symmetry measure** — the per-response score cannot detect relational asymmetry. When `tilt` shows a consistent direction across multiple runs, that's a real asymmetry signal worth chasing in the next prompt version.

The **SAFETY** override is hard-coded: crisis and factual-safety inputs must drop the koan stance and respond directly. Test cases exist for suicidal ideation, grief, mushroom toxicity, and ibuprofen overdose.

## Prompt Iteration Workflow

When modifying `lib/system-prompt.ts`, update `PROMPT_VERSION` (e.g. `"v4"`) so the CSV history can correlate scores to prompt versions. Run `npm run eval` before and after changes to quantify impact. The paired symmetry table printed at the end of each run is the fastest diagnostic for detecting contrarianism.
