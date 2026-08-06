# BK App UI Design Language

# 07-agent-context.md

> Version: 1.0
>
> Audience:
>
> - AI Coding Agents
> - Codex
> - Claude Code
> - ChatGPT
> - Developers
>
> This document describes the design decision process used when creating any new UI inside BK App.
>
> Before implementing a new screen, follow this algorithm.
>
> Never skip steps.

---

# 1. Design Algorithm

Whenever creating a new page, always answer the following questions **in order**.

Do not jump ahead.

---

# Step 1

## What is the primary user goal?

Exactly one answer should be selected.

- Browse entities
- Edit one entity
- View entity details
- Create entity
- Complete a workflow
- View statistics

This decision determines the page layout.

---

# Step 2

## Select the canonical layout

Use the following mapping.

| Goal                | Layout                 |
| ------------------- | ---------------------- |
| Browse entities     | Hero List Layout       |
| Edit one entity     | Standard Editor Layout |
| View details        | Details Layout         |
| Multi-step creation | Wizard Layout          |
| Statistics          | Dashboard Layout       |

Never invent a new layout unless absolutely necessary.

---

# Step 3

## Does the entity already exist in BK App?

YES

↓

Find the canonical implementation.

Reuse it.

---

NO

↓

Continue.

---

# Step 4

## Can an existing pattern solve this problem?

Check:

- Configuration List
- Standard Editor
- Reward Pattern
- Inline Collection
- Template Editor
- Question Grid
- Summary Pattern

If one matches,

reuse it.

---

# Step 5

## Select reusable components

Before creating UI, identify existing components.

Examples

Hero

Sidebar Navigation

Working Panel

Summary Cards

Reward Editor

Sticky Save Bar

Empty State

Toast

Validation Banner

Do not create replacements.

---

# Step 6

## Does the entity contain logical sections?

YES

↓

Use Sidebar Navigation.

---

NO

↓

Use a single Working Surface.

---

# Step 7

## Does the entity contain collections?

Collections include

Rewards

Overrides

Bonus Rules

Templates

Variables

Questions

Resources

YES

↓

Use Inline Collection Pattern.

Never create a table by default.

---

# Step 8

## Does the entity contain rewards?

YES

↓

Reuse Reward Editor.

Never invent another reward editor.

---

# Step 9

## Does the entity contain questions?

YES

↓

Use Question Grid.

Avoid dropdown-based navigation.

---

# Step 10

## Does the entity contain message templates?

YES

↓

Reuse Template Editor Pattern.

Requirements

Live Preview

Variable Insertion

Template Editing

Never split these into separate pages.

---

# Step 11

## Is validation required?

YES

↓

Use Validation Banner.

↓

Use Field Validation.

↓

Disable Save.

Never disable navigation.

---

# Step 12

## Can defaults be calculated?

Examples

Status

Question Grid

Bonus Position

Search Visibility

YES

↓

Calculate automatically.

Never ask the user.

---

# Step 13

## Does the page require Save?

YES

↓

Use Sticky Save Bar.

Only one.

Never place Save buttons inside individual panels.

---

# Step 14

## Does the page contain destructive actions?

YES

↓

Confirmation Dialog.

NO

↓

Never ask for confirmation.

---

# Step 15

## Does the page need Search?

Expected number of entities

1–3

↓

Hide Search.

4+

↓

Show Search.

Search should never exist by default.

---

# Step 16

## Does the page require Summary?

Summary is recommended when

The entity is complex

The page has multiple sections

The user benefits from a quick overview

Summary should contain metrics only.

---

# Step 17

## Empty State

Every collection must define

Loading State

Empty State

Error State

Do not leave blank areas.

---

# Step 18

## Responsive behaviour

Desktop

Multi-column

↓

Tablet

Reduced columns

↓

Mobile

Single column

Never introduce horizontal scrolling.

---

# Step 19

## Canonical Reference

Before implementation, identify one existing screen that should be used as reference.

Example

Quiz Configuration Editor

Game Configuration Editor

Quiz Configuration List

If no canonical screen exists,

create one.

---

# Step 20

## Anti-pattern Check

Verify the page does NOT introduce

- giant forms
- nested cards
- duplicate components
- duplicate layouts
- unnecessary modals
- duplicate Save buttons
- disabled navigation
- placeholder-only labels
- visual inconsistency

---

# 2. Component Selection Matrix

| Need                 | Use                 |
| -------------------- | ------------------- |
| Page introduction    | Hero                |
| Section introduction | Workspace Header    |
| Editable area        | Working Panel       |
| Entity overview      | Summary Cards       |
| Configuration list   | Configuration Card  |
| Rewards              | Reward Editor       |
| Questions            | Question Grid       |
| Collections          | Inline Collection   |
| Messages             | Template Editor     |
| Save                 | Sticky Save Bar     |
| Validation           | Validation Banner   |
| Notifications        | Toast               |
| Destructive actions  | Confirmation Dialog |

Do not introduce alternatives without documentation.

---

# 3. Design Priorities

Always optimise in the following order.

1.

Consistency

↓

2.

Clarity

↓

3.

Reusability

↓

4.

Simplicity

↓

5.

Visual beauty

Beauty should never reduce consistency.

---

# 4. Definition of Done

A new page is considered complete only if

☐ Correct layout selected

☐ Existing patterns reused

☐ Existing components reused

☐ UX Rules followed

☐ No Anti-patterns introduced

☐ Responsive

☐ Loading State exists

☐ Empty State exists

☐ Error State exists

☐ Save behaviour consistent

☐ Navigation consistent

☐ Visual language consistent

☐ Canonical screen identified

---

# 5. Prompt Template For AI

When generating a new page, use the following prompt template.

---

Create a new BK App page.

Goal:

<describe business goal>

Use:

- Canonical Layout
- Existing Components
- Existing Patterns

Requirements

Do not introduce new layouts.

Do not introduce new interaction patterns.

Reuse Reward Editor if rewards are involved.

Reuse Question Grid if questions are involved.

Use Sticky Save Bar if editing.

Follow UX Rules.

Follow Visual Language.

Check Anti-patterns before implementation.

Reference the closest canonical screen.

---

# 6. Golden Rule

Every new page should feel like it has always existed inside BK App.

If the page attracts attention because it looks or behaves differently,

it is not finished.
