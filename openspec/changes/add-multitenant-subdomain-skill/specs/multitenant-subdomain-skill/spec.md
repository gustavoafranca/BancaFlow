## ADDED Requirements

### Requirement: Skill structure and packaging
A skill `design-multitenant-subdomain` SHALL be created using the official `skill-creator` process and MUST contain a concise `SKILL.md`, an `agents/openai.yaml`, a `references/` directory with the specialized guides, and an `assets/project-context-template.md`. The skill MUST NOT contain README, changelog, or installation-guide files. Scripts MUST be created only when they provide a genuinely reusable deterministic validation.

#### Scenario: Skill initialized with required tree
- **WHEN** the skill is created
- **THEN** the directory contains `SKILL.md`, `agents/openai.yaml`, `references/discovery-and-decisions.md`, `references/domain-and-clean-architecture.md`, `references/tenant-isolation-and-data.md`, `references/authentication-and-sessions.md`, `references/subdomain-proxy-security.md`, `references/testing-and-review.md`, `references/documentation-playbook.md`, and `assets/project-context-template.md`

#### Scenario: No extraneous files
- **WHEN** the skill directory is inspected
- **THEN** it contains no `README`, no changelog, and no installation guide, and no decorative scripts

#### Scenario: SKILL.md stays concise with progressive disclosure
- **WHEN** `SKILL.md` is measured
- **THEN** it is preferably under 500 lines and routes extensive detail to `references/` instead of duplicating it

### Requirement: Frontmatter and triggers
The `SKILL.md` frontmatter SHALL contain only `name` and `description`. The `description` MUST be specific enough to trigger on multi-tenant-by-subdomain requests and MUST NOT trigger for simple SaaS requests that involve no tenancy, isolation, or host-based resolution.

#### Scenario: Frontmatter has only name and description
- **WHEN** `SKILL.md` frontmatter is parsed
- **THEN** it contains exactly the keys `name` and `description` and no others

#### Scenario: Triggers on tenancy requests
- **WHEN** a user asks to create/plan/review a multi-tenant SaaS identified by subdomain (e.g. "quero criar um SaaS multi-tenant por subdomínio", "revise o isolamento por tenant", "como confiar em X-Forwarded-Host?")
- **THEN** the description matches and the skill is selected

#### Scenario: Does not trigger for non-tenant SaaS
- **WHEN** a user asks about a simple SaaS with no tenancy, isolation, or host resolution
- **THEN** the description does not spuriously match

### Requirement: Method stable, context variable
The skill SHALL separate stable method (questions, decisions, risks, invariants, architectural limits, security, tests, review criteria) from project context (domain, language, frameworks, database, authentication, deploy). Every technology recommendation MUST be conditioned on the real project context and MUST NOT assume any specific stack.

#### Scenario: Stack-agnostic guidance
- **WHEN** the target project uses a stack other than NestJS/Prisma/Next.js (e.g. Java/Spring, React, MySQL)
- **THEN** the skill preserves the method and principles without prescribing NestJS, Prisma, or Next.js

#### Scenario: Adapts to known stack
- **WHEN** the target project uses NestJS/Prisma/Next.js
- **THEN** the skill may adapt concrete recommendations to that stack

### Requirement: Project context input and template
The skill SHALL look for context in order: explicit path from the user, configured project context file, existing repository docs/code, then user answers for still-missing decisions. When no context file exists, the skill MUST offer to copy/fill `assets/project-context-template.md` and MUST NOT silently invent critical rules. The template MUST be copyable into a brand-new project with no mention of BancaFlow.

#### Scenario: Discovery precedence
- **WHEN** the skill starts and a context path is provided
- **THEN** it reads that path first before asking the user anything already discoverable

#### Scenario: Missing context offers template
- **WHEN** no context file exists
- **THEN** the skill offers to copy/fill `assets/project-context-template.md` instead of assuming rules

#### Scenario: Template is generic
- **WHEN** `assets/project-context-template.md` is inspected
- **THEN** it contains sections for Produto/domínio, Stack/repositório, Tenancy, Identity/acesso, Operação/segurança, and numbered Decisões pendentes `D1..Dn`, and contains no BancaFlow-specific content

### Requirement: Mandatory phased workflow
The `SKILL.md` SHALL guide the agent through the phases in order without jumping straight to code: (1) discover/validate context, (2) model the domain, (3) define tenancy and persistence, (4) resolve tenant by host securely, (5) model identity/authentication/authorization, (6) design Clean Architecture, (7) specify before implementing, (8) implement by layers, (9) verify and review, (10) document and teach.

#### Scenario: Specification precedes implementation
- **WHEN** the workflow is followed
- **THEN** the "specify before implementing" phase produces artifacts (OpenSpec proposal/design/delta specs/tasks, or equivalent) before any implementation phase begins

#### Scenario: Verification distinguishes coverage from correctness
- **WHEN** the verify/review phase runs
- **THEN** it includes tenant isolation between at least two tenants, forged-header/inactive-tenant/revoked-session/blocked-account tests, and does not treat high coverage as proof of correct behavior

### Requirement: Decision catalog
`references/discovery-and-decisions.md` SHALL provide a decision catalog with no universal answers. Each topic MUST include the question, common options, when each option makes sense, risks, a recommendation only when there is sufficient context, and a `D<n>` record example. It MUST cover at least: tenant definition, global person vs per-tenant account, global vs per-tenant username/email, memberships and multiple tenants, fixed role vs granular permissions, public creation vs invite vs admin provisioning, data isolation, subdomain strategy, custom domain, single vs multiple session, password reset, tenant OWNER/admin, platform admin, provisioning consistency/transaction, and tenant deletion/suspension.

#### Scenario: Catalog entries are structured
- **WHEN** a topic in the catalog is read
- **THEN** it presents question, options, when-each-fits, risks, a context-gated recommendation, and a `D<n>` example

#### Scenario: No premature universal answer
- **WHEN** context is insufficient for a decision
- **THEN** the catalog withholds a recommendation instead of inventing one

### Requirement: Specialized references
The skill SHALL provide specialized references covering domain/clean-architecture heuristics, tenant isolation/data strategies (shared DB + `tenantId`, schema-per-tenant, database-per-tenant, hybrid, with constraints/indexes/composite FKs/audit/migrations/jobs/cache/queues/file storage/leak prevention), authentication/sessions (accounts, memberships, hashing, tokens, cookies, refresh rotation, revocation, lockout, MFA, SSO, recovery, authorization by persisted state), subdomain/proxy security, a per-layer test matrix with code-review checklist, and a documentation playbook. References MUST NOT extensively duplicate `SKILL.md` and MUST NOT fix universal algorithms or TTLs.

#### Scenario: Isolation strategies compared
- **WHEN** `references/tenant-isolation-and-data.md` is read
- **THEN** it compares shared-DB-with-tenantId, schema-per-tenant, database-per-tenant, and hybrid models with their constraints and leak-prevention concerns

#### Scenario: No universal secrets or TTLs
- **WHEN** `references/authentication-and-sessions.md` is read
- **THEN** it requires deciding algorithms/TTLs per risk and context rather than fixing universal values

### Requirement: Subdomain and proxy security guardrails
`references/subdomain-proxy-security.md` and the workflow SHALL enforce that client-supplied subdomain, header, or token is never trusted without a defined trust boundary; `X-Forwarded-Host` is untrusted by default and honored only when the immediate peer belongs to a configured IP/CIDR allowlist; `tenantId`/tenant code from the request body is never authoritative for authenticated operations; and failures do not improperly reveal tenant or user existence. It MUST distinguish local, Docker, reverse-proxy, and production configurations and cover host parsing/normalization, DNS/TLS wildcard, IPv4/IPv6, host header injection, custom domains, and security tests.

#### Scenario: Forwarded headers gated by peer allowlist
- **WHEN** the reference describes `X-Forwarded-Host` handling
- **THEN** it treats it as untrusted by default and honors it only when the immediate peer is on a configured IP/CIDR allowlist, never trusting any proxy globally just to make the host work

#### Scenario: Body-supplied tenant rejected as authority
- **WHEN** an authenticated operation receives `tenantId`/tenant code in the request body
- **THEN** the guidance rejects it as authoritative and resolves tenant from the trusted host/session instead

### Requirement: Architecture and safety guardrails
The skill SHALL enforce guardrails: never allow un-scoped access on tenant-owned operations; never treat the frontend as the authoritative security boundary; never put ORM/framework details inside domain entities; never create a giant aggregate holding tenant, users, sessions, and all permissions without justifying consistency; never duplicate the tenant entity inside Identity for convenience; never invent missing rules that change isolation, identity, account recovery, or authorization; never expose real secrets/hashes/tokens in docs/examples; never run migrations/seeds/deploy during an exploration/specification-only phase; always respect local project instructions/skills above generic recommendations; always declare inferences and accepted risks.

#### Scenario: Tenant vs identity separation preserved
- **WHEN** modeling identity and tenancy
- **THEN** the skill differentiates tenant, human identity, access account, and membership per context and does not duplicate the tenant entity inside Identity merely for convenience

#### Scenario: No external mutations during exploration
- **WHEN** the current phase is exploration or specification only
- **THEN** the skill does not execute migrations, seeds, deploy, or other external changes

### Requirement: Validation and acceptance
The skill SHALL pass `scripts/quick_validate.py`, have valid `name`/`description`-only frontmatter, keep `agents/openai.yaml` coherent with `SKILL.md`, and satisfy four forward-tests run with clean context (ERP per company, marketplace with multiple organizations, security review of X-Forwarded-Host resolution, and a Java/Spring/React/MySQL stack). The final result MUST report the install path and short invocation examples.

#### Scenario: quick_validate passes
- **WHEN** `scripts/quick_validate.py` is run against the skill
- **THEN** it passes

#### Scenario: Java/Spring forward-test not forced onto NestJS stack
- **WHEN** the Java/Spring/React/MySQL forward-test is run
- **THEN** the skill produces a multi-tenant architecture proposal without prescribing NestJS/Prisma/Next.js

#### Scenario: Security-review forward-test finds forgeable headers
- **WHEN** the security-review forward-test asks to review `X-Forwarded-Host` tenant resolution
- **THEN** the skill identifies forgeable headers and the trust boundary rather than relying on a single global flag

#### Scenario: Final report includes install path and examples
- **WHEN** the skill creation completes
- **THEN** the result reports the absolute install path, the essential file tree, the context-template location, the `quick_validate.py` result, and short invocation examples
