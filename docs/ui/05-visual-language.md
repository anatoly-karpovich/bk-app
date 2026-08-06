# BK App UI Design Language

# 05-visual-language.md

> Version: 1.0
>
> Defines the visual language of BK App.
>
> This document intentionally avoids implementation details such as exact color values.
> Instead it describes the visual principles that every new screen must follow.

---

# 1. Philosophy

BK App should feel like a modern productivity application.

The interface should be:

- calm
- spacious
- predictable
- readable
- lightweight

The goal is not visual originality.

The goal is visual consistency.

---

# 2. Visual Hierarchy

Every page follows the same hierarchy.

```
Page

↓

Hero

↓

Section

↓

Panel

↓

Field

↓

Control
```

Never invert this hierarchy.

A field should never visually compete with a section.

---

# 3. Density

BK App intentionally uses medium information density.

Avoid both extremes.

Too sparse

↓

Requires excessive scrolling.

Too dense

↓

Feels like enterprise software.

Preferred

Large cards

Comfortable spacing

Compact controls

Readable typography

---

# 4. Spacing System

The interface follows an 8px spacing scale.

Preferred values

```
4

8

12

16

24

32

40

48

64
```

Avoid arbitrary spacing values.

Spacing should feel rhythmic.

---

# 5. Corners

Corner radius communicates hierarchy.

Recommended usage

Small controls

8–12px

---

Inputs

12–14px

---

Cards

16–20px

---

Hero

20–28px

---

Never mix multiple random radii on the same screen.

---

# 6. Elevation

Use elevation sparingly.

Three levels are sufficient.

Level 0

Background

---

Level 1

Cards

Panels

---

Level 2

Sticky elements

Dropdowns

Dialogs

---

Avoid excessive shadows.

Elevation should indicate importance.

Not decoration.

---

# 7. Color Usage

Color communicates meaning.

Never use color only for decoration.

Primary

Main actions

Selection

Focus

---

Success

Completed

Ready

Saved

---

Warning

Validation

Draft

Missing data

---

Danger

Deletion

Errors

Destructive actions

---

Information

Hints

Context

Descriptions

---

Neutral

Everything else

---

Avoid introducing page-specific colors.

---

# 8. Typography

Typography communicates hierarchy.

Recommended levels

Page Title

Largest

---

Section Title

Large

---

Panel Title

Medium

---

Field Label

Small

---

Helper Text

Small

Muted

---

Metadata

Smallest

Never rely on font size alone.

Use spacing.

---

# 9. Icons

Icons support recognition.

Icons never replace text.

Good

🏆 Rewards

Bad

🏆

Icons should remain simple.

Avoid decorative illustrations inside forms.

---

# 10. Cards

Cards are the primary container.

Every card should contain one logical responsibility.

Preferred

```
Card

↓

Title

↓

Description

↓

Content
```

Avoid cards inside cards inside cards.

Maximum recommended nesting

2 levels.

---

# 11. Panels

Panels divide complex editors.

Panels should always contain

Title

Description

Working Area

Panels should not compete visually.

Use spacing instead of borders.

---

# 12. Forms

Forms should feel lightweight.

Preferred

```
Label

↓

Input

↓

Helper
```

Avoid

```
Input

↓

Placeholder

↓

No label
```

Labels are mandatory.

---

# 13. Buttons

Only one button should dominate.

Priority

Primary

↓

Outline

↓

Ghost

↓

Danger

Do not invent additional button styles.

---

# 14. Chips

Chips communicate metadata.

Examples

Ready

Draft

System

10 Questions

8 Bonus Rules

Gold

EKR

Rules

Single line

Compact

Never interactive unless acting as filters.

---

# 15. Badges

Badges communicate status.

Status badges should remain consistent throughout the application.

Every status should have

Color

Label

Meaning

Never rely on color alone.

---

# 16. Empty Space

Whitespace is intentional.

It separates concepts.

Do not remove spacing simply to fit more controls.

Scrolling is preferable to visual overload.

---

# 17. Animations

Animations should explain change.

Examples

Opening panels

Selection

Save feedback

Adding cards

Avoid decorative animations.

Duration

100–250ms

Preferred easing

Ease Out

---

# 18. Responsive Design

Layouts should adapt naturally.

Desktop

Multiple columns

---

Tablet

Reduced columns

---

Mobile

Single column

Never require horizontal scrolling.

---

# 19. Visual Consistency

Before introducing a new visual style ask

Can an existing one be reused?

↓

YES

Reuse.

↓

NO

Document the new style.

Never create visual variants without documenting them.

---

# 20. Canonical Look

Every new page should visually resemble one of the canonical screens.

Current references

Quiz Configuration List

Quiz Configuration Editor

Game Configuration Editor

If a new page feels visually different,

the design should be reconsidered.

---

# Visual Checklist

Cards use consistent radius

☐

Spacing follows 8px rhythm

☐

Only one primary button

☐

Status colors are consistent

☐

Typography follows hierarchy

☐

No excessive shadows

☐

No nested cards beyond two levels

☐

Whitespace is preserved

☐

Responsive layout works naturally

☐

Looks like BK App

☐

---

# Golden Principle

Users should recognize a BK App page instantly,

even before reading its content.

Visual identity comes from consistency,

not decoration.
