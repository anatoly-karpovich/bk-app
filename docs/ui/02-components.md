# BK App UI Design Language

# 02-components.md

> Defines reusable UI components used throughout BK App.
>
> Components describe visual building blocks.
> They are independent from React implementation details.

---

# 1. Component Philosophy

Pages are assembled from reusable UI components.

New components should be introduced only when an existing one cannot solve the problem.

A component must be reusable across multiple modules.

Avoid creating page-specific UI.

---

# 2. Component Categories

BK App components are divided into five groups.

```
Layout Components

↓

Navigation Components

↓

Information Components

↓

Editing Components

↓

Feedback Components
```

---

# 3. Layout Components

---

## Hero

Purpose

Introduces the current page.

Used on

- Lists
- Editors
- Details
- Dashboards

Contains

- Title
- Breadcrumbs
- Description
- Badges
- Primary Action

Rules

MUST

- be first visible block

SHOULD

- remain visually lightweight

MUST NOT

- contain forms
- contain search
- contain filters

---

## Workspace Header

Purpose

Introduces the current editing section.

Contains

- Section title

- Description

- Context chips

Example

```
Rewards

Configure rewards given to players after answering correctly.
```

---

## Working Panel

Purpose

Container for one logical group of settings.

Structure

```
Panel

↓

Title

↓

Description

↓

Controls
```

Panels should never become excessively large.

Split large panels into multiple smaller panels.

---

## Sticky Action Bar

Purpose

Provides persistent save controls.

Contains

- Save status

- Reset

- Primary Save

Only one Sticky Action Bar may exist on a page.

---

# 4. Navigation Components

---

## Sidebar Navigation

Purpose

Navigate editor sections.

Structure

```
Icon

Title

Subtitle

Status
```

Status values

Ready

Changed

Warning

Rules

Navigation is always enabled.

Validation never disables navigation.

---

## Breadcrumbs

Purpose

Provide location context.

Always appear inside Hero.

Never replace page title.

---

# 5. Information Components

---

## Summary Card

Purpose

Display one important fact.

Examples

```
Questions

20
```

```
Bonus Rules

8
```

```
Status

Ready
```

Rules

One card = one metric.

Avoid paragraphs.

---

## Configuration Card

Purpose

Represent one configuration inside a list.

Contains

Name

Description

Metadata

Statistics

Actions

Never expose full configuration details.

---

## Status Badge

Purpose

Represent entity state.

Supported states

Ready

Draft

System

Changed

Archived (future)

Error

Badges should always use consistent colors.

Status must never rely only on color.

---

## Resource Chip

Purpose

Represent a resource.

Examples

```
Gold

EKR

Honor

Coins
```

Rules

Small

Compact

Single line

Reusable everywhere.

---

## Empty State

Purpose

Explain why no content exists.

Contains

Icon

Explanation

Primary CTA

Never display an empty page.

---

# 6. Editing Components

---

## Form Field

Standard input wrapper.

Contains

Label

Input

Validation

Helper text (optional)

Rules

Labels are always visible.

Avoid placeholder-only forms.

---

## Inline Collection

Purpose

Editable list inside a panel.

Examples

Reward list

Bonus list

Overrides

Rules

Adding an item should insert a new card.

Avoid modal dialogs.

---

## Reward Editor

Purpose

Configure one reward.

Contains

Resource

Amount

Delete

Future

Probability

Conditions

etc.

This component should be reused across every reward system.

---

## Bonus Editor

Purpose

Configure bonus rules.

Contains

Position

Reward

Amount

Future

Conditions

Reusable in

Quiz Configurations

Future Events

Future Competitions

---

## Question Grid

Purpose

Visual navigation between quiz questions.

Rules

Selected question must remain highlighted.

Questions with bonuses should display indicators.

Avoid dropdown-based navigation.

---

## Template Editor

Purpose

Edit message templates.

Contains

Template

Variables

Preview

Rules

Preview updates immediately.

Variables inserted without manual typing.

---

# 7. Feedback Components

---

## Validation Banner

Purpose

Explain why saving is blocked.

States

Warning

Success

Information

Never use for errors unrelated to current page.

---

## Toast

Purpose

Confirm successful actions.

Examples

Saved

Created

Deleted

Duplicated

Toasts should never require interaction.

---

## Confirmation Dialog

Purpose

Prevent destructive actions.

Used only for

Delete

Reset

Discard changes

Never use confirmation dialogs for ordinary actions.

---

# 8. Component Reuse Rules

Before creating a component ask:

Can Working Panel solve this?

↓

Can Inline Collection solve this?

↓

Can Summary Card solve this?

↓

Can Reward Editor solve this?

↓

Can Configuration Card solve this?

↓

Only then create a new component.

---

# 9. Component Evolution

Components should evolve.

Do not fork components.

Do not duplicate components.

Improve the shared component instead.

Every improvement should automatically benefit every screen using it.

---

# 10. Golden Rule

If two pages solve the same interaction problem...

...they should use the same component.

Different business logic does not justify different UI.
