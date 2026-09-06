# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- The domain glossary: the `## Language` section of `AGENTS.md` at the repo root.
- `docs/adr/`: ADRs that touch the area you're about to work in.

If the glossary terms you need aren't in `AGENTS.md`, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it, and `/domain-modeling` will add the term).

## File structure

Single-context repo:

```
/
├── AGENTS.md          # agent instructions + domain glossary (## Language)
├── docs/adr/          # architecture decisions
└── src/
```

The glossary deliberately lives inside `AGENTS.md` (not the usual root `CONTEXT.md`) so every pi session sees the domain vocabulary without an extra read. When `/domain-modeling` resolves a new term, it edits the `## Language` section of `AGENTS.md`.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `AGENTS.md`. Don't drift to synonyms the glossary explicitly avoids.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0001 (Quicksaved Prompts stored in a plain JSON file), but worth reopening because…_
