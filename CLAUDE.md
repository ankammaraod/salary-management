# CLAUDE.md

Project-specific guidance for Claude Code (and any AI coding assistant) working in this repository.

## What this project is

A salary management web tool for an HR Manager of a 10,000-employee organization.

**Tech stack:** Node.js backend (SQLite), ReactJS frontend.

See [`docs/salary-management-prd.md`](docs/salary-management-prd.md) for the full product requirements document.


## Development discipline — Test-Driven Development (required)

**Every code change follows the red → green → refactor loop. No exceptions.**

1. **Red.** Write a failing test that captures the next slice of behavior. Run it. Confirm it fails for the right reason.
2. **Green.** Write the minimum implementation that makes the test pass. Do not add code that isn't covered by a test.
3. **Refactor.** With the test green, improve naming, structure, and clarity. Re-run the suite.

**Why this matters here:** TDD produces a meaningful test suite as a side effect of how the code is built, keeps services testable by construction (no after-the-fact test plumbing), and forces the contract to be designed before the implementation.

**Follow micro commits for code changes and dont make massive commits**

