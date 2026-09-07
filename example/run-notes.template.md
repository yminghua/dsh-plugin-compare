# Checkout A/B run notes

## Environment and inputs

- Date / timezone: TODO
- dsh-plugin-compare commit: {{COMPARE_COMMIT}}
- DSH version: TODO
- Node.js version: TODO
- Candidate plugin version: TODO (example: dsh-expert-mode 0.9.2; record what actually ran)
- Provider / model: TODO (same route for both variants)
- Baseline preset / ID: TODO
- Candidate preset / ID: TODO
- Paired trials: 1
- Source directory (private local path): {{SOURCE_DIR}}
- Source Git HEAD: {{SOURCE_HEAD}}
- Prompt: exact contents of example/prompt.txt, or record any changes
- Success check: node --test
- Initial tests: TODO (expected: 5 tests, 1 pass, 4 fail)
- Initial Git status: TODO (expected: clean)

## Results — fill from the actual exported report

| Fact | A · Baseline | B · Candidate |
| --- | --- | --- |
| Execution | TODO | TODO |
| Check status / exit code | TODO | TODO |
| Test counts | TODO | TODO |
| Agent time | TODO | TODO |
| Recorded tokens (including cache) | TODO | TODO |
| Tool calls / failures | TODO | TODO |
| Changed files | TODO | TODO |
| Any changes to tests / README / public API? | TODO | TODO |

- Source tests after A/B: TODO (expected: still 1 pass, 4 fail)
- Source Git status after A/B: TODO (expected: still clean)
- Raw JSON filename: TODO
- HTML filename: TODO
- PNG / SVG filenames: TODO
- Unexpected errors / deviations from tutorial: TODO

## Publication checklist

- [ ] No credentials, account information, private URLs or personal paths in public assets.
- [ ] Review code diffs and command output; auto-redaction is not a security guarantee.
- [ ] Keep raw exports in ignored captures; publish only reviewed copies.
- [ ] Do not label a failed or modified-test run as a successful reproduction.
- [ ] This was a preset comparison; do not claim isolated causality for one plugin.
- [ ] One pair is a demonstration, not a stable ranking or cost-saving benchmark.
- [ ] If plugin identity was added after execution, preserve its report-label provenance.
