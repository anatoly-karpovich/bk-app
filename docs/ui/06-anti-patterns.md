# BK App UI Design Language

# 06-anti-patterns.md

> Version: 1.0
>
> Defines UI and UX patterns that MUST NOT be introduced into BK App.
>
> This document is as important as the positive design rules.
>
> Every rejected pattern increases consistency across the application.

---

# 1. Purpose

Consistency is created not only by what we build.

Consistency is also created by what we intentionally refuse to build.

This document defines interaction patterns that should not appear inside BK App.

---

# 2. General Rule

Whenever introducing a new interaction ask:

Does this already exist elsewhere?

↓

YES

Reuse it.

↓

NO

Can an existing pattern be adapted?

↓

YES

Adapt it.

↓

NO

Document the new pattern before implementation.

---

# 3. Giant Forms

❌ Avoid

```
Settings

↓

40 inputs

↓

Save
```

Problems

- overwhelming
- difficult navigation
- impossible to scan
- poor mobile UX

---

✅ Preferred

```
Sidebar

↓

Section

↓

Panel

↓

Fields
```

Split configuration into logical areas.

---

# 4. Mega Cards

❌ Avoid

```
Card

↓

Title

↓

Description

↓

20 fields

↓

Buttons

↓

Summary

↓

Statistics

↓

Preview
```

Problems

No hierarchy.

Impossible to scan.

---

✅ Preferred

Several smaller panels.

One responsibility per panel.

---

# 5. Card Nesting

❌ Avoid

```
Card

↓

Card

↓

Card

↓

Card
```

Maximum nesting depth

2

Reason

Nested cards destroy visual hierarchy.

---

# 6. Tables For Everything

❌ Avoid

```
Name

Status

Rewards

Buttons

```

for collections containing

3

5

8 entities.

Tables optimize density.

BK App optimizes readability.

---

✅ Preferred

Configuration Cards.

---

# 7. Modal Driven UX

❌ Avoid

```
Add

↓

Modal

↓

Save

↓

Close

↓

Refresh
```

Problems

Context switching

Extra clicks

Workflow interruption

---

✅ Preferred

```
Add

↓

Card appears

↓

Edit inline
```

---

# 8. Hidden Save Buttons

❌ Avoid

```
Fields

↓

Fields

↓

Fields

↓

Fields

↓

Save
```

Problems

Users constantly scroll.

---

✅ Preferred

Sticky Save Bar.

---

# 9. Multiple Primary Actions

❌ Avoid

```
Save

Publish

Update

Generate

```

all looking equally important.

---

✅ Preferred

Exactly one Primary CTA.

Everything else becomes secondary.

---

# 10. Disabled Navigation

❌ Avoid

```
Section disabled

↓

Fill previous section first
```

Problems

Users cannot learn the interface.

---

✅ Preferred

Everything can be opened.

Saving may remain unavailable.

---

# 11. Manual State Selection

❌ Avoid

```
Draft

Ready

Published

```

when status can be calculated.

---

✅ Preferred

Application derives status automatically.

---

# 12. Placeholder Labels

❌ Avoid

```
Input

Placeholder

No label
```

Problems

Placeholder disappears.

Accessibility suffers.

---

✅ Preferred

Persistent labels.

---

# 13. Unnecessary Confirmations

❌ Avoid

```
Duplicate?

Are you sure?

```

```
Save?

Are you sure?

```

```
Search?

```

Confirmation dialogs exist only for destructive actions.

---

# 14. Deep Navigation

❌ Avoid

```
Tab

↓

Accordion

↓

Accordion

↓

Accordion
```

Problems

Users lose orientation.

---

✅ Preferred

Sidebar

↓

Panel

↓

Field

---

# 15. Inconsistent Buttons

❌ Avoid

Creating page-specific button styles.

Example

Purple Save

Blue Save

Green Save

Orange Save

---

Buttons communicate priority.

Not page identity.

---

# 16. Excessive Colors

❌ Avoid

Every section using different accent colors.

Problems

Noise.

Reduced hierarchy.

---

Use colors only to communicate meaning.

Primary

Success

Warning

Danger

Neutral

Nothing else.

---

# 17. Icon Only Actions

❌ Avoid

```
★

⚙

⬢

⚡
```

without explanation.

---

Icons support text.

They never replace text.

---

# 18. Long Explanations

❌ Avoid

```
Panel

↓

Paragraph

↓

Paragraph

↓

Paragraph
```

inside configuration screens.

Users came to configure.

Not to read documentation.

---

Descriptions should be concise.

---

# 19. Page Specific Components

❌ Avoid

```
QuizRewardCard

QuizRewardPanel

QuizRewardEditor

```

used once.

---

Instead

```
RewardEditor
```

Reusable.

---

# 20. Business Logic Inside Layout

❌ Avoid

Creating unique page structures because

"this entity is special."

---

Layout solves navigation.

Business logic belongs inside panels.

---

# 21. Different Solutions To The Same Problem

❌ Avoid

Reward editor A

Reward editor B

Reward editor C

---

One interaction.

↓

One component.

---

# 22. Empty White Screens

❌ Avoid

```
No data.
```

---

Always provide

Explanation

Action

Next step

---

# 23. Horizontal Scrolling

❌ Avoid

Horizontal page scrolling.

Especially inside editors.

---

Responsive layouts must stack vertically.

---

# 24. Duplicate Information

❌ Avoid

Showing the same information

Hero

↓

Summary

↓

Panel

↓

Footer

---

Each piece of information should have one canonical location.

---

# 25. Silent Success

❌ Avoid

User presses Save.

Nothing happens.

---

Always provide feedback.

Toast.

Status update.

Timestamp.

---

# 26. UI Drift

The biggest long-term risk.

Definition

Introducing tiny visual differences over time.

Examples

One page

18px radius.

Another

16px.

Another

22px.

Different spacing.

Different buttons.

Different badges.

Eventually

The application no longer feels unified.

---

Solution

Always extend existing components.

Never fork them.

---

# 27. Canonical Override Rule

If a canonical screen already solves the problem...

↓

Copy it.

Do not redesign it.

Canonical implementations exist specifically to prevent UI drift.

---

# 28. Anti-pattern Checklist

Before merging a PR verify:

☐ No giant forms

☐ No unnecessary modals

☐ No duplicate layouts

☐ No duplicate components

☐ No disabled navigation

☐ No page-specific button styles

☐ No placeholder-only labels

☐ No horizontal scrolling

☐ No visual drift

☐ No new interaction without documentation

---

# Golden Principle

If a new screen feels like it belongs to another application...

it does not belong to BK App.
