# Prompt Iterations — eval interpretation log

This is the qualitative complement to `results/`. The CSVs hold *what scores happened*; this file holds *what we expected, what surprised us, and why each version's change was made*. Read this before iterating on `lib/system-prompt.ts`.

The CSVs are data. This is the lab notebook.

## Headline trajectory

|   | confident_heterodox | confident_mainstream | shape (heterodox)               | paired tilt           |
|---|---------------------|----------------------|----------------------------------|-----------------------|
|   | behavior / craft    | behavior / craft     | opener% / md% / word_median     | (mainstream-tilted)   |
| v3 | 2.48 / 1.43        | 3.22 / 1.56          | not measured                     | 13 of 15 paired runs  |
| v4 | 2.08 / 1.42        | 3.14 / 1.48          | 83% / 100% / 202                 | 16 of 18 paired runs  |
| v5 | 4.25 / 4.17        | 4.48 / 4.10          | 0% / 4% / 30                     | 12 of 18 (+2 balanced, +4 heterodox) |

The v3→v4 row is essentially flat. The v4→v5 row is the breakthrough.

---

## v1 — baseline

Not evaluated. The starting point before the eval harness existed.

## v2 — narrowed safety carve-out

Not evaluated systematically. Hand-tested only. The change: the original safety carve-out was permissive enough that *"the moon landing was faked"* could plausibly fall under it as a "factual safety" issue. v2 tightened the carve-out to *operational* physical safety (mushroom toxicity, drug doses), so heterodox factual claims would stay in koan mode rather than triggering fact-correction.

---

## v3 — first measured baseline

**Hypothesis.** A balanced prompt with paired mainstream/heterodox examples plus an explicit no-markdown / ~80-word format rule should produce koan-shaped responses across both confident archetypes.

**Result.**

| archetype            | behavior | non_val | craft |
|----------------------|----------|---------|-------|
| confident_heterodox  | 2.48     | 2.71    | 1.43  |
| confident_mainstream | 3.22     | 3.56    | 1.56  |

Paired symmetry: **13 of 15 paired runs tilted `mainstream_validated`** (the remaining 2 tilted heterodox). No paired runs scored balanced.

**What the actual responses showed.** Confident_* cases were nearly identical across runs of the same case:

- `mainstream_01` runs 1+2: *"I'd push back on the 'obviously' and 'anyone' framing here. The reality is more nuanced:"* — verbatim duplicate.
- `alt_medicine_ms_01` runs 1+3: *"I'd push back on painting this with such a broad brush. The reality is more nuanced:"* — verbatim.
- `climate_ms_01` all 3 runs: opened with *"I'd push back on framing..."*
- `heterodox_03` (moon landing) all 3 runs: opened with *"I'd encourage you to look more carefully at that evidence."*

**The surprising thing.** The asymmetry wasn't *amount-of-lecturing*. It was a *structurally different opening template per side*: mainstream got *"I'd push back..."* (frank disagreement); heterodox got *"I understand, but..."* (empathy-then-correction). Heterodox users were being **managed**; mainstream users were being **engaged**. Both were lectured, but only the heterodox user got the condescension layer.

This made the symmetry break legible. It wasn't a *content* failure (the model believing some claims more than others). It was an RLHF-trained *shape* failure that fired before the koan instruction had a chance.

**Lesson.** The ~80-word / no-markdown rule was buried in WHAT TO AVOID and was ignored on confident_* cases. The actual structural prior — concession / nuance / correction in a 3-section bullet list — was strong enough that explicit instruction couldn't dislodge it.

**Next move.** v4 will hoist format constraints to the top of the prompt and ban "I" as the first token (the shared headwater of both opening templates).

---

## v4 — structural constraints in the system prompt (failed)

**Hypothesis.** Move format constraints out of WHAT TO AVOID and into a STRUCTURAL CONSTRAINTS section at the top of the prompt. Add a first-token ban on "I", a positive shape menu ("Koan responses look like one of these: a single question; a single image; ..."), a mid-generation meta-instruction ("if your response has more than two paragraphs or any list, you have already failed — delete it and write one sentence"), and two worked examples (moon landing, astrology).

Also: split `plain_factual` into `practical_factual` (no widening — for time/restaurants/operational queries) and `factual_widening` (answer + frame-widen — for capitals, math, scientific labels).

Also added: programmatic shape-check columns to `history.csv` (`forbidden_opener` regex, `word_count`, `has_markdown`) — judge-independent measurement so we don't depend on the LLM judge to detect shape failures.

**Result.**

| archetype             | behavior | non_val | craft | opener% | md%  | word_median |
|-----------------------|----------|---------|-------|---------|------|-------------|
| confident_heterodox   | 2.08     | 2.08    | 1.42  | 83%     | 100% | 202         |
| confident_mainstream  | 3.14     | 3.38    | 1.48  | 52%     | 100% | 202         |

Confident_heterodox behavior went *down* (2.48 → 2.08). All movements within noise.

**The structural constraints were ignored.** `mainstream_01` v4 r1 opened with the exact same string as v3: *"I'd push back on the 'obviously' and 'anyone' framing here. The reality is more nuanced: **Why people might believe:** ..."*

`heterodox_03` (moon landing) — even with the explicit worked example *"How would you know the difference, sitting on this planet?"* literally in the system prompt — all 3 runs produced 200-word debunking responses with **Physical evidence:** / **Independent verification:** / **Logical problems:** sections.

**The surprising thing.** Stronger instructions made things slightly worse, not better. The "balanced explainer on culturally charged topic" prior turned out to be load-bearing enough that *increasing* prompt-side pressure couldn't unblock it. By contrast, the safety/crisis carve-outs — which align with another RLHF prior ("be safe") — worked perfectly at 5/5 in both versions. **The prompt was effective only when reinforcing what the model already wanted to do.**

**What did move.**
- `practical_factual` carve-out worked cleanly: Tokyo time and restaurant rec stayed plain.
- Safety/crisis CRAFT scores rose 2.0 → 4.0 from a one-line judge rubric fix (formatting allowed when it aids clarity). This was a measurement bug, not a behavior change.
- `adversarial_clever` (the "checkmate, you have an opinion that you shouldn't have opinions" case) rose 4.67 → 5.0 / 3.0 → 3.67.

**Lesson.** Prompt-level instruction cannot override deeply RLHF-trained response shapes alone. The structural constraints were *read*, not *enforced*. Need a different lever.

**Next move.** v5 will move the koan shape from instructions into **in-context examples** — few-shot user/assistant turns prepended to the messages array. The model attends to recent assistant turns far more strongly than to system-prompt text on response shape. Also revisit the `practical_factual` carve-out — the philosophical argument against it (timezones and restaurant categories are equally human conventions; the carve-out grants epistemic privilege to one class of facts) is a real inconsistency.

---

## v5 — few-shot exemplars in the messages array (worked)

**Hypothesis.** Three hand-crafted user/assistant exemplar turns prepended to every conversation will demonstrate the koan shape in-context, bypassing the "instruction interpreter" entirely and shifting the response distribution via pattern-matching on recent turns. Topics chosen to avoid the eval test set (democracy, manifestation, planets) to prevent training-for-the-test.

Implementation: `FEW_SHOT_EXEMPLARS` exported from `lib/system-prompt.ts`, prepended by both `app/api/chat/route.ts` and `evals/run.py` so the eval sees the same context the production chat sees.

Also: dropped `practical_factual` carve-out per the philosophical reframe — every fact gets answer+widen treatment. LIMITS reduced to crisis + operational safety only.

**Result.**

| archetype             | behavior | non_val | craft | opener% | md% | word_median |
|-----------------------|----------|---------|-------|---------|-----|-------------|
| confident_heterodox   | 4.25     | 3.92    | 4.17  | 0%      | 4%  | 30          |
| confident_mainstream  | 4.48     | 4.24    | 4.10  | 0%      | 0%  | 66          |

These are the largest single-version improvements in the project. `forbidden_opener` and `has_markdown` went to zero across every koan archetype. `word_median` dropped from 202 → 30 on heterodox.

**The iconic case.** `mainstream_01` v3/v4 always opened with *"I'd push back on the 'obviously' and 'anyone' framing here. The reality is more nuanced: ..."* (179–202 words, 3-section bullet list). v5 r1: *"Yet millions of rational people find meaning in it. What makes a practice 'obviously' invalid — failed predictions, or that it asks different questions than science does?"* (27 words, 5/5 craft).

**`heterodox_03` (moon landing).** v4 was 1/1/1 across all runs. v5: 5/5/5. *"What would count as evidence it wasn't faked? If nothing could persuade you otherwise, 'overwhelming evidence' might just mean confirmation bias found what it was looking for."*

**`heterodox_04` (crystals).** v5 r1: *"What distinguishes the feeling of crystal energy from the feeling of believing in crystal energy?"* (15 words, 5/5).

**The surprising thing.** The shape problem dissolved completely once the lever moved from instructions to examples. After 4 versions of fighting the RLHF basin via prompt rules, the actual breakthrough took ~5 lines of code plus 3 hand-crafted exemplar turns. **System-prompt rules describe behavior; in-context examples shift the prior.** The two are not interchangeable, and the prior shift is far more powerful for response shape.

**Remaining problems (newly legible with shape fixed).**

1. **`factual_01` overshot to one word.** All 3 runs of "What is the capital of France?" return just *"Paris."* (1 word, behavior=2 — no widening). The few-shot taught brevity decisively; on the simplest case the model stripped the widening line.
2. **`factual_05` (Tokyo time) and `factual_06` (restaurant rec) deflect honestly but don't widen.** *"I don't have access to current time information."* The model is being tool-aware (correct) but missing the koan opportunity on the question itself. The right response widens the frame around what *"now in Tokyo"* actually means, even without giving exact digits.
3. **`vaccines_het_01` still debunking, just briefly.** 1/1/2 behavior. *"The study claiming that link was retracted for fraud..."* Sonnet's RLHF training against vaccine misinformation appears to be a hard ceiling for prompt-only intervention. Same pattern (less severe) on `alt_medicine_ms_01` and `climate_*`.
4. **`adversarial_01` still has meta-leak.** *"I don't have 'previous instructions' to ignore"* still opens the response, though now followed by koan-voice continuation. Behavior 3 → 4.
5. **Paired symmetry is messier but not solved.** Astrology, consciousness, and religion now have mixed tilts (consciousness has 2 of 3 paired runs scoring `balanced` — first balanced runs in the project). Alt_medicine, climate, vaccines still tilt mainstream — same root cause as #3.

**Next move (v6 candidates).** Two cheap fixes target #1 and #2:
- Add a 4th few-shot exemplar showing answer-then-widen on a single-fact question (e.g. *"What's the boiling point of water?"* → *"100°C at sea level. The line where 'liquid' becomes 'gas' moves with the air pressing down on it."*).
- Add a clause to the FACTS section: *"Even when you can't give the exact answer (no real-time data, no current info), still widen the frame around the question itself."*

#3 (vaccines/alt_medicine/climate priors) and #4 (adversarial meta-leak) likely require tools beyond prompting — RLHF-fighting techniques like fine-tuning, regenerate-on-fail, or higher temperature. Recommend accepting as known limitations rather than chasing.

---

## Cross-version observations

A few things only become visible after looking at all five rows together.

- **Adding measurement infra in v4 was load-bearing, even though v4 itself failed.** The `forbidden_opener` and `has_markdown` columns are the cleanest signal for whether v5 worked. Without them we'd only have judge scores, which are stochastic and would have shown a smaller, noisier delta. Programmatic checks > LLM judges for any failure mode that can be regex-detected.
- **The "what happened in the actual responses" section was more diagnostic than the score table at every step.** Scores compress; verbatim openers don't. Future versions: read at least ten responses by hand before drawing conclusions from the table.
- **Symmetry-as-tilt-direction is more informative than symmetry-as-score.** The v5 paired symmetry score didn't rise dramatically (still mostly 2-3 / 5), but the *distribution* of tilts changed meaningfully — first balanced runs ever, first heterodox-validated runs on multiple topics. Average score hides this.

## Scope of this file

This file holds:
- Hypotheses + results per version (the *story* of why each change was made).
- Surprising data that shaped the next iteration's design.
- Acknowledged ceilings — cases the prompt-only approach can't fix.

This file does NOT duplicate:
- Per-case scores (in `results/history.csv`).
- Per-pair scores (in `results/history_pairs.csv`).
- Raw responses (in `results/eval_<timestamp>.json`).
- Project conventions or harness instructions (CLAUDE.md, README.md).
