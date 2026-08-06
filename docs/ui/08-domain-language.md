# BK App Domain Language

# 08-domain-language.md

> Version: 1.0
>
> Defines the canonical business vocabulary used throughout BK App.
>
> Every UI, API, backend service and documentation MUST use the terminology defined here.
>
> New terms should not be introduced if an existing concept already exists.

---

# 1. Purpose

A consistent UI starts with a consistent vocabulary.

The same concept should always have the same name.

Never create synonyms.

---

# 2. Core Domain Model

```
Project

├── Resources
├── Game Configurations
├── Quiz Configurations
├── Games
├── Quizzes
└── Future Modules
```

Everything belongs to a Project.

---

# 3. Project

Definition

The highest level organizational entity.

Contains

Resources

Configurations

Games

Quizzes

Permissions

Users

A Project owns everything.

Objects never exist outside a Project.

---

# 4. Configuration

Definition

A reusable template that defines behaviour.

Examples

Game Configuration

Quiz Configuration

Future Tournament Configuration

A Configuration is never executed.

It only describes rules.

---

Contains

Metadata

↓

Rules

↓

Overrides

↓

Templates

↓

Validation State

---

Configuration Lifecycle

Draft

↓

Ready

↓

Archived (future)

Status should always be derived automatically whenever possible.

---

# 5. Quiz

Definition

A playable event created from a Quiz Configuration.

Contains

Questions

Host

Players

Answers

Results

Quiz Configuration

A Quiz references a Configuration.

It never duplicates configuration logic.

---

# 6. Game

Definition

A playable event created from a Game Configuration.

Contains

Board

Moves

Players

Rewards

Results

Configuration

---

# 7. Question

Definition

One playable unit inside a Quiz.

Contains

Index

Text

Correct Answer

Bonus Rules

Overrides

Metadata

Question numbering starts at 1.

Never 0.

---

# 8. Reward

Definition

Something granted to a player.

A Reward always contains

Resource

↓

Amount

Optionally

Condition

Position

Probability

Source

---

Reward is generic.

Never create

QuizReward

GameReward

EventReward

Reuse Reward.

---

# 9. Resource

Definition

A thing that can be granted.

Examples

Gold

EKR

Coins

Experience

Honor

Items (future)

Resources are project-level entities.

Rewards reference Resources.

---

# 10. Reward Mode

Defines how rewards are distributed.

Current modes

All Accepted

By Position

Future

Random

Percentage

Weighted

Do not introduce page-specific reward systems.

---

# 11. Bonus Rule

Definition

An additional reward attached to a Question.

Contains

Question

↓

Position

↓

Reward

Bonus Rules never replace Default Rewards.

They extend them.

---

# 12. Override

Definition

A rule replacing default behaviour.

Examples

Reward Override

Message Override

Question Override

Override always wins over Default Rule.

---

# 13. Rule

Definition

A reusable piece of behaviour.

Examples

Reward Rule

Validation Rule

Future Rules

Rules describe behaviour.

Overrides modify behaviour.

---

# 14. Message Template

Definition

A reusable text template.

Contains

Template

Variables

Preview

Overrides

Every Message Template must provide Live Preview.

---

# 15. Variable

Definition

Placeholder replaced during runtime.

Example

```
{questionNumber}
```

Variables are never hardcoded.

They always belong to a Message Template.

---

# 16. Validation

Definition

The process of verifying Configuration completeness.

Validation does not modify data.

Validation produces

Issues

Warnings

Status

Validation never blocks navigation.

---

# 17. Metadata

Definition

Information describing an entity.

Examples

Created By

Updated By

Created At

Updated At

Status

Metadata is never mixed with business rules.

---

# 18. Status

Definition

Represents lifecycle state.

Current statuses

Draft

Ready

Future

Archived

Deleted

Status should represent state.

Never permissions.

---

# 19. Collection

Definition

A group of similar entities.

Examples

Reward Collection

Bonus Collection

Override Collection

Question Collection

Collections should always be editable inline.

---

# 20. Summary

Definition

A compact overview.

Summary never contains editing controls.

Summary should answer

What is this?

How big is it?

Is it ready?

---

# 21. Canonical Naming Rules

Always use

Configuration

Never

Preset

Template

Setup

unless the meaning is different.

---

Always use

Reward

Never

Prize

Award

Gift

---

Always use

Question

Never

Task

Problem

Entry

---

Always use

Resource

Never

Currency

Value

Money

unless referring to a specific resource type.

---

Always use

Override

Never

Replacement

Overwrite

Patch

---

Always use

Message Template

Never

Text

Message

String

---

# 22. Domain Relationships

```
Project

↓

Configuration

↓

Quiz

↓

Question

↓

Bonus Rule

↓

Reward

↓

Resource
```

This hierarchy should remain consistent across backend, frontend and documentation.

---

# 23. Evolution Rules

New domain entities should extend the existing vocabulary.

Do not introduce parallel concepts.

Example

Tournament Reward

↓

Reward

Condition

Tournament

NOT

TournamentReward

---

# 24. Domain Checklist

Before introducing a new entity ask

Does this concept already exist?

↓

YES

Reuse it.

↓

NO

Can an existing concept be extended?

↓

YES

Extend it.

↓

NO

Document the new entity inside this file.

---

# Golden Principle

One concept.

↓

One name.

↓

Everywhere.

The same term should mean the same thing in:

UI

API

Database

Backend

Frontend

Documentation

Tests
