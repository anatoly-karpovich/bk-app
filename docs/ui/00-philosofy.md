# BK App UI Design Language

> Version: 1.0
>
> Status: Draft
>
> This document defines the core design philosophy of BK App.
> It describes _why_ the interface is built the way it is.
> Component specifications and implementation details are described in subsequent documents.

---

# 1. Goal

BK App is **not** a traditional administration panel.

Although the application manages projects, games, quizzes, resources and configurations, it should feel like a modern productivity application rather than a CRUD system.

The primary goals of the interface are:

- fast navigation
- low cognitive load
- predictable layouts
- high information density without visual clutter
- maximum component reuse

Every new screen should feel like another room inside the same application, not like a separate project.

---

# 2. Core Principles

## 2.1 Consistency over creativity

New pages MUST reuse existing layouts and components whenever possible.

Do not invent a new layout if an existing one can solve the same problem.

Consistency is more valuable than uniqueness.

---

## 2.2 Composition over invention

Pages are built by composing existing blocks.

Example:

Hero
↓

Sidebar Navigation
↓

Workspace Header
↓

Working Cards
↓

Sticky Actions

NOT by creating a completely new page structure.

---

## 2.3 One page — one responsibility

Each page should have one primary purpose.

Examples:

Quiz Config List

Purpose:

- browse
- search
- create
- open

NOT:

- edit
- preview every property
- manage rewards

---

Quiz Config Editor

Purpose:

- edit one configuration

NOT:

- browse all configurations

---

## 2.4 Navigation must be predictable

Users should always know

- where they are
- what they are editing
- what remains unfinished
- how to save

Navigation patterns should remain identical across all editor pages.

---

## 2.5 Editing should never feel dangerous

Users should be encouraged to explore.

Therefore:

MUST

- allow opening every section

MUST NOT

- block navigation because validation failed

Validation blocks saving.

Validation never blocks exploration.

---

## 2.6 Progressive disclosure

Show only the information required at the current moment.

Avoid overwhelming users with every possible setting.

Large entities should be split into logical sections.

---

## 2.7 Large cards instead of dense forms

BK App prefers spacious cards over compact enterprise forms.

Preferred:

┌─────────────────────┐

Title

Description

Fields

Preview

└─────────────────────┘

Avoid:

label label label

input input input

checkbox checkbox checkbox

for several screens.

---

## 2.8 Information hierarchy

Information must always appear in this order:

Page

↓

Section

↓

Card

↓

Field

↓

Control

Never invert this hierarchy.

---

## 2.9 Visual breathing room

Whitespace is considered part of the design.

Do not compress layouts to fit more controls.

Scrolling is cheaper than visual overload.

---

## 2.10 Smart defaults

Whenever a value can be derived automatically, it SHOULD NOT require user interaction.

Example:

Configuration Status

BAD

User selects

Draft / Ready

GOOD

Status is calculated automatically.

---

# 3. Design Goals

Every page should satisfy the following qualities.

## Predictable

Users should immediately recognize the layout.

---

## Calm

Avoid unnecessary colors, borders and decorations.

---

## Fast

The most common action should always be obvious.

---

## Forgiving

Users should never lose work because they explored the interface.

---

## Reusable

Every visual solution should be considered reusable for future modules.

---

# 4. Component Reuse Policy

Whenever implementing a new screen:

1.

Search existing components.

2.

Search existing layouts.

3.

Search existing patterns.

4.

Only if no suitable solution exists:

Create a new reusable component.

Never create page-specific components when a reusable abstraction is possible.

---

# 5. Anti-goals

BK App intentionally avoids becoming:

- Bootstrap admin panel
- ERP interface
- Spreadsheet
- Database browser

The interface should resemble products like:

- Shopify Admin
- Linear
- Notion
- Discord Settings

rather than legacy enterprise software.

---

# 6. Future documents

This philosophy is implemented by the following documents:

01-layouts.md

Defines all supported page layouts.

02-components.md

Defines reusable UI components.

03-patterns.md

Defines reusable interaction patterns.

04-ux-rules.md

Defines user experience rules.

05-visual-language.md

Defines spacing, typography and visual consistency.

06-anti-patterns.md

Defines patterns that MUST NOT be introduced.
