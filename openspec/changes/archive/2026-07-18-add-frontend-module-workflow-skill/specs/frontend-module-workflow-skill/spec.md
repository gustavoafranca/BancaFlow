## ADDED Requirements

### Requirement: Skill structure and packaging
A skill `frontend-module-workflow` SHALL be created using the official `skill-creator` process and installed at `.claude/skills/frontend-module-workflow`. It MUST contain a concise `SKILL.md`, an `agents/openai.yaml`, and a `references/` directory with the specialized guides. It MUST NOT contain README, changelog, or installation-guide files. A script MUST be created only when it provides a genuinely useful, reusable, read-only validation.

#### Scenario: Skill initialized with required tree
- **WHEN** the skill is created
- **THEN** the directory `.claude/skills/frontend-module-workflow` contains `SKILL.md`, `agents/openai.yaml`, `references/architecture-boundaries.md`, `references/component-ownership.md`, `references/next-app-router.md`, `references/module-slice-workflow.md`, and `references/testing-checklist.md`

#### Scenario: No extraneous files
- **WHEN** the skill directory is inspected
- **THEN** it contains no `README`, no changelog, no installation guide, and no decorative scripts

#### Scenario: SKILL.md stays concise with progressive disclosure
- **WHEN** `SKILL.md` is measured
- **THEN** it is under 500 lines and routes extensive detail to `references/` instead of duplicating it

### Requirement: Frontmatter and triggers
The `SKILL.md` frontmatter SHALL contain only `name` and `description`. The `description` MUST trigger on frontend module implementation/review/organization requests and MUST NOT trigger for minimal visual tweaks, Backend-only tasks, or simple text edits.

#### Scenario: Frontmatter has only name and description
- **WHEN** `SKILL.md` frontmatter is parsed
- **THEN** it contains exactly the keys `name` and `description` and no others

#### Scenario: Triggers on frontend module work
- **WHEN** a user asks to implement/organize a module's frontend from a spec, to decide whether a component should be shared, to connect a feature to the HTTP client and private routes, to refine an imported Claude Design screen inside the right module, or to apply the Web group of an OpenSpec change
- **THEN** the description matches and the skill is selected

#### Scenario: Does not trigger for out-of-scope work
- **WHEN** a user asks for a minimal visual tweak, a Backend-only change, or a simple text edit
- **THEN** the description does not spuriously match

### Requirement: Architectural principles and dependency direction
The skill SHALL teach and enforce the dependency direction `app/routes → modules → shared`, `app/routes → shared`, and `shared -X→ modules`. It MUST require thin `app/**/page.tsx` that only compose pages/components, Server Components by default with `use client` only when events/state/browser APIs require it, shared independent of any bounded context, and the module owning its language/screens/schemas/view models/interactions. It MUST forbid any dependency on Prisma/database/secrets/Backend infrastructure and any authoritative business rule duplicated in React.

#### Scenario: Dependency direction enforced
- **WHEN** the skill guides placing or importing code
- **THEN** `shared` never imports a module and never contains a domain DTO/text/rule, while modules and routes may import shared

#### Scenario: Server/Client boundary respected
- **WHEN** a component needs events, state, or browser APIs
- **THEN** the skill marks only that boundary with `use client` and keeps pages and non-interactive components as Server Components, keeping fetch and effects out of visual primitives

#### Scenario: No Backend infrastructure or authoritative rule in Web
- **WHEN** frontend code is written or reviewed
- **THEN** it contains no Prisma/database/secrets/Backend-infra dependency and no authoritative business rule, keeping Web validation for UX only while domain/backend stay authoritative

### Requirement: Component ownership decision tree
The skill SHALL apply a decision tree classifying each component as shared, module, or route-local (`_components`), with documented exceptions. A component MUST be promoted to `apps/web/src/shared/components` only when it is a design-system primitive, a generic form composition, a truly global shell/branding/layout, generic feedback, a component reused by multiple modules with the same meaning, or a deliberately public/stable design-system API. It MUST remain in `apps/web/src/modules/<domain>` when it expresses the bounded-context language, an internal module screen, a specific schema/view model/mapper/hook/client, or a particular interaction. It MUST remain in `app/**/_components` when exclusive to a flow/page without a stable module API. The skill MUST NOT promote based only on visual similarity or hypothetical reuse and MUST prefer small temporary duplication over the wrong abstraction.

#### Scenario: Shared promotion only for shared meaning
- **WHEN** deciding where a component lives
- **THEN** it is promoted to shared only when it is a primitive/generic composition/global shell/generic feedback or is reused by multiple modules with the same meaning, and shared never imports a module or holds domain DTO/text/rule

#### Scenario: Visual similarity is not promotion
- **WHEN** two modules use a visually similar component whose meaning differs per bounded context
- **THEN** the skill keeps them in their modules (or duplicates a small piece) instead of promoting to shared, and consolidates only when the meaning is genuinely shared

#### Scenario: Route-local for flow-exclusive components
- **WHEN** a component is exclusive to one route/flow and has no stable module API yet
- **THEN** the skill keeps it in `app/**/_components` rather than the module or shared

### Requirement: Routing to complementary skills
The skill SHALL define explicit routing to the existing skills without duplicating them: `config-shared-frontend` only for shared bootstrap/reconstruction and only with confirmation before overwrite; `import-cloud-design-next` first for `.dc.html`/Claude Design imports, then refinement by this skill; `frontend-form-schema` for forms/schemas; `config-new-module` for the initial full-stack scaffold; this skill for continuous Web implementation/review. It MUST NOT run bootstrap when the task is incremental evolution and MUST NOT create a module generator that duplicates `config-new-module`.

#### Scenario: Incremental work does not bootstrap
- **WHEN** the task is incremental evolution of an existing module
- **THEN** the skill does not run `config-shared-frontend` and does not overwrite shared without confirmation

#### Scenario: Design import precedes refinement
- **WHEN** a Claude Design `.dc.html` must be brought in
- **THEN** the skill routes to `import-cloud-design-next` first and only then refines the screen, without overwriting an import without authorized `--force`

### Requirement: Mandatory phased workflow
The `SKILL.md` SHALL guide the agent through 8 phases in order without jumping straight to code: (1) read context and contract, (2) select complementary skills, (3) inventory and plan ownership, (4) model the presentation, (5) implement by slices, (6) routes and authentication, (7) test and verify, (8) deliver. It MUST NOT put fetch in a primitive, an authoritative rule in a component, or cross-module access via an internal path.

#### Scenario: Context read before editing
- **WHEN** the workflow starts
- **THEN** phase 1 reads `AGENTS.md`, local skills, the installed Next guides, and any OpenSpec proposal/design/specs/tasks, and inspects current implementation/tests before editing, without asking what is discoverable in the repo

#### Scenario: Slices implemented in order
- **WHEN** implementing a flow in phase 5
- **THEN** it stabilizes types/contract, then schema/mapper, then HTTP client/hook, then composes existing shared components, then module/route components, then wires page and navigation, then states/errors, and tests before the next flow

#### Scenario: Delivery does not equate compiling with done
- **WHEN** phase 8 reports completion
- **THEN** it lists created/moved/changed files, explains shared vs. module ownership, states which tests ran, records real pending items, and does not mark tasks done merely because the code compiles

### Requirement: Routes and authentication guardrails
The skill SHALL keep a route matrix (public/conditional/private), update `proxy.ts`/matcher when a protected route is created, keep the Backend as the session authority, avoid loops between login/forced-password-change/dashboard, never accept body-supplied `tenantId` as authority, preserve host/subdomain when reaching the Backend, and record behavior for missing/inactive tenants when the feature depends on it.

#### Scenario: Protected route updates proxy
- **WHEN** a new protected route is created
- **THEN** the skill updates `proxy.ts`/matcher and keeps the Backend as the session authority

#### Scenario: Body tenant rejected as authority
- **WHEN** an authenticated operation would receive `tenantId` from the request body
- **THEN** the skill rejects it as authoritative and resolves tenant from the trusted host/session instead

### Requirement: Specialized references
The skill SHALL provide specialized references with progressive disclosure: `architecture-boundaries.md` (dependency direction, Server/Client Components, cross-module composition, domain/backend/Web limits), `component-ownership.md` (shared vs. module vs. route decision tree with examples, counterexamples, incremental promotion), `next-app-router.md` (pages/layouts, route groups, installed-version `proxy.ts`, redirects, loading/error/not-found, matcher, authentication), `module-slice-workflow.md` (a generic end-to-end slice: contract → schema/mapper → client/hook → components → page → navigation → tests), and `testing-checklist.md` (a per-change-type matrix: unit, component, accessibility, route/proxy, HTTP, E2E, visual, and global gates). References MUST NOT extensively duplicate `SKILL.md`.

#### Scenario: Ownership reference has examples and counterexamples
- **WHEN** `references/component-ownership.md` is read
- **THEN** it presents the shared/module/route decision tree with examples, counterexamples, and an incremental promotion strategy

#### Scenario: App Router reference reflects installed version
- **WHEN** `references/next-app-router.md` is read
- **THEN** its `proxy.ts`/matcher and redirect guidance reflect the Next version actually installed in `apps/web`, not an assumed one

### Requirement: Optional read-only audit script
IF a component-audit script is created, it SHALL be `scripts/audit-frontend-components.mjs`, read-only by default, accept `--app=web` and `--json`/`--markdown`, list components/exports/imports/consumers, flag repeated names, `shared→module` imports, and files without consumers, and never move/delete/rewrite files. It MUST NOT claim to detect semantic equivalence from AST/name alone and MUST ship with representative fixtures or tests. IF the script is omitted, the final report MUST record the omission.

#### Scenario: Audit is read-only and flags violations
- **WHEN** `audit-frontend-components.mjs --app=web` is run
- **THEN** it reports components/exports/imports/consumers and flags repeated names, `shared→module` imports, and orphan files without moving, deleting, or rewriting anything

#### Scenario: Omission is recorded
- **WHEN** the script is deemed not useful and omitted
- **THEN** the final report states the omission rather than leaving it implicit

### Requirement: OpenSpec integration
The skill SHALL accept tasks scoped to only the Web group of an OpenSpec change, respecting the allowed files and marking each task only after tests pass. When generating or reviewing `tasks.md`, it SHALL recommend Web groups with clear scope: (1) contract and types, (2) needed shared, (3) module/feature, (4) routes/navigation, (5) tests and integration. If Backend and Web can advance in parallel, it MUST require the HTTP contract to be defined first and MUST avoid concurrent subagents editing barrels, the private layout, `proxy.ts`, or the menu.

#### Scenario: Web-only application scope respected
- **WHEN** asked to apply only the Web group of a change
- **THEN** the skill edits only the allowed Web files and marks each task only after its tests pass

#### Scenario: Parallel work requires defined contract
- **WHEN** Backend and Web are to advance in parallel
- **THEN** the skill requires the HTTP contract defined first and avoids concurrent edits to barrels, private layout, `proxy.ts`, or the menu

### Requirement: Guardrails
The skill SHALL enforce guardrails: never move everything to shared; never run `config-shared-frontend` over an existing project without confirmation; never overwrite a Claude Design import without authorized `--force`; never create a domain rule in Web; never use index/barrel to hide a cycle; never create a per-module `layout.tsx` when a single shell exists; never duplicate the menu or shell; never install a dependency without proven need; never change visual identity by preference; never delete a component/asset on inconclusive text search alone; never edit Backend/domain outside the requested scope; never weaken tests to finish.

#### Scenario: No premature shared promotion or hidden cycle
- **WHEN** organizing components
- **THEN** the skill does not move everything to shared and does not use an index/barrel to hide a dependency cycle

#### Scenario: No domain rule copied into Web
- **WHEN** reviewing a module that placed an authoritative business rule in React
- **THEN** the skill flags it and keeps domain/backend authoritative, using Web validation for UX only

### Requirement: Validation and acceptance
The skill SHALL pass `scripts/quick_validate.py`, have valid `name`/`description`-only frontmatter, keep `agents/openai.yaml` coherent with `SKILL.md`, integrate explicitly with the four existing skills, and satisfy five forward-tests run with clean context: (1) a listing screen in an existing module using shared primitives, (2) classifying a visually similar component used by two modules, (3) refining an imported Claude Design screen without duplicating `Button`/`Input`, (4) adding a private route and updating proxy/menu/tests, and (5) reviewing a module with a business rule wrongly placed in React. The final result MUST report the install path, file tree, triggers, included/omitted resources, validation result, forward-test summary, and an OpenSpec citation example.

#### Scenario: quick_validate passes
- **WHEN** `scripts/quick_validate.py` is run against the skill
- **THEN** it passes

#### Scenario: Design-refinement forward-test reuses primitives
- **WHEN** forward-test 3 refines an imported Claude Design screen
- **THEN** the skill reuses existing `Button`/`Input` primitives instead of duplicating them

#### Scenario: Rule-review forward-test relocates authority
- **WHEN** forward-test 5 reviews a module with a business rule wrongly placed in React
- **THEN** the skill identifies the misplaced rule and keeps domain/backend as the authority

#### Scenario: Final report includes required outputs
- **WHEN** the skill creation completes
- **THEN** the result reports the install path, essential file tree, trigger summary, included/omitted resources, `quick_validate.py` result, forward-test summary, and an example of citing the skill in an OpenSpec spec/task
