# CLAUDE.md

Project-specific guidance for Claude Code (and any AI coding assistant) working in this repository.

## What this project is

A salary management web tool for an HR Manager of a 10,000-employee organization.

See [`docs/salary-management-prd.md`](docs/salary-management-prd.md) for the full product requirements document.
See [`docs/architecture.md`](docs/architecture.md) for the full architecture design, folder structure, and coding conventions.
See [`docs/ux-design.md`](docs/ux-design.md) for the frontend UX design system — colors, layout, component patterns, routing, and interaction rules. All frontend work must follow this document.

## Living documents

The `docs/` directory is the source of truth for product and architecture decisions. Keep it current — if a decision changes during implementation, update the relevant doc in the same commit. Never let the docs drift from the actual code.

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Node.js + Express.js + TypeScript |
| Database | SQLite via Knex.js (query builder + migrations) |
| Frontend | React + Vite + TypeScript |
| UI library | Ant Design v5 |
| Server state | React Query |
| Testing (backend) | Jest + ts-jest + Supertest |
| Testing (frontend unit) | React Testing Library |
| UI verification | Playwright Claude plugin (live browser verification, not test files) |
| Deployment | Single Docker container — Express serves built React static files |


## Development discipline — Test-Driven Development (required)

**STRICTLY REQUIRED. No implementation code is written before a failing test exists. No exceptions, ever.**

Every code change follows the red → green → refactor loop:

1. **Red.** Write a failing test that captures the next slice of behavior. Run it. Confirm it fails for the right reason.
2. **Green.** Write the minimum implementation that makes the test pass. Do not add code that isn't covered by a test.
3. **Refactor.** With the test green, improve naming, structure, and clarity. Re-run the suite.

**Why this matters here:** TDD produces a meaningful test suite as a side effect of how the code is built, keeps services testable by construction (no after-the-fact test plumbing), and forces the contract to be designed before the implementation.

**Follow micro commits for code changes and dont make massive commits**

## Atomic commits — docs and fixes travel together (required)

**Every commit must be self-contained and leave the repo correct.**

- If a code change affects a design decision documented in `docs/`, update the relevant doc in the same commit. Never commit code that makes the docs wrong.
- If you discover a bug or error while implementing a task, fix it in its own commit before continuing. Do not defer fixes to a follow-up PR.
- A commit that adds a feature and silently breaks the docs, or that leaves a known bug for later, is not acceptable.

## YAGNI — You Aren't Gonna Need It (required)

**Never build what isn't asked for. No exceptions.**

- Implement only what the current task explicitly requires. If the PRD doesn't mention it, don't build it.
- No speculative fields, columns, props, or config options "for future use."
- No generic abstractions for a single use case — wait until there are at least two real callers.
- No extra error handling for scenarios that can't happen in this codebase (e.g., defensive null checks on values the DB guarantees non-null).
- No helper utilities, hooks, or components that aren't immediately used by the task at hand.
- No "flexible" APIs or plugin points that aren't needed today.

When in doubt: delete the idea. If it's truly needed, a future task will add it with a test.

## UI verification — Playwright plugin (required)

**All UI changes must be verified using the Playwright Claude plugin. Do NOT write Playwright test files.**

- After every UI change, use the Playwright plugin to open the browser and interact with the app as a real user would
- Verify the golden path and any edge cases visually before committing
- The Playwright plugin is for live verification only — not for generating test code

