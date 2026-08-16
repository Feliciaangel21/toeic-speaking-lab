# Git / Codex handoff

Repository target: `https://github.com/Feliciaangel21/toeic-speaking-lab.git`

The source tree is intentionally safe to commit:

- `.env.local` is excluded.
- build artifacts (`.next`, `tsconfig.tsbuildinfo`) are excluded.
- temporary SQL files are excluded.
- no Supabase service-role secret should ever be committed.
- browser code must only use publishable Supabase credentials.

## Suggested initial push

```bash
git remote -v
git status
git push -u origin main
```

## Next implementation branch

```bash
git switch -c agent/evaluation-pipeline
```

Recommended commit sequence:

1. `add local asr and vad adapters`
2. `add deterministic information scoring`
3. `add semantic task features`
4. `add pronunciation service adapter`
5. `add human-rated calibrator training pipeline`
6. `add evidence-based korean feedback`

Do not merge model weights into Git. Fetch weights during setup/build, cache them outside the repo, or use release/artifact storage depending on runtime architecture.
