# Planning Guide

A bank-grade governed agentic data platform that enables risk, compliance, finance, and operations teams to interact with enterprise data through natural language while maintaining strict governance, audit trails, and evidence-based controls.

**Experience Qualities**:
1. **Trustworthy** - Every action is auditable, policy-checked, and evidence-backed, creating confidence in a highly regulated environment
2. **Efficient** - Natural language eliminates technical barriers, letting domain experts focus on insights rather than SQL syntax
3. **Transparent** - All decisions, lineage, and constraints are surfaced clearly, with no hidden automation or "black box" behavior

**Complexity Level**: Complex Application (advanced functionality, likely with multiple views)
This platform serves multiple banking personas (Risk, Compliance, Finance, Operations, Product) with distinct workflows including query execution, dataset onboarding, pipeline generation, and approval management. The application requires sophisticated state management, role-based access, multi-step workflows, evidence generation, and policy enforcement visualization.

## Essential Features

### Natural Language Query Interface
- **Functionality**: Users ask banking questions in plain English; system generates SQL, executes safely, returns results with full lineage
- **Purpose**: Democratize data access for non-technical users while maintaining governance
- **Trigger**: User types question in main search/query interface
- **Progression**: Type question → LLM generates intent schema → Policy check → SQL generation → Sandbox execution → Results + evidence pack displayed
- **Success criteria**: Query executes with <3s response, shows dataset sources, freshness indicators, and policy compliance badges

### Dataset Onboarding Wizard
- **Functionality**: Users describe a new dataset in natural language; platform generates data contracts, ingestion specs, DQ rules
- **Purpose**: Standardize dataset registration with complete metadata and governance controls
- **Trigger**: User clicks "Onboard New Dataset" from datasets view
- **Progression**: Describe dataset → LLM generates spec → Validation checks → Preview spec → Submit for approval → Evidence pack created
- **Success criteria**: Complete spec generated in <10s, validates against schema, creates approval request with rollback plan

### Pipeline Generation Studio
- **Functionality**: Users request data transformations; platform generates SQL models, unit tests, and data quality checks
- **Purpose**: Enable self-service analytics while ensuring tested, governed pipeline code
- **Trigger**: User clicks "Create Pipeline" from pipelines view or from query results
- **Progression**: Describe transform → LLM generates pipeline spec → Unit tests auto-created → DQ rules suggested → Preview code → Submit for review → Approval → Deploy with snapshot
- **Success criteria**: Generated pipeline includes tests, DQ checks, and is deployment-ready; snapshot created before any production change

### Approval Workflow Dashboard
- **Functionality**: Approvers review pending changes (pipelines, policies, dataset access) with full context and evidence
- **Purpose**: Human-in-the-loop control for high-risk actions in regulated environment
- **Trigger**: User with approver role navigates to approvals queue
- **Progression**: View pending item → Review evidence pack → Check policy implications → Approve/reject with comment → Action executes with audit log → Rollback plan stored
- **Success criteria**: All evidence visible in single view, approval/rejection recorded immutably, deployed changes are rollbackable

### Evidence Pack Viewer
- **Functionality**: Every significant action generates a timestamped evidence pack (specs, tests, logs, lineage)
- **Purpose**: Audit trail and compliance documentation for regulators
- **Trigger**: Automatically generated for queries, deployments, approvals, policy changes
- **Progression**: Action executes → Evidence collected → Markdown + JSON generated → Displayed in UI → Downloadable → Stored immutably
- **Success criteria**: Evidence includes all inputs, outputs, policy checks, approvals, and is tamper-evident

### Policy Engine Visualization
- **Functionality**: Shows active policies, what they control, and real-time policy check results
- **Purpose**: Transparency into governance rules and why actions are blocked/allowed
- **Trigger**: Displayed during query execution, shown in policy management view
- **Progression**: Action initiated → Policies evaluated → Results shown with reasoning → User sees which policies apply
- **Success criteria**: Policy decisions are explainable, users understand why access granted/denied

## Edge Case Handling

- **No datasets available**: Show onboarding prompt with examples of what can be onboarded
- **Query generates invalid SQL**: Show validation errors with suggestions to rephrase question
- **Policy violation**: Block action, show clear explanation, suggest remediation (request approval, modify query)
- **Approval timeout**: Notify requester and approver, allow re-submission
- **PII in results**: Auto-mask unless user has explicit PII access policy grant
- **Cross-jurisdiction query**: Block and require compliance approval before execution
- **Stale data queried**: Show warning with last refresh timestamp and SLA status
- **Concurrent pipeline edits**: Detect conflicts, show diff, require merge resolution
- **Rollback needed**: One-click rollback to previous snapshot with confirmation dialog

## Design Direction

The design should evoke institutional trust, technical precision, and operational clarity. This is a platform for serious financial work where mistakes have regulatory consequences. Visual language should be professional and authoritative without being intimidating - think Bloomberg Terminal meets modern design system. Heavy use of structured data display, status indicators, and evidence trails. Color should communicate state clearly (compliant/at-risk/blocked). Typography should support dense information display while maintaining readability.

## Color Selection

A sophisticated palette that communicates financial authority and operational status clarity.

- **Primary Color**: Deep navy blue (oklch(0.25 0.05 250)) - Communicates institutional trust, financial authority, and seriousness appropriate for banking
- **Secondary Colors**: 
  - Slate gray (oklch(0.45 0.01 250)) for secondary actions and backgrounds
  - Cool gray (oklch(0.60 0.01 250)) for tertiary elements
- **Accent Color**: Electric blue (oklch(0.65 0.15 245)) - High-visibility accent for CTAs and active states, modern and energetic
- **Status Colors**:
  - Success/Compliant: Forest green (oklch(0.55 0.12 150))
  - Warning/At-Risk: Amber (oklch(0.70 0.15 85))
  - Error/Blocked: Crimson (oklch(0.55 0.20 25))
  - Info: Sky blue (oklch(0.70 0.10 240))
- **Foreground/Background Pairings**:
  - Primary (Deep Navy): White text (oklch(1 0 0)) - Ratio 8.5:1 ✓
  - Accent (Electric Blue): White text (oklch(1 0 0)) - Ratio 5.2:1 ✓
  - Background (Light): Charcoal text (oklch(0.20 0.01 250)) - Ratio 13.1:1 ✓
  - Success (Forest Green): White text (oklch(1 0 0)) - Ratio 4.9:1 ✓
  - Warning (Amber): Charcoal text (oklch(0.20 0.01 250)) - Ratio 10.2:1 ✓

## Font Selection

Typefaces must support dense information display, technical precision, and extended reading sessions while projecting institutional credibility.

- **Primary**: IBM Plex Sans - Technical authority with excellent readability, designed for enterprise applications, supports tabular data well
- **Monospace**: JetBrains Mono - For code, SQL, and technical identifiers with clear distinction between similar characters

- **Typographic Hierarchy**:
  - H1 (Page Title): IBM Plex Sans SemiBold / 32px / tight tracking / leading 1.2
  - H2 (Section Header): IBM Plex Sans SemiBold / 24px / tight tracking / leading 1.3
  - H3 (Subsection): IBM Plex Sans Medium / 18px / normal tracking / leading 1.4
  - Body (Primary): IBM Plex Sans Regular / 15px / normal tracking / leading 1.6
  - Body Small (Metadata): IBM Plex Sans Regular / 13px / normal tracking / leading 1.5
  - Code/Technical: JetBrains Mono Regular / 14px / normal tracking / leading 1.5
  - Labels: IBM Plex Sans Medium / 13px / slight tracking / uppercase

## Animations

Animations should reinforce state changes and guide attention to critical compliance information, never decorative. Use for policy check results appearing, evidence pack generation completing, approval state transitions, and data freshness indicators updating. Motion should feel precise and deterministic - like machinery in a secure facility. Spring physics with high damping for professional feel.

## Component Selection

- **Components**:
  - Tabs for switching between Ask/Onboard/Pipelines/Approvals views
  - Card with distinct visual hierarchy for datasets, queries, pipelines
  - Dialog for approval workflows with evidence display
  - Badge for status indicators (compliant, at-risk, requires-approval, PII, cross-border)
  - Alert for policy violations and warnings
  - Table for dataset catalogs, audit logs, approval queues
  - Textarea for natural language input
  - Command palette (cmdk) for quick navigation and actions
  - Accordion for collapsible evidence sections
  - Separator for clear section breaks in dense layouts
  - Tooltip for explaining policies and technical terms
  - Progress for spec generation and query execution
  - Select for filtering by domain, owner, jurisdiction

- **Customizations**:
  - Evidence Pack Component: Custom card with collapsible sections showing inputs, outputs, policy checks, tests, artifacts
  - Policy Badge Component: Shows policy name, result, reasoning with icon and color coding
  - Dataset Card: Rich card showing schema preview, freshness gauge, owner, domain, PII level, jurisdiction
  - Query Console: Hybrid textarea + results viewer with SQL preview and execution controls
  - Approval Request Card: Shows requester, timestamp, risk level, evidence summary, approve/reject controls
  - Lineage Visualization: SVG-based flow diagram showing dataset → pipeline → output relationships

- **States**:
  - Buttons: Clear hover with slight lift, active with inset shadow, disabled with reduced opacity and cursor change
  - Inputs: Subtle border brightening on focus with accent ring, validation states with inline icons
  - Cards: Hover state with subtle shadow lift for interactive cards, selected state with accent border
  - Status badges: Solid fills with appropriate colors, pulsing animation for "in-progress" states

- **Icon Selection**:
  - MagnifyingGlass for search/query
  - ShieldCheck for policy compliance
  - Database for datasets
  - GitBranch for pipelines/lineage
  - CheckCircle/XCircle for approvals
  - Warning for policy violations
  - Clock for freshness/SLA
  - Eye for PII visibility
  - LockKey for access controls
  - ArrowCounterClockwise for rollback
  - FileText for evidence packs
  - User for owners/approvers

- **Spacing**:
  - Page padding: p-8
  - Card padding: p-6
  - Section gaps: gap-6 (between major sections)
  - Form field gaps: gap-4
  - Inline element gaps: gap-2
  - Dense data tables: py-2 px-3

- **Mobile**:
  - Stack tabs vertically on mobile with full-width buttons
  - Cards become full-width with reduced padding
  - Tables switch to card-based list view
  - Command palette remains full-screen overlay
  - Evidence packs use native accordions with larger touch targets
  - Approval actions stick to bottom of viewport
  - Hide secondary metadata by default with "Show details" toggle
