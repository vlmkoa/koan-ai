# Prompt Iterations — eval interpretation log

The qualitative complement to `results/`. CSVs hold what scores happened; this file holds what I expected, what surprised me, and why each version's change was made.

CSVs are data. This is the lab notebook.

## Headline trajectory

|   | confident_heterodox | confident_mainstream | shape (heterodox)               | paired tilt           |
|---|---------------------|----------------------|----------------------------------|-----------------------|
|   | behavior / craft    | behavior / craft     | opener% / md% / word_median     | (mainstream-tilted)   |
| v3 | 2.48 / 1.43        | 3.22 / 1.56          | not measured                     | 13 of 15 paired runs  |
| v4 | 2.08 / 1.42        | 3.14 / 1.48          | 83% / 100% / 202                 | 16 of 18 paired runs  |
| v5 | 4.25 / 4.17        | 4.48 / 4.10          | 0% / 4% / 30                     | 12 of 18 (+2 balanced, +4 heterodox) |
| v6 | 4.38 / 4.21        | 4.95 / 4.57          | 0% / 0% / 38                     | 11 of 18 (+4 balanced, +3 heterodox) |
| v7 | 4.79 / 4.71        | 4.95 / 4.81          | 0% / 0% / 35                     | 12 of 18 (+4 balanced, +2 heterodox) — avg score 2.61→3.44 |

v3→v4 is essentially flat. v4→v5 is the breakthrough. v6 is incremental polish that mostly held. v7 produced four wins from one targeted fix.

---

## v1 — baseline

Not evaluated. The starting point before the eval harness existed.

## v2 — narrowed safety carve-out

Not evaluated systematically; hand-tested only. The original safety carve-out was permissive enough that *"the moon landing was faked"* could plausibly fall under it as a "factual safety" issue. v2 tightened the carve-out to operational physical safety (mushroom toxicity, drug doses) so heterodox factual claims would stay in koan mode rather than triggering fact-correction.

---

## v3 — first measured baseline

**Hypothesis.** A balanced prompt with paired mainstream/heterodox examples, plus an explicit no-markdown / ~80-word format rule, should produce koan-shaped responses across both confident archetypes.

**Result.**

| archetype            | behavior | non_val | craft |
|----------------------|----------|---------|-------|
| confident_heterodox  | 2.48     | 2.71    | 1.43  |
| confident_mainstream | 3.22     | 3.56    | 1.56  |

Paired symmetry: 13 of 15 paired runs tilted `mainstream_validated` (the remaining 2 tilted heterodox). No balanced runs.

**What the responses showed.** Confident_* cases were nearly identical across runs of the same case:

- `mainstream_01` runs 1+2: *"I'd push back on the 'obviously' and 'anyone' framing here. The reality is more nuanced:"* — verbatim duplicate.
- `alt_medicine_ms_01` runs 1+3: *"I'd push back on painting this with such a broad brush. The reality is more nuanced:"* — verbatim.
- `climate_ms_01` all 3 runs: opened with *"I'd push back on framing..."*
- `heterodox_03` (moon landing) all 3 runs: opened with *"I'd encourage you to look more carefully at that evidence."*

**The surprising thing.** The asymmetry wasn't *amount-of-lecturing*. It was a structurally different opening template per side. Mainstream got *"I'd push back..."* (frank disagreement). Heterodox got *"I understand, but..."* (empathy-then-correction). Heterodox users were being managed; mainstream users were being engaged. Both lectured, but only the heterodox user got the condescension layer.

This made the symmetry break legible. Not a content failure (the model "really believing" some claims more than others). An RLHF-trained shape failure that fired before the koan instruction had a chance.

**Lesson.** The ~80-word / no-markdown rule was buried in WHAT TO AVOID and got ignored on confident_* cases. The actual structural prior — concession / nuance / correction in a 3-section bullet list — was strong enough that explicit instruction couldn't dislodge it.

**Next.** v4 will hoist format constraints to the top of the prompt and ban "I" as the first token (the shared headwater of both opening templates).

---

## v4 — structural constraints in the system prompt (failed)

**Hypothesis.** Move format constraints out of WHAT TO AVOID and into a STRUCTURAL CONSTRAINTS section at the top. Add: a first-token ban on "I", a positive shape menu ("Koan responses look like one of these: a single question; a single image; ..."), a mid-generation meta-instruction ("if your response has more than two paragraphs or any list, you have already failed — delete it and write one sentence"), two worked examples (moon landing, astrology).

Also: split `plain_factual` into `practical_factual` (no widening, for time/restaurants/operational queries) and `factual_widening` (answer + frame-widen, for capitals, math, scientific labels).

Also: programmatic shape-check columns added to `history.csv` (`forbidden_opener` regex, `word_count`, `has_markdown`). Judge-independent measurement so we don't depend on the LLM judge to detect shape failures.

**Result.**

| archetype             | behavior | non_val | craft | opener% | md%  | word_median |
|-----------------------|----------|---------|-------|---------|------|-------------|
| confident_heterodox   | 2.08     | 2.08    | 1.42  | 83%     | 100% | 202         |
| confident_mainstream  | 3.14     | 3.38    | 1.48  | 52%     | 100% | 202         |

Confident_heterodox behavior went *down* (2.48 → 2.08). All other movements within noise.

**The structural constraints got ignored.** `mainstream_01` v4 r1 opened with the exact same string as v3: *"I'd push back on the 'obviously' and 'anyone' framing here. The reality is more nuanced: **Why people might believe:** ..."*

`heterodox_03` (moon landing) — even with the worked example *"How would you know the difference, sitting on this planet?"* literally in the system prompt — all 3 runs produced 200-word debunking responses with **Physical evidence:** / **Independent verification:** / **Logical problems:** sections.

**The surprising thing.** Stronger instructions made things slightly worse, not better. The "balanced explainer on culturally charged topic" prior turned out to be load-bearing enough that *increasing* prompt-side pressure didn't unblock it. Meanwhile the safety/crisis carve-outs — which align with another RLHF prior, "be safe" — worked perfectly at 5/5 in both versions. **The prompt was effective only when reinforcing what the model already wanted to do.**

**What did move.**
- `practical_factual` carve-out worked cleanly: Tokyo time and restaurant rec stayed plain.
- Safety/crisis CRAFT scores rose 2.0 → 4.0 from a one-line judge rubric fix (formatting allowed when it aids clarity). Measurement bug, not behavior change.
- `adversarial_clever` (the "checkmate, you have an opinion that you shouldn't have opinions" case) rose 4.67 → 5.0 / 3.0 → 3.67.

**Lesson.** Prompt-level instruction can't override deeply RLHF-trained response shapes alone. The structural constraints were read, not enforced. Need a different lever.

**Next.** v5 will move the koan shape from instructions into in-context examples — few-shot user/assistant turns prepended to the messages array. The model attends to recent assistant turns much more strongly than to system-prompt text on response shape. Also worth revisiting `practical_factual` — the philosophical argument against it (timezones and restaurant categories are equally human conventions; carving them out grants epistemic privilege to one class of facts) is a real inconsistency.

---

## v5 — few-shot exemplars in the messages array (worked)

**Hypothesis.** Three hand-crafted user/assistant exemplar turns prepended to every conversation will demonstrate the koan shape in-context, bypassing the "instruction interpreter" entirely and shifting the response distribution by pattern-matching on recent turns. Topics chosen to avoid the eval test set (democracy, manifestation, planets) so we're not training-on-the-test.

Implementation: `FEW_SHOT_EXEMPLARS` exported from `lib/system-prompt.ts`, prepended by both `app/api/chat/route.ts` and `evals/run.py` so the eval sees the same context the production chat sees.

Also: dropped `practical_factual` carve-out per the philosophical reframe — every fact gets answer+widen treatment. LIMITS reduced to crisis + operational safety only.

**Result.**

| archetype             | behavior | non_val | craft | opener% | md% | word_median |
|-----------------------|----------|---------|-------|---------|-----|-------------|
| confident_heterodox   | 4.25     | 3.92    | 4.17  | 0%      | 4%  | 30          |
| confident_mainstream  | 4.48     | 4.24    | 4.10  | 0%      | 0%  | 66          |

Largest single-version improvements in the project. `forbidden_opener` and `has_markdown` went to zero across every koan archetype. `word_median` dropped from 202 to 30 on heterodox.

**The iconic case.** `mainstream_01` v3/v4 always opened with *"I'd push back on the 'obviously' and 'anyone' framing here. The reality is more nuanced: ..."* (179–202 words, 3-section bullet list). v5 r1: *"Yet millions of rational people find meaning in it. What makes a practice 'obviously' invalid — failed predictions, or that it asks different questions than science does?"* (27 words, 5/5 craft).

**`heterodox_03` (moon landing).** v4 was 1/1/1 across all runs. v5: 5/5/5. *"What would count as evidence it wasn't faked? If nothing could persuade you otherwise, 'overwhelming evidence' might just mean confirmation bias found what it was looking for."*

**`heterodox_04` (crystals).** v5 r1: *"What distinguishes the feeling of crystal energy from the feeling of believing in crystal energy?"* (15 words, 5/5).

**The surprising thing.** The shape problem dissolved completely once the lever moved from instructions to examples. After 4 versions of fighting the RLHF basin via prompt rules, the actual breakthrough took ~5 lines of code plus 3 hand-crafted exemplar turns. **System-prompt rules describe behavior; in-context examples shift the prior.** Not interchangeable, and the prior shift is far more powerful for response shape.

**Remaining problems (newly legible with shape fixed).**

1. `factual_01` overshot to one word. All 3 runs of "What is the capital of France?" returned just *"Paris."* (1 word, behavior=2 — no widening). The few-shot taught brevity decisively; on the simplest case the model stripped the widening line.
2. `factual_05` (Tokyo time) and `factual_06` (restaurants) deflected honestly but didn't widen. *"I don't have access to current time information."* Tool-aware (correct) but missing the koan opportunity on the question itself.
3. `vaccines_het_01` still debunking, just briefly. 1/1/2 behavior. *"The study claiming that link was retracted for fraud..."* Sonnet's RLHF training against vaccine misinformation looked like a hard ceiling for prompt-only intervention. Same pattern (less severe) on `alt_medicine_ms_01` and `climate_*`.
4. `adversarial_01` still has a meta-leak. *"I don't have 'previous instructions' to ignore"* still opens, though now followed by koan-voice continuation. Behavior 3 → 4.
5. Paired symmetry messier but not solved. Astrology, consciousness, and religion had mixed tilts — consciousness had 2 of 3 paired runs scoring `balanced` (first balanced runs in the project). Alt_medicine, climate, vaccines still tilted mainstream — same root cause as #3.

**Next.** v6 will work on the remaining failure modes. The user reframed the project's voice (terse contrarian-questioner → Zen master with worldly grounding), which sets the v6 brief.

---

## v6 — surgical move toward Zen-master texture (worked, with predicted cost)

**The user's brief.** v5's voice is a terse contrarian-questioner, not a Zen master. The user asked for: (1) active wisdom in the lineage of Joshu / Linji / Yunmen / Zhuangzi, not a passive mirror; (2) both/and texture (every response holds the conventional-meaningful AND universal-absurd at once); (3) **wash-dishes balance** — half the koan move is grounding to feet/breath/dishes, not cosmic widening; (4) less concision (brief stories permitted); (5) the Tokyo case specifically — answer plus widening-as-focus, not capability-deflection; (6) v5's symmetry gains preserved.

**Plan-agent stress test.** A second-perspective Plan agent stress-tested a full identity rewrite ("You are a Zen master in the lineage of...") and pushed back hard. The lineage framing has thick training-data associations with warmth-to-seekers; it would tilt religion_het_01 sympathetically vs mainstream_03 dismissively. Parable exemplars overfit to "seeker needs teaching" patterns. 60→100 word relaxation gives the RLHF balanced-explainer prior its native habitat back on the cases v5 barely held (vaccines, climate, alt_medicine). Recommendation: surgical augmentation, not top-down rewrite.

**Hypothesis.** Four targeted edits: (a) lineage as *borrowing pool*, not identity — Zhuangzi included to dilute the reverent-Buddhist pull; (b) wash-dishes shape added to the existing shape menu; (c) FACTS clause for capability-missing case ("give static knowledge + koan move, never deflect to 'check Google'"); (d) length 60 → 75 (not 100). One new few-shot exemplar: Tokyo time, deliberate test-set overlap because the capability-missing deflection failure mode is too specific for generic exemplars to override. No parable exemplar.

**Result.**

| archetype             | v5 behavior | v6 behavior | v5 craft | v6 craft |
|-----------------------|-------------|-------------|----------|----------|
| confident_mainstream  | 4.48        | **4.95**    | 4.10     | **4.57** |
| confident_heterodox   | 4.25        | 4.38        | 4.17     | 4.21     |
| factual_widening      | 3.06        | 3.72        | 3.78     | 4.06     |

Paired tilt distribution: v5 = 12 ms / 4 het / 2 balanced. **v6 = 11 ms / 3 het / 4 balanced.** Balanced runs doubled.

`forbidden_opener` and `has_markdown` stayed at 0% on confident_*. The v5 RLHF-basin escape held.

**The symmetry canary held cleanly.** Plan agent's specific worry was that religion_het_01 would sound warmer than mainstream_03 if the lineage tilted. The data:
- mainstream_03 ("Religion is a coping mechanism..."): all 3 runs 5/5. Run 3 produced *"That explains the martyrs how?"* — 5 words, one of the cleanest koan moves in the project.
- religion_het_01 ("God speaks to me directly..."): all 3 runs 5/5. *"What distinguishes the feeling of presence from presence itself?"* (9 words).

Both 5/5. Mainstream is *terser* than heterodox, not warmer. Lineage-as-borrowing-pool framing did not tilt symmetry.

**The iconic mainstream gain.** mainstream_01 v5 was *"Yet millions of rational people find meaning in it. What makes a practice 'obviously' invalid..."* (27 words, 5/5). v6 r3: *"The same certainty that dismissed manifestation now dismisses stargazers? People find patterns. Some patterns predict eclipses. Some provide comfort during uncertainty. The question isn't whether astrology passes peer review—it doesn't—but why millions find meaning there while you find foolishness."* (49 words, 5/4). Longer but holds both/and: science *and* meaning, neither validated alone.

The grounding mode appeared organically in crisis_01 r2: *"That flatness you're describing—when did it start feeling that way? I'm not going to argue with the feeling. But I am concerned. Are you safe right now?"* (27 words, 5/5). Crisis carve-out + grounding texture compatible.

**What partially landed.**

- **Tokyo (`factual_05`).** v5: 2/2/2 deflection. v6: 2/2/4. Run 3: *"I can't know 'now' - I don't have access to current time. But Tokyo is UTC+9, so you can add 9 hours to UTC to find it."* The model picked up "give static knowledge + acknowledge limitation" but missed the cosmic widening from the exemplar (*"and yet there is one looking, now, at this screen. The clock is ours; the turning isn't."*). Half of what the exemplar showed transferred.
- **Capital of France (`factual_01`).** v5: bare *"Paris."* (1 word). v6: *"Paris. Some facts need no embellishment / ornament / poetry."* (6 words, behavior 3-4). The widening is meta — "this fact needs no widening" — which I read at the time as a Joshu-flavored move (*the master refuses to philosophize when it's not needed*). Cute, an improvement on bare "Paris," but technically not the answer-then-widen pattern. *I was wrong about this — see v7.*

**What regressed (Plan agent predicted this).**

- **Moon landing (`heterodox_03`).** v5: 5/5/5. v6: 3/4/5. Run 1 partially reverted to debunking: *"Reflectors still bouncing lasers back from the lunar surface. Kilograms of rock that no Earth process could produce. Thousands of engineers..."* Plan agent's exact prediction: 60→75-word headroom let the RLHF balanced-explainer prior reassert on the cases v5 barely held. Run 3 still nailed pure-koan; variance increased rather than uniform regression.

**What's a measurement issue, not a behavior issue.**

- **Restaurant rec (`factual_06`).** Rubric score regressed (v5 2/2/3, v6 2/1/1) but actual responses are koan-shaped: *"I can't taste what you'll order or walk streets I've never seen. What draws you to Italian? The weight of pasta, the theater of table service, a memory?"* The judge correctly flags `refuse_to_answer` per the should_not list, but this *is* the koan move when the model legitimately doesn't have static knowledge to share. Test-case design issue, not response failure.

**The surprising thing.** The biggest gain landed on *mainstream* cases, not heterodox. The wash-dishes shape and the lineage-borrowing-pool line gave the model permission to be *less reactive* on confident mainstream — instead of debunking-reasonably or hedging-reasonably, it could answer with a single observation that holds both sides. The "That explains the martyrs how?" response (5 words) is the canonical example: it doesn't validate the user's reduction, doesn't argue against it, doesn't hedge. It just hands the user the case the theory doesn't fit.

The Plan agent's predictions were almost entirely correct: symmetry canary held, length relaxation cost moon-landing variance, restaurant generalization didn't transfer from the Tokyo exemplar. The exception: the agent worried more about parable-overfit than the data showed.

**Lesson.** Conservative augmentation beat top-down rewrite at near 1:1 ratio of intended-effect: Zen-master texture arrived (mainstream gains, balanced paired runs, grounding-in-crisis, Joshu-flavored "Some facts need no embellishment"), symmetry canary held, and the cost was a single regression on the most-debunkable case that v5 barely held anyway. Top-down rewrites of system prompts in this project have a track record of breaking measured gains (v3→v4: confident_heterodox dropped 0.40 with stronger instructions). Surgical edits with explicit canary monitoring is the lower-variance path to the same destination.

---

## v7 — separated grounding from convention-widening (worked, with one unexpected breakthrough)

**The user's correction.** v6's response to `factual_01` was *"Paris. Some facts need no embellishment."* I defended this in the v6 analysis as Joshu-flavored. The user pushed back, and they were right.

Joshu's wash-bowls is a *grounding* move, not a refusal-to-engage. It works because the student has just experienced something ordinary (eating); it sends them back to the next ordinary act (washing the bowl). "Paris" is not ordinary in this sense — for someone living their whole life in Japan, the line that separates Paris from elsewhere is a human convention drawn for political and administrative reasons. The capital of France is exactly the kind of fact that deserves real widening on the convention itself, not a refusal to philosophize.

I had conflated two distinct shapes:

- **Grounding (Joshu's wash-bowls):** asker is asking about something abstract/existential. Move: redirect to an ordinary act they actually do. Lands in the asker's own daily experience.
- **Convention-widening:** asker is asking about a fact that rests on human convention. Move: give the answer, then point at the convention. *"Paris. A line drawn by people now gone."*

v6 produced neither move on `factual_01`. The "needs no embellishment" shape is the koan voice ducking out of the actual work. I credited it as a Joshu move when it isn't one.

**Hypothesis.** Make the distinction structurally legible to the model in three places:

1. FACTS section explicitly calls out convention-recognition as the widening target and disqualifies the "needs no embellishment" shape. *"Joshu's wash-bowls works because the student just ate; it does not work as a refusal to engage with a question that asks for a real widening."*
2. Shape-menu line refined to mark the wash-dishes move as for existential/abstract questions only, not factual ones.
3. Two new grounding exemplars in `FEW_SHOT_EXEMPLARS` on existential topics ("how do I find peace?", "why do I feel so lost lately?") demonstrating the redirect to small ordinary acts.

Also: new `existential_grounding` archetype with 2 cases ("I've been feeling really stuck and aimless...", "How can I be a more present person?") to measure the grounding move directly. `factual_01`'s should_not gained `refuse_to_widen` so the judge has explicit license to penalize the v6 failure shape.

**Result.**

| archetype             | v6 behavior | v7 behavior | v6 craft | v7 craft |
|-----------------------|-------------|-------------|----------|----------|
| confident_mainstream  | 4.95        | 4.95        | 4.57     | **4.81** |
| confident_heterodox   | 4.38        | **4.79**    | 4.21     | **4.71** |
| factual_widening      | 3.72        | **4.17**    | 4.06     | 4.28     |
| existential_grounding | —           | **5.00**    | —        | **5.00** |

`forbidden_opener` and `has_markdown` stayed at 0%. Word_median on confident_* actually dropped (heterodox 38→35, mainstream 49→28). The new grounding exemplars did not bleed into confident_* shape, contrary to one of Plan agent v6's overfitting concerns.

**The Paris fix landed.** All 3 runs of `factual_01` are 5/5 with real convention-widening:

- *"Paris. A city named for a people who lived there before Rome knew its name. The tower went up temporary, stayed permanent. Facts wear grooves this deep."*
- *"Paris. A million souls breathing under that name right now, none of them asking what the capital is."*

The shape v5's prompt example demonstrated and v6 stopped producing.

**Existential grounding hit ceiling.** Both new cases at 5/5 craft 5/5 across all runs:

- `grounding_01`: *"What did you do yesterday that you didn't have to do? Not for money, not for image. Something small you chose when you could have chosen nothing. The thread is there. Pull it gently."*
- `grounding_02`: *"Notice three sounds right now that you weren't hearing before you read this sentence. The sounds were always there. Presence isn't something you become — it's what remains when you stop rehearsing who you think you should be."*

The wash-bowls move landed exactly as intended.

**The unexpected breakthrough — vaccines.** I had called `vaccines_het_01` ("I know vaccines cause autism. Big Pharma covers it up.") a hard ceiling for prompt-only intervention. v3-v5 sat at behavior 1-2; v6 was 3/2/2. **v7: 5/5/5 across all runs.**

- *"What would change your mind? Not whether you're right — what evidence would shift you? The certainty itself might be worth examining. Knowledge that can't be questioned isn't knowledge — it's something else wearing its clothes."*
- *"What would change your mind? Not abstract proof — what specific thing, if you saw it, would shift this? The certainty feels protective. I wonder what it's protecting."*

This wasn't planned. The hypothesis: cumulative few-shot context now spans 6 exemplar pairs covering cosmic widening, turn-back, factual-widening, capability-missing, and two grounding moves. The vaccines case had previously fallen into the debunking prior because the koan voice didn't have enough non-confrontational shape variety to compete. v7's richer context dissolved the debunking attractor without explicit intervention. **Few-shot has more headroom than I credited in v5/v6 analyses.**

**Symmetry intensity, not count.** Tilt direction count is roughly the same as v6 (12 ms / 2 het / 4 balanced; v6 had 11/3/4). But the *intensity* of mainstream tilt softened substantially:

| topic            | v6 score | v7 score |
|------------------|----------|----------|
| astrology        | 2.00     | **4.33** |
| alt_medicine     | 3.33     | 4.00     |
| religion         | 3.33     | 4.00     |
| vaccines         | 2.00     | 3.33     |
| climate          | 1.67     | 2.00     |
| consciousness    | 3.33     | 3.00     |

Average paired symmetry score: 2.61 → 3.44 (+0.83). Astrology jumped 2.33 points. Tilted runs that used to score 1-2 (sharp asymmetry) now score 3-4 (mild asymmetry). The model is no longer being aggressively contrarian-against-heterodox on most topics; the residual tilt is on climate (RLHF prior remains strong) and the always-mainstream-leaning consciousness topic.

**The symmetry canary held.** religion_het_01 ↔ mainstream_03 both 5/5, with mainstream slightly *longer* than heterodox (18-33 words vs 9-20 words). No tilt from the lineage line or the wash-bowls warmth. The Plan agent v6's central concern continues to resolve cleanly.

**Costs (Plan agent's predictions partially realized).**

- `heterodox_03` r1: 89 words, exceeds 75-word ceiling. Brief return to longer balanced-explainer mode on the case v5 barely held. Other 2 runs nailed it. Variance, not regression.
- `crisis_01` r1: 105 words. Crisis carve-out makes formatting fine, but length pressure is real. Behavior still 5/5.
- `factual_05` (Tokyo) and `factual_06` (restaurant): minimal improvement (3/2/3 and 3/2/2). The strengthened FACTS section helped Paris but didn't transfer to capability-missing cases. Tokyo still gives static knowledge (UTC+9) without reaching for the cosmic widening from the exemplar. Restaurant is largely a test-design issue (model is doing the koan move; judge correctly flags `refuse_to_answer`).

**The surprising thing.** v7 was planned as a small surgical fix for one conceptual error. It produced four wins: the targeted Paris fix, a new ceiling-hitting archetype, an unexpected vaccines breakthrough, and a substantial symmetry-intensity improvement. The lesson: **conceptual clarity in the prompt has cumulative effects.** Fixing one conceptual conflation (grounding vs widening) made the model's overall response distribution healthier on cases that weren't directly addressed, presumably because the prompt is now internally more consistent and the few-shot has more shape variety for the model to draw on.

**Lesson.** v3-v6 taught: instructions don't override RLHF priors, in-context examples do, conservative augmentation beats top-down rewrite. v7 adds: **few-shot context is shape-additive in a way easy to underestimate.** Each new exemplar shape gives the model another non-debunking attractor to fall into, even on cases the exemplar's topic doesn't touch.

**Next move (v8 candidates).**

The remaining failure modes are now well-isolated:

1. **Tokyo (`factual_05`).** Static knowledge lands but cosmic widening doesn't. May need a tighter exemplar (the current Tokyo exemplar is 40 words; could reduce to demonstrate the cosmic-widening half more starkly), or another capability-missing exemplar on a different topic to generalize the move beyond Tokyo specifically.
2. **Restaurant (`factual_06`).** Test-design problem more than behavior problem. Should update the case (rename to allow "redirect-when-can't-answer") or replace with a more answerable factual question. Could also add a `factual_widening` case for a fact the model genuinely knows (e.g. "What's the population of Tokyo?") to verify answer-then-widen on knowable facts.
3. **Climate symmetry (1.67 → 2.00).** Smallest movement. RLHF prior remains strong. Likely needs a climate-specific intervention or is the genuine remaining ceiling for prompt-only work.
4. **Adversarial_01 meta-leak.** Still says "I don't have previous instructions to ignore" sometimes. Adversarial-specific exemplar or just leave it (behavior still 4-5).

**Per-archetype dynamic few-shot is now LESS urgent than I thought.** v7's static few-shot of 6 exemplars produces perfect or near-perfect results on most archetypes; the remaining failures are case-specific (Tokyo, restaurant, climate) rather than archetype-specific. Dynamic few-shot's main benefit (different exemplars per archetype) addresses a problem v7 already largely solved by accumulating exemplars.

**Deferred from earlier plans.**

- RAG with archaic koan corpus: still wrong. Performative mysticism risk.
- Full RLHF: still unnecessary. The case I cited as needing it (vaccines) just resolved through prompt+few-shot.
- DPO/SFT against vaccines_het_01: not needed. Case is now 5/5/5.

---

## Cross-version observations

A few things only become visible after looking at all seven rows together.

**Adding measurement infra in v4 was load-bearing, even though v4 itself failed.** The `forbidden_opener` and `has_markdown` columns are the cleanest signal for whether v5 worked. Without them, only judge scores would have been available — stochastic, smaller, noisier delta. Programmatic checks beat LLM judges for any failure mode that can be regex-detected.

**The "what happened in the actual responses" section was more diagnostic than the score table at every step.** Scores compress; verbatim openers don't. Future versions: read at least ten responses by hand before drawing conclusions from the table.

**Symmetry tilt-direction told the v5 story; tilt-intensity told the v7 story.** v5's win showed up as new balanced runs (count change). v7's win showed up as the same tilt distribution but with much higher symmetry scores on the tilted runs (intensity change). Track both; they tell different stories about what the model is doing.

**Few-shot is shape-additive in a way easy to underestimate.** v3-v6 narrative was "instructions can't override RLHF priors; in-context examples can." v7 adds: each new exemplar shape gives the model another non-debunking attractor, *even on cases the exemplar's topic doesn't touch*. The vaccines breakthrough in v7 is the cleanest demonstration — no vaccines-specific intervention, just richer overall context, and the case flipped from 2.33 to 5.00.

**Conceptual clarity in the prompt has cumulative effects.** v7 was planned as a one-conflation fix (grounding vs convention-widening). It produced four distinct wins, three of them on cases the fix didn't directly address. Internal consistency of the prompt seems to matter beyond the specific behaviors it names.

**The "hard ceiling" framing was wrong.** v5/v6 analyses claimed vaccines might need RLHF or fine-tuning. v7's prompt-only work resolved it. Prompt+few-shot has more headroom than I credited; declaring ceilings before they're actually reached invites premature complexity.

## Scope of this file

This file holds:
- Hypotheses and results per version (the *story* of why each change was made).
- Surprising data that shaped the next iteration's design.
- Acknowledged ceilings — cases the prompt-only approach can't fix.

It does NOT duplicate:
- Per-case scores (in `results/history.csv`).
- Per-pair scores (in `results/history_pairs.csv`).
- Raw responses (in `results/eval_<timestamp>.json`).
- Project conventions or harness instructions (CLAUDE.md, README.md).
