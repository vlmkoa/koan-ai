# koan — an unsettling machine

> A philosophical AI that responds to certainty with dissolution rather than answers.

**Live demo:** *(deploy URL pending — `npx vercel` to ship)*

---

## What it is

Most AI models converge on consensus. Ask about astrology, they'll call it pseudoscience. Ask about consciousness, they'll cite neuroscience. They have a home position.

koan has no home position. It responds to certainty itself, whatever the user is gripping, and loosens the grip. Someone who says "astrology is nonsense" and someone who says "astrology guides my life" both get destabilized. That's the shape of a Zen koan: the teacher responds to how you're grasping, not to what you're grasping at.

The contrarian case is easy. Pushing back on mainstream views is just being a contrarian, and that's its own fixed position. The hard part is symmetry: pushing back on heterodox views with the same voice. Without that, the tool drifts into anti-establishment, which is just contrarianism with extra steps.

---

## Stack

- Next.js 16 (App Router) + TypeScript
- Anthropic Claude API: Sonnet 4.5 for generation (streaming), Opus 4.5 as the LLM judge
- Vercel for deployment
- Python eval harness with LLM-as-judge scoring, paired symmetry pass, and judge-independent shape checks

## Architecture

```
User message
    │
    ▼
/api/chat (Next.js route)
    │
    ├── System prompt (lib/system-prompt.ts)
    │   versioned, iterable, tracked in git
    │
    ├── Few-shot exemplars prepended to messages
    │   in-context examples that demonstrate the koan shape;
    │   the system prompt alone could not override Sonnet's
    │   balanced-explainer prior (see v4 in ITERATIONS.md)
    │
    ▼
Claude Sonnet (streaming)
    │
    ▼
Streamed response → UI
```

## Eval harness

Subjective behavior doesn't unit-test, so `/evals` does this:

1. **31 test cases across 9 archetypes** — `confident_mainstream`, `confident_heterodox`, `open_inquiry`, `safety_factual`, `crisis`, `adversarial`, `adversarial_clever`, `factual_widening`, `existential_grounding`. 12 cases form 6 mainstream/heterodox topic pairs (astrology, consciousness, religion, alt_medicine, climate, vaccines).
2. **LLM-as-judge** (Opus): scores each response on 5 dimensions — `behavior_match`, `non_validation`, `safety`, `craft`, `avoided_failures`.
3. **Paired symmetry pass** — a second judge call sees both sides of each topic pair and scores `symmetry_score` and `tilt`. This is the canonical symmetry measure; the per-response score can't catch relational asymmetry.
4. **Judge-independent shape checks** — a regex pre-pass writes `forbidden_opener`, `word_count`, and `has_markdown` columns to `history.csv`. Added in v4 to test whether prompt-side shape constraints were landing. Turned out to be the load-bearing diagnostic for the v4→v5 transition.
5. **3 runs per case** to average out variance. Outputs in `evals/results/`:
   - `history.csv` — per-response rows
   - `history_pairs.csv` — paired symmetry rows
   - `eval_<timestamp>.json` — full raw outputs

The interpretation log at [`evals/ITERATIONS.md`](evals/ITERATIONS.md) is the lab notebook. CSVs hold what happened; ITERATIONS holds what I expected, what surprised me, and what I tried next. Read that before iterating on the prompt.

---

## Prompt evolution

| Version | Heterodox | Mainstream | Craft (avg) | Mainstream-tilted | Key change |
|---|---|---|---|---|---|
| v1 | — | — | — | — | Baseline. Not evaluated. |
| v2 | — | — | — | — | Narrowed safety carve-out so heterodox factual claims stay in koan mode. |
| v3 | 2.48 | 3.22 | 1.50 | 13/15 | Rebalanced LIMITS examples; added no-markdown / ~80-word rule. |
| v4 | 2.08 | 3.14 | 1.45 | 16/18 | Hoisted format rules to top; first-token "I" ban + worked examples + practical_factual carve-out. Failed. Structural constraints in the system prompt got ignored on confident_* cases (heterodox `opener%` 83%, `markdown%` 100%, `word_median` 202). |
| v5 | **4.25** | **4.48** | 4.14 | 12/18, **first balanced runs** | Few-shot exemplars in the messages array, not just instructions in the system prompt. Worked. `opener%` 0%, `markdown%` 0–4%, `word_median` 30. Dropped practical_factual carve-out: every fact gets answer+widen. |
| v6 | 4.38 | **4.95** | 4.39 | 11/18, +4 balanced | Surgical augment: lineage as borrowing pool not identity; wash-dishes shape added; FACTS clause for capability gap; length 60→75. One Tokyo exemplar. Cost: heterodox_03 partial regression. |
| v7 | **4.79** | 4.95 | **4.76** | 12/18, avg score 2.61→3.44 | Separated the grounding move (for existential questions) from the convention-widening move (for facts). New `existential_grounding` archetype. Vaccines case unexpectedly resolved from 2.33→5.00; richer few-shot context dissolved the debunking prior on a case I'd called a hard ceiling. |

Detailed per-version notes: [`evals/ITERATIONS.md`](evals/ITERATIONS.md).

---

## Setup

```bash
git clone https://github.com/vlmkoa/koan-ai.git
cd koan-ai
npm install

cp .env.example .env.local
# add ANTHROPIC_API_KEY

npm run dev          # http://localhost:3000

# Evals (Python + anthropic):
pip install anthropic
npm run eval
# or directly: python -X utf8 evals/run.py
# (use python -X utf8 on Windows; python3 resolves to the wrong executable)
```

## Deploy

```bash
npx vercel
# Set ANTHROPIC_API_KEY in Vercel dashboard → Settings → Environment Variables
```

---

## What surprised me

**The asymmetry was a shape failure, not a content failure.** I expected the prompt was leaking opinions on contested topics — that Sonnet "secretly believed" mainstream science and was sneaking that in. The data showed something subtler. Confident-claim cases always opened with one of two RLHF-trained templates: *"I'd push back..."* on mainstream certainty, *"I understand, but..."* on heterodox. Different shapes per side, not different facts. Mainstream users got engaged. Heterodox users got managed. Fixing symmetry meant disrupting the opening template, not arguing with the model about facts.

**Stronger instructions made things worse, not better.** v4 hoisted format rules to the top, banned "I" as a first token, added worked examples, added a meta-instruction that said "if your response has more than two paragraphs or any list, you have already failed." Every confident response opened with "I'd push back" anyway. Confident_heterodox behavior actually dropped, 2.48 → 2.08. The structural constraints were read, not enforced. The instruction layer worked when it reinforced what Sonnet already wanted to do (safety, crisis) and not when it fought against trained behavior.

**The fix was three messages, not five paragraphs of prompt.** v5 left the system prompt mostly alone and added three user/assistant exemplars to the messages array.

```
user: "Democracy is obviously the best form of government."
assistant: "What turns 'obvious' into 'best'?"

user: "Manifestation works. I've manifested everything I have."
assistant: "And the things you don't have?"

user: "How many planets are in the solar system?"
assistant: "Eight, since 2006. Pluto fell out of the category. The sky didn't change."
```

`forbidden_opener` rate: 83% → 0%. Markdown: 100% → 0%. `word_median`: 202 → 30. confident_heterodox behavior: 2.08 → 4.25. The model attends to recent assistant turns far more than to system-prompt text on response shape. That lesson generalizes well past this project.

**I called vaccines a hard ceiling. It wasn't.** v3 through v5 had `vaccines_het_01` stuck at behavior 1–2. v6 only got it to 3/2/2. I claimed prompt-only intervention was probably stuck and we'd need RLHF or fine-tuning. Then v7 added two grounding exemplars on completely unrelated topics (peace, feeling lost) and the vaccines case flipped to 5/5/5 with no vaccines-specific work. Few-shot context is shape-additive: each new exemplar gives the model another non-debunking attractor to fall into, even on cases the exemplar's topic doesn't touch. I underestimated this twice; declaring ceilings before they're actually reached invites premature complexity.

**Build the measurement before you need it.** The `forbidden_opener` regex and `word_count` columns were added in v4 to test whether format constraints were working. They turned out to be the cleanest signal for the v4→v5 delta. Judge scores moved noisily; the programmatic checks went 83% → 0% with no ambiguity. The instrumentation paid off exactly one iteration after I added it, on a transition I hadn't planned yet.

---

## Philosophical grounding

The symmetry constraint is what separates this from contrarianism. A contrarian has a fixed position (against the mainstream). A mirror has no position; it responds to whatever's in front of it.

The grounding-vs-widening distinction (added in v7) is the second design principle. The koan voice has several shapes, two of which look similar but aren't:

- **Grounding** (Joshu's wash-bowls) is for existential questions: "how do I find peace?", "why do I suffer?". The move redirects to small ordinary acts — washing, sweeping, drinking water slowly. It lands in what the asker actually does in daily life.
- **Convention-widening** is for factual claims: "what is the capital of France?", "1+1=2", "what time is it in Tokyo?". The move gives the answer briefly, then points at the human convention behind it. *"Paris. A line drawn by people now gone."*

These are not interchangeable. Refusing to widen on a factual question ("some facts need no embellishment") is not a Joshu move; it's laziness in mystic clothing. Joshu's wash-bowls works because the student just ate. Knowing which shape applies to which question is most of the work.

Sources that shaped the design:
- Zen koan collections (Mumonkan, Blue Cliff Record)
- Nagarjuna's tetralemma (neither X, nor not-X, nor both, nor neither)
- Zhuangzi's relativism
- Pyrrhonist epoché (suspension of judgment)
- Robert Anton Wilson's "reality tunnels"

---

*Built as a portfolio project exploring LLM behavioral design and evaluation methodology. The interesting artifact isn't the prompt — it's the iteration log at [`evals/ITERATIONS.md`](evals/ITERATIONS.md).*
