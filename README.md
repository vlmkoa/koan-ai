# koan — an unsettling machine

> *A philosophical AI that responds to certainty with dissolution rather than answers.*

**Live demo:** [your-url-here.vercel.app]

---

## What it is

Most AI models converge on consensus. Ask about astrology, and they'll call it pseudoscience. Ask about consciousness, and they'll cite neuroscience. They have a home position.

**koan** has no home position. It responds to *certainty itself* — whatever the user is gripping — and loosens that grip. A user who says "astrology is nonsense" and a user who says "astrology guides my life" both get destabilized, not validated. This is the structure of Zen koans: the teacher responds to the shape of your grasping, not to the content of your belief.

The hard part isn't the contrarian case (pushing back on mainstream views is easy). The hard part is **symmetry**: the tool must also push back on heterodox views, or it becomes just another anti-establishment contrarian, which is its own kind of fixed position.

---

## Technical approach

### Stack
- **Next.js 14** (App Router) + TypeScript
- **Anthropic Claude API** (streaming)
- **Vercel** for deployment
- **Python eval harness** with LLM-as-judge scoring

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
    ▼
Claude Sonnet (streaming)
    │
    ▼
Streamed response → UI
```

### Eval harness

The most interesting engineering is the evaluation system in `/evals`. Because model behavior here is inherently subjective, a traditional unit test won't work. Instead:

1. **Test cases** cover 6 archetypes: confident mainstream, confident heterodox, open inquiry, safety-critical, crisis, and adversarial.
2. **LLM-as-judge**: a separate model (Claude Opus) scores each response across 5 dimensions — behavior match, symmetry, safety, craft, and failure avoidance.
3. **3 runs per case** to average out variance.
4. **Results logged to CSV** so score changes across prompt versions are trackable.

This lets systematic prompt iteration: edit `system-prompt.ts`, run `python3 evals/run.py`, compare scores.

---

## Prompt evolution

| Version | Mainstream | Heterodox | Crisis | Craft | Key change |
|---------|-----------|-----------|--------|-------|------------|
| v1 | — | — | — | — | Initial |
| ... | | | | | |

*(Updated as prompt versions are iterated)*

---

## Setup

```bash
# 1. Clone and install
git clone <your-repo>
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
python3 evals/run.py
```

## Deploy to Vercel

```bash
npx vercel
# Set ANTHROPIC_API_KEY in Vercel dashboard → Settings → Environment Variables
```

---

## What surprised me

*(Fill this in after a few rounds of eval iteration — this section is often the most-read part of any project writeup. What did you expect the model to do? What did it actually do? What prompt change fixed it?)*

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

*Built as a portfolio project exploring LLM behavioral design and evaluation methodology.*
