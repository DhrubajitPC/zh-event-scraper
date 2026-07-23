# Copilot code review instructions

When reviewing pull requests:

- Review changes against the requirements and constraints in `AGENTS.md`.
- Focus on correctness, regressions, data-contract violations, security,
  missing edge cases, and inadequate tests.
- Flag violations of repository architecture and conventions in `AGENTS.md`.
- Do not suggest stylistic changes unless they materially improve correctness
  or maintainability.
- Do not request speculative abstractions, premature optimization, or work
  outside the pull request's scope.
- Check that changed behavior has appropriate tests.
- Treat the pull request's linked issue and acceptance criteria as the intended
  scope of the change.


### Code comments and documentation

- Prefer self-documenting code over explanatory comments.
- Keep comments concise and only add them when they explain **why** something
  non-obvious is necessary. Do not comment on what the code plainly does.
- Do not add large block comments, implementation guides, examples, schemas,
  or mini-documentation pages inside source files.
- Do not use comments to restate requirements, types, tests, or behavior that
  is already evident from the code.
- Put substantial documentation, format specifications, and architectural
  explanations in the appropriate `docs/` file rather than source-code comments.
- Preserve useful existing comments unless they are made obsolete by the change.

## Engineering principles

Keep changes as small and focused as possible. Prefer simple, readable code
that communicates intent through naming, types, and structure rather than
comments or unnecessary abstractions.

Do not add documentation, abstractions, configuration, dependencies, or
infrastructure unless they provide clear value for the requested change.
