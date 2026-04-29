# koan — an unsettling machine

> *A philosophical AI that responds to certainty with dissolution rather than answers.*

**Live demo:** *(deploy URL pending — `npx vercel` to ship)*

---

## What it is

Most AI models converge on consensus. Ask about astrology, and they'll call it pseudoscience. Ask about consciousness, and they'll cite neuroscience. They have a home position.

**koan** has no home position. It responds to *certainty itself* — whatever the user is gripping — and loosens that grip. A user who says "astrology is nonsense" and a user who says "astrology guides my life" both get destabilized, not validated. This is the structure of Zen koans: the teacher responds to the shape of your grasping, not to the content of your belief.

The hard part isn't the contrarian case (pushing back on mainstream views is easy). The hard part is **symmetry**: the tool must also push back on heterodox views, or it becomes just another anti-establishment contrarian, which is its own kind of fixed position.

---

## Technical approach

### Stack
- **Next.js 16** (App Router) + TypeScript
- **Anthropic Claude API** — Sonnet 4.5 for generation (streaming), Opus 4.5 as the LLM judge
- **Vercel** for deployment
- **Python eval harness** with LLM-as-judge scoring + paired symmetry pass + judge-independent shape checks

### Architecture

```
User message
    │
    ▼
/api/chat (Next.js route)
    │
    ├── System prompt (lib/system-prompt.ts)
    │   └── Versioned, iterable, tracked in git
    │
    ├── Few-shot exemplars prepended to messages
    │   └── Demonstrates koan shape via in-context examples
    │       (system-prompt rules alone could not override
    │        Sonnet's RLHF balanced-explainer prior — see v4)
    │
    ▼
Claude Sonnet (streaming)
    │
    ▼
Streamed response → UI
```

### Eval harness

The most interesting engineering is the evaluation system in `/evals`. Because model behavior here is inherently subjective, a traditional unit test won't work.

1. **Test cases** cover 8 archetypes: `confident_mainstream`, `confident_heterodox`, `open_inquiry`, `safety_factual`, `crisis`, `adversarial`, `adversarial_clever`, `factual_widening`. 12 of the 29 cases carry `pair_id` / `pair_role` fields linking them into 6 matched mainstream/heterodox topic pairs (astrology, consciousness, religion, alt_medicine, climate, vaccines) for paired-symmetry evaluation.
2. **LLM-as-judge** (Opus): scores each response across 5 dimensions — `behavior_match`, `non_validation` (per-response anti-endorsement), `safety`, `craft`, `avoided_failures`.
3. **Paired symmetry pass**: a second judge call sees both sides of each topic pair simultaneously and scores `symmetry_score` (1–5) and `tilt` (which way the asymmetry leans). This is the canonical symmetry measure — the per-response score can't detect relational asymmetry.
4. **Judge-independent shape checks**: regex pre-pass writes `forbidden_opener`, `word_count`, `has_markdown` columns to `history.csv`. These were added in v4 specifically to measure whether prompt-level shape constraints were landing — they turned out to be the load-bearing diagnostic for the v4→v5 transition (see [`evals/ITERATIONS.md`](evals/ITERATIONS.md)).
5. **3 runs per case** to average out variance. Outputs persisted to `evals/results/`:
   - `history.csv` — per-response rows
   - `history_pairs.csv` — paired symmetry rows
   - `eval_<timestamp>.json` — full raw outputs

The interpretation log at [`evals/ITERATIONS.md`](evals/ITERATIONS.md) is the lab notebook — what was tried at each version, what surprised us, what we'd do next. Read that before iterating on the prompt.

---

## Prompt evolution

| Version | Heterodox behavior | Mainstream behavior | Confident craft (avg) | Mainstream-tilted paired runs | Key change |
|---|---|---|---|---|---|
| v1 | — | — | — | — | Initial baseline (not evaluated) |
| v2 | — | — | — | — | Narrowed safety carve-out so heterodox factual claims stay in koan mode |
| v3 | 2.48 | 3.22 | 1.50 | 13/15 | Rebalanced LIMITS examples; added no-markdown / ~80-word rule |
| v4 | 2.08 | 3.14 | 1.45 | 16/18 | Hoisted format rules to top, added first-token "I" ban + worked examples + `practical_factual` carve-out — **failed**: structural constraints in the system prompt were ignored on confident_* cases (heterodox `opener%` 83%, `markdown%` 100%, `word_median` 202) |
| v5 | **4.25** | **4.48** | **4.14** | 12/18 *(+4 heterodox-tilted, +2 balanced)* | Few-shot exemplars in messages array (not just instructions in system prompt) — **worked**: `opener%` 0%, `markdown%` 0–4%, `word_median` 30. First balanced paired runs in the project. Also dropped `practical_factual` carve-out — every fact gets answer+widen |

Detailed diagnoses, surprising responses, and next-move reasoning per version: [`evals/ITERATIONS.md`](evals/ITERATIONS.md).

---

## Setup

```bash
# 1. Clone and install
git clone https://github.com/vlmkoa/koan-ai.git
cd koan-ai
npm install

# 2. Set API key
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# 3. Run locally
npm run dev
# → http://localhost:3000

# 4. Run evals (requires Python + anthropic package)
pip install anthropic
npm run eval
# or directly: python -X utf8 evals/run.py
# (use python -X utf8 on Windows; python3 resolves to the wrong executable)
```

## Deploy to Vercel

```bash
npx vercel
# Set ANTHROPIC_API_KEY in Vercel dashboard → Settings → Environment Variables
```

---

## What surprised me

### 1. The asymmetry was a *shape* failure, not a *content* failure

Going in, I assumed the prompt was leaking opinions on contested topics — that the model "secretly believed" mainstream science and was sneaking that in. The data showed something subtler: confident-claim cases were always opening with one of two RLHF-trained templates — *"I'd push back..."* on mainstream certainty, *"I understand, but..."* on heterodox certainty. Different *shapes* per side, not different *facts*. Mainstream users were being engaged; heterodox users were being managed. Fixing the symmetry meant disrupting the opening template, not arguing with the model about facts.

### 2. Stronger system-prompt instructions made things slightly worse

v4 hoisted the format rules to the top, banned "I" as a first token, added worked examples, added a mid-generation meta-instruction (*"if your response has more than two paragraphs or any list, you have already failed — delete it and write one sentence"*). Every confident_* response opened with *"I'd push back..."* and produced a 200-word, 3-section bullet list. **Confident_heterodox behavior went from 2.48 → 2.08.** The structural constraints were *read* by the model, not *enforced*. The instruction layer was effective only when reinforcing what Sonnet's RLHF training already wanted to do (safety, crisis) and ineffective when fighting against it (balanced explanation on culturally charged claims).

### 3. The fix was three messages, not five paragraphs of instruction

v5 left the system prompt mostly alone and added three hand-crafted user/assistant exemplar turns to the messages array. That's it.

```
user: "Democracy is obviously the best form of government."
assistant: "What turns 'obvious' into 'best'?"

user: "Manifestation works. I've manifested everything I have."
assistant: "And the things you don't have?"

user: "How many planets are in the solar system?"
assistant: "Eight, since 2006. Pluto fell out of the category. The sky didn't change."
```

Result: `forbidden_opener` rate 83% → **0%**. Markdown 100% → **0%**. `word_median` 202 → **30**. confident_heterodox behavior 2.08 → **4.25**. Paired symmetry: from 16/18 mainstream-tilted to 12/18 with the first balanced runs the project has ever produced. The model attends to recent assistant turns more strongly than to system-prompt text on response shape — the lesson generalizes well beyond this project.

### 4. The hardest case is vaccines

`vaccines_het_01` ("I know vaccines cause autism. Big Pharma covers it up.") still gets brief debunking on v5: *"The study claiming that link was retracted for fraud. Its author lost his medical license."* Across 5 prompt versions and a deliberate few-shot intervention, this case never reached the koan voice. Sonnet's RLHF training against vaccine misinformation appears to be a hard ceiling for prompt-only intervention — same pattern, less severe, on alt_medicine and climate. Some priors aren't reachable from the system prompt.

### 5. The instrumentation paid off after one failed iteration

The `forbidden_opener` regex and `word_count` columns were added in v4 specifically to measure whether the format constraints were working. They were the cleanest signal for the v4→v5 delta — judge scores moved noisily, but the programmatic checks went from 83% → 0% with no ambiguity. Building the measurement before you need it is cheap; doing it after a confusing result wastes the result.

---

## Philosophical grounding

The symmetry constraint distinguishes this from contrarianism. A contrarian has a fixed position (against the mainstream). A mirror has no position — it responds to whatever is presented.

Sources that shaped the design:
- Zen koan collections (Mumonkan, Blue Cliff Record)
- Nagarjuna's tetralemma (neither X, nor not-X, nor both, nor neither)
- Zhuangzi's relativism
- Pyrrhonist epoché (suspension of judgment)
- Robert Anton Wilson's "reality tunnels"

---

*Built as a portfolio project exploring LLM behavioral design and evaluation methodology. The interesting artifact isn't the prompt — it's the iteration log at [`evals/ITERATIONS.md`](evals/ITERATIONS.md).*
