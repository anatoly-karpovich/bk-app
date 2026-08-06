# BK App UI Design Language

# 04-ux-rules.md

> Version: 1.0
>
> Defines user experience rules used across the entire BK App.
>
> These rules describe how the interface should behave, not how it should look.
>
> All new screens MUST follow these principles.

---

# 1. Purpose

This document defines interaction rules shared by every page in BK App.

Unlike Components or Layouts, UX Rules describe behavior.

Users should experience the same interaction model everywhere.

---

# 2. Golden Rules

## Rule 1

### Never block exploration

Users must always be able to inspect the interface.

Allowed

- open sections
- switch tabs
- navigate pages
- preview settings

Blocked

- save
- publish
- delete (when forbidden)

Never disable navigation because validation failed.

---

## Rule 2

### Block actions, not movement

Incorrect

```
Name is empty

↓

Rewards tab disabled
```

Correct

```
Name is empty

↓

Rewards tab available

↓

Save disabled
```

Users learn interfaces by exploring them.

---

## Rule 3

### Explain every disabled action

Never disable a control silently.

Bad

```
Save

(disabled)
```

Good

```
Save

Disabled

Reason

3 required fields are missing.
```

Users should never wonder why something cannot be done.

---

# 3. Validation

Validation exists to help users.

It is not punishment.

---

## Validation should

Explain

- what is wrong
- why
- how to fix it

---

Avoid

```
Validation failed
```

Prefer

```
Quiz name is required.

Reward rule is missing.

Question template is empty.
```

---

## Validation location

Preferred order

Validation Banner

↓

Field Validation

↓

Save Button

Do not display unrelated validation inside dialogs.

---

## Validation timing

Validate continuously.

Avoid validating only after pressing Save.

Live feedback reduces frustration.

---

# 4. Saving

Saving should feel predictable.

---

## Save State

Possible states

- No Changes
- Unsaved Changes
- Saving
- Saved
- Error

Avoid additional custom states.

---

## Save Button

One page

↓

One primary save button.

Never scatter Save buttons across multiple panels.

---

## Sticky Save

Editor pages should always provide access to Save without scrolling.

Sticky Save Bar is the preferred solution.

---

## Successful save

After saving

- preserve scroll position
- preserve selected section
- display toast

Never unexpectedly navigate away.

---

# 5. Defaults

BK App prefers intelligent defaults.

---

Users should not answer questions that the application already knows.

Examples

Configuration Status

↓

Calculated automatically

---

Bonus Position

↓

First available position

---

Search

↓

Hidden for very small collections

---

Question Grid

↓

Generated from Question Count

---

Never ask for redundant confirmation.

---

# 6. Progressive Disclosure

Display only relevant controls.

---

Example

Reward Mode

↓

Everyone

↓

Show

Simple Reward Editor

Hide

Position Editor

---

Reward Mode

↓

By Positions

↓

Show

Position Editor

Hide

Simple Reward Editor

---

Users should never see inactive configuration.

---

# 7. Collections

Collections should be edited inline.

Preferred

```
+ Add Reward

↓

Reward Card appears

↓

User edits immediately
```

Avoid

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

Inline editing is faster.

---

# 8. Navigation

Navigation should remain stable.

Users should always know

- where they are
- what section is active
- what entity is open

Avoid unexpected navigation.

---

Changing one field must never

- switch sections
- close cards
- reset scroll

---

# 9. Confirmation

Confirmation dialogs exist only for destructive actions.

Required

Delete

Discard Changes

Reset

Dangerous Operations

---

Never confirm

Open

Save

Duplicate

Edit

Filtering

Search

---

# 10. Feedback

Every user action should produce feedback.

Examples

Save

↓

Toast

Created

↓

Toast

Deleted

↓

Toast

Copied

↓

Toast

---

Feedback should be immediate.

Avoid silent success.

---

# 11. Search

Search is contextual.

If the user has only a few entities,

search creates noise.

Recommended

1–3 entities

↓

Hide Search

---

4+ entities

↓

Show Search

---

Search should filter instantly.

Avoid explicit Search buttons.

---

# 12. Empty States

Every empty collection requires an Empty State.

Contains

- icon
- explanation
- CTA

Never leave users staring at whitespace.

---

# 13. Loading

Loading should preserve layout.

Preferred

Skeletons

Placeholder Cards

Loading Rows

Avoid

Jumping layouts.

---

# 14. Errors

Errors should be actionable.

Bad

```
500

Unknown Error
```

Good

```
Unable to load Quiz Configurations.

Retry

Back
```

---

# 15. Editing Collections

Collections should never feel like spreadsheets.

Preferred

Cards

↓

Inline Editing

↓

Quick Add

↓

Quick Delete

Avoid giant editable tables.

---

# 16. Smart Components

Components should react to context.

Examples

Question Count changed

↓

Question Grid rebuilt

---

Bonus deleted

↓

Question loses Bonus indicator

---

Reward removed

↓

Summary updated

Everything should remain synchronized.

---

# 17. Primary Actions

Every page should expose one obvious primary action.

Examples

Create Configuration

Save Changes

Create Quiz

Publish

Everything else becomes secondary.

---

# 18. Secondary Actions

Secondary actions should never compete visually with the primary action.

Examples

Duplicate

Reset

Export

Delete

Delete is always visually isolated.

---

# 19. User Orientation

Every editor page should answer four questions immediately.

Where am I?

What am I editing?

What remains unfinished?

How do I save?

If one of these questions cannot be answered in under five seconds, the page should be redesigned.

---

# 20. UX Checklist

Every new page should satisfy the following.

Navigation always available

☐

One primary CTA

☐

Validation explains problems

☐

Save is predictable

☐

Search only when useful

☐

Collections edited inline

☐

Preview updates immediately

☐

No unnecessary modal dialogs

☐

Automatic defaults

☐

Context always visible

☐

Empty State implemented

☐

Loading State implemented

☐

Error State implemented

☐

Page feels consistent with existing BK App screens

☐

---

# Golden Principle

BK App values clarity over cleverness.

Whenever there are two possible interactions,

prefer the one that requires less thinking from the user.

Consistency is a feature.
