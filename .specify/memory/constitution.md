# ExaCatalog & Documentos Dashboard Constitution

This constitution defines the development standards, visual quality guidelines, and engineering practices for the project, synthesizing industry-best patterns from Google Engineering Practices, SpecKit, Taste-Skill, and DeepMind Science-Skills.

---

## Core Principles

### I. Taste-First Visual & UI/UX Excellence
*Derived from Leonxlnx/taste-skill and Web Design Guidelines*
- **Premium Aesthetics**: Never use generic colors or plain designs. Use curated, harmonious color palettes (e.g., tailored HSL/custom theme tokens) with sleek dark modes and elegant glassmorphism.
- **Modern Typography**: Use premium font families (e.g., Google Fonts like Inter, Outfit, or Roboto) instead of default system serifs/sans-serifs. Set explicit line heights and letter spacing.
- **Dynamic Interactions**: Incorporate smooth hover states, subtle micro-animations (e.g., using Tailwind transitions or spring effects), and responsive layouts that look breath-taking on both mobile and desktop screens.
- **No Placeholders**: High-fidelity data rendering only. If images or data graphs are needed, construct beautiful mock states using D3.js or SVG assets rather than plain empty boxes.

### II. Specification & Plan-Driven Workflow
*Derived from GitHub SpecKit*
- **Spec Kit Lifecycle**: For any non-trivial changes, follow the sequence:
  1. **Specification** (`spec.md`): Define requirements, constraints, and architecture.
  2. **Plan** (`plan.md`): Map out the proposed file modifications.
  3. **Task Checklist** (`tasks.md`): Track TODOs with `[ ]`, `[/]`, and `[x]`.
  4. **Verify** (`walkthrough.md`): Validate changes and show proof of functionality.
- **Constitution Supersedes**: This constitution dictates the rules of engagement. All AI agents and human developers must align their implementation plans with these principles.

### III. Small changes & Rigorous Code Health
*Derived from Google Engineering Practices (eng-practices)*
- **Simplicity over Cleverness**: Choose readability and maintainability over overly complex abstractions (YAGNI). 
- **Refactoring & Clean Code**: Refactor surrounding code as you introduce changes to improve overall health, but keep the scope focused.
- **Small Changesets**: Keep edits, pull requests, and commits small, logically grouped, and single-purpose. This simplifies reviews and minimizes regression risks.

### IV. Scientific Precision & Performance
*Derived from Google DeepMind Science-Skills & Analytics-Tracking*
- **Oracle & Cache Optimization**: Ensure Oracle database queries are optimized, utilize indexes, and make effective use of query caching to prevent unnecessary roundtrips.
- **Stricter Type Safety**: Every component, API route, and state hook must have robust, exact TypeScript declarations. Avoid `any` type casting.
- **Resilient Error Boundaries**: Gracefully handle database offline states, missing data records, and rendering failures using descriptive, user-friendly error banners.

---

## Development Constraints

### 1. Technology Stack
- **Framework**: Next.js App Router (React 19, TypeScript).
- **Styling**: Vanilla CSS or Tailwind CSS (depending on user-configured design tokens).
- **Data Layer**: Oracle DB integration with robust caching (`src/lib/oracle.ts` and `src/lib/cache.ts`).
- **Data Visualization**: Interactive relationship graphs built with D3.js (`src/components/DocumentGraph.tsx`).

### 2. Code Review & QA Gates
- All API routes (`src/app/api/...`) must validate input query parameters and request bodies before execution.
- Hydration issues or server/client component mismatch warnings must be immediately resolved and never pushed to production.

---

## Governance

1. **Compliance**: Every change must be reviewed against this constitution.
2. **Amendments**: Modifications to this constitution require a formal proposal and updates to the `.specify/memory/constitution.md` file with a bumped version number.

**Version**: 1.0.0 | **Ratified**: 2026-06-08 | **Last Amended**: 2026-06-08
