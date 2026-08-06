# BK App UI Design Language

# 01-layouts.md

> Defines the canonical page layouts used throughout BK App.
>
> Every new page MUST be based on one of the layouts described in this document unless there is a strong architectural reason not to.

---

# 1. Layout Philosophy

A layout defines the structural composition of a page.

Layouts are intentionally independent from business logic.

Example:

Quiz Configuration Editor

Game Configuration Editor

Tournament Editor

may edit completely different entities while sharing the exact same layout.

Layouts should therefore be reusable across multiple modules.

---

# 2. Supported Layouts

BK App currently defines the following canonical layouts.

| Layout                 | Purpose                  |
| ---------------------- | ------------------------ |
| Hero List Layout       | Lists of entities        |
| Standard Editor Layout | Editing complex entities |
| Details Layout         | Read-only entity details |
| Dashboard Layout       | Statistics and overview  |
| Wizard Layout          | Multi-step creation flow |

Not every layout is currently implemented.

Future layouts MUST extend this document.

---

# 3. Hero List Layout

Used by:

- Quiz Configurations
- Game Configurations
- Resources
- Projects
- Future entity lists

---

## Structure

```
Hero

↓

Optional Search / Filters

↓

Content Grid

↓

Empty State (optional)
```

---

## Hero

The hero introduces the page.

It MUST contain:

- Page title
- Breadcrumbs
- Short description
- Primary CTA
- Optional badges

The hero MUST NOT contain:

- Filters
- Tables
- Search
- Secondary actions

---

## Search

Search is optional.

Search SHOULD NOT be displayed if the expected entity count is very small.

Recommended threshold:

```
<= 3 items

Hide search
```

```
>= 4 items

Show search
```

Search is considered a progressive enhancement.

---

## Filters

Filters appear next to search.

Rules:

- lightweight
- inline
- no modal

Preferred controls:

- chips
- dropdowns
- segmented controls

Avoid:

- large filter panels

---

## Content

Entity lists SHOULD use cards.

Cards are preferred over tables whenever:

- entity count is low
- entities contain rich metadata
- entities expose actions

Tables should only be used when dense comparison is required.

---

## Empty State

Every list page MUST define an Empty State.

It should contain:

- illustration or icon
- short explanation
- primary CTA

Never leave an empty white page.

---

# 4. Standard Editor Layout

Used by:

- Game Configuration Editor
- Quiz Configuration Editor
- Future complex editors

---

## Structure

```
Hero

↓

Validation Banner (optional)

↓

Sidebar Navigation

↓

Workspace Header

↓

Working Panels

↓

Sticky Save Bar
```

---

## Hero

Contains:

- title
- breadcrumbs
- entity badges
- primary action

The hero MUST remain compact.

---

## Validation Banner

Displayed only when required.

Possible states:

Information

Warning

Success

The banner should explain:

- what is missing
- why saving is blocked

Never use it for navigation.

---

## Sidebar Navigation

Purpose:

Navigate between logical sections.

Each section contains:

- icon
- title
- subtitle
- status indicator

Possible status indicators:

Ready

Changed

Warning

Navigation MUST always remain available.

Validation MUST NOT disable sections.

---

## Workspace Header

Each section begins with a workspace header.

Contains:

- section title
- short explanation
- optional contextual chips

This header explains what the user is editing.

---

## Working Panels

A section may contain one or more panels.

Panels are independent.

Panels SHOULD group related settings.

Avoid one giant form.

---

## Sticky Save Bar

Always visible while editing.

Contains:

- save state
- reset action
- primary save button

Purpose:

Avoid forcing the user to scroll to save.

---

# 5. Details Layout

Purpose:

Read-only presentation.

Structure:

```
Hero

↓

Summary Cards

↓

Content Panels
```

Editing controls SHOULD NOT appear.

Instead:

Provide a single Edit action.

---

# 6. Dashboard Layout

Purpose:

Overview.

Structure:

```
Hero

↓

Metrics

↓

Charts

↓

Recent Activity

↓

Quick Actions
```

Dashboards should never contain editing forms.

---

# 7. Wizard Layout

Purpose:

Complex creation flows.

Structure:

```
Hero

↓

Stepper

↓

Current Step

↓

Navigation
```

Rules:

Only one step visible.

Never mix wizard with sidebar editor.

---

# 8. Layout Selection Guide

When creating a new page:

Question 1

Does the page list multiple entities?

YES

→ Hero List Layout

---

Question 2

Does the page edit one complex entity?

YES

→ Standard Editor Layout

---

Question 3

Does the page only present information?

YES

→ Details Layout

---

Question 4

Is the user completing a sequence?

YES

→ Wizard Layout

---

Question 5

Is the page primarily analytical?

YES

→ Dashboard Layout

---

# 9. Layout Consistency Rules

All layouts MUST:

- begin with Hero
- maintain consistent spacing
- keep one primary CTA
- avoid horizontal scrolling
- support responsive behaviour

Layouts SHOULD:

- reuse existing components
- minimize visual noise
- expose clear navigation

Layouts MUST NOT:

- invent page-specific structures
- duplicate navigation
- hide primary actions
- mix unrelated responsibilities

---

# 10. Future Evolution

New layouts should be extremely rare.

Before introducing one, verify that the problem cannot be solved by extending an existing layout.

Layout proliferation reduces consistency and increases maintenance cost.

Reuse existing layouts whenever possible.
