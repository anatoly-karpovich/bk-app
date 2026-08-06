# BK App UI Design Language

# 03-patterns.md

> Defines reusable UI patterns used throughout BK App.
>
> A pattern is a composition of multiple reusable components solving a common UX problem.
>
> New screens SHOULD be assembled from existing patterns before introducing new ones.

---

# 1. Pattern Philosophy

A component solves one problem.

A pattern solves one user workflow.

Patterns intentionally combine multiple components into reusable screen fragments.

Example

Configuration Card

↓

Component

---

Configuration List

↓

Pattern

---

# 2. Configuration List Pattern

Purpose

Display multiple configurations that can be searched, compared and opened.

Used by

- Quiz Configurations
- Game Configurations
- Future Tournament Configurations

Structure

```
Hero

↓

Search (optional)

↓

Configuration Cards

↓

Empty State
```

Components

Hero

Search

Configuration Card

Empty State

Primary CTA

---

## Configuration Card

Every configuration card MUST contain

Name

Description

Metadata

Summary

Actions

---

Metadata

Examples

System

Draft

Ready

---

Summary

Examples

Questions

Rewards

Bonus Rules

Templates

---

Actions

Primary

Open

Secondary

Duplicate

Delete

More

---

Configuration cards MUST NOT expose every property.

They provide overview only.

---

Search

Search SHOULD appear only when necessary.

Recommended threshold

```
1-3 configurations

↓

Hide search
```

```
4+ configurations

↓

Display search
```

---

# 3. Standard Editor Pattern

Purpose

Edit one complex entity.

Used by

Game Configuration

Quiz Configuration

Future editors

---

Structure

```
Hero

↓

Validation Banner

↓

Sidebar Navigation

↓

Workspace Header

↓

Working Panels

↓

Sticky Save Bar
```

Components

Hero

Validation Banner

Sidebar Navigation

Workspace Header

Working Panel

Sticky Save Bar

---

Rules

Navigation is never blocked.

Saving may be blocked.

---

Validation

Validation explains

What is missing

Why saving is unavailable

Validation never replaces navigation.

---

# 4. Summary Pattern

Purpose

Provide a quick overview.

Structure

```
Summary Cards

Summary Cards

Summary Cards
```

Rules

Each card represents exactly one metric.

Preferred examples

Questions

Bonus Rules

Status

Templates

Rewards

Avoid

Paragraphs

Large descriptions

Multiple unrelated metrics

---

# 5. Inline Collection Pattern

Purpose

Manage collections.

Examples

Rewards

Overrides

Bonus Rules

Message Variables

Future Achievements

---

Structure

```
Panel

↓

Collection

↓

Cards

↓

Add Button
```

Rules

Adding creates a new card immediately.

Cards remain editable inline.

Avoid modal-based editing.

---

# 6. Reward Configuration Pattern

Purpose

Configure rewards.

Used by

Quiz Configurations

Game Configurations

Future events

Future tournaments

---

Structure

```
Reward Mode

↓

Reward Collection

↓

Reward Card

↓

Resource

Amount

Conditions
```

Rules

Reward editing should remain identical across the application.

Users should never learn two reward editors.

---

# 7. Question Selection Pattern

Purpose

Select one quiz question.

Used by

Bonus Rules

Future Question Overrides

Future Statistics

---

Structure

```
Question Grid

↓

Selected Question

↓

Editor
```

Rules

Question selection should be visual.

Avoid dropdowns.

---

Question State

Normal

Selected

Has Bonus

Future

Completed

Locked

---

# 8. Template Editor Pattern

Purpose

Configure message templates.

Used by

Question Messages

Answer Messages

Future Notifications

---

Structure

```
Template

↓

Variables

↓

Preview
```

Rules

Preview updates immediately.

Variables inserted with one click.

Template remains editable.

Preview is read-only.

---

# 9. Empty State Pattern

Purpose

Explain missing content.

Structure

```
Illustration

↓

Title

↓

Explanation

↓

Primary CTA
```

Never leave users inside an empty card.

---

# 10. Validation Pattern

Purpose

Explain why saving is unavailable.

Rules

Always explain

What

Why

How to fix

Never display generic

"Validation failed"

messages.

---

# 11. Confirmation Pattern

Purpose

Protect destructive actions.

Used by

Delete

Reset

Discard

Never used for

Open

Edit

Duplicate

Save

---

# 12. Progressive Disclosure Pattern

Purpose

Reduce complexity.

Rule

Only display controls relevant to the current context.

Example

Reward Mode

↓

Everyone

↓

Simple Reward Editor

---

Reward Mode

↓

Places

↓

Place Collection

---

Users should never see controls that cannot affect current behaviour.

---

# 13. Smart Defaults Pattern

Purpose

Reduce decisions.

Examples

Configuration Status

↓

Calculated automatically

---

Search

↓

Hidden for very small lists

---

Bonus Position

↓

First available position

---

Question Grid

↓

Generated automatically

---

Never ask the user to choose values that the application already knows.

---

# 14. Sticky Actions Pattern

Purpose

Prevent unnecessary scrolling.

Structure

```
Status

↓

Reset

↓

Primary Action
```

Rules

Only one sticky action bar.

Never duplicate Save buttons throughout the page.

---

# 15. Pattern Composition

Patterns are intentionally composable.

Example

Quiz Configuration Editor

=

Hero

-

Validation Pattern

-

Sidebar Pattern

-

Summary Pattern

-

Reward Pattern

-

Question Selection Pattern

-

Template Editor Pattern

-

Sticky Actions Pattern

---

# 16. Pattern Evolution

New patterns should be introduced rarely.

Before creating one ask

Can this screen be assembled from existing patterns?

↓

YES

Reuse.

↓

NO

Document the new pattern before implementation.

Patterns are considered part of the architecture and must evolve centrally.

Avoid creating undocumented interaction patterns.
