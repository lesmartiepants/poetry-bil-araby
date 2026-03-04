---
name: design-sprint
description: Launches a multi-agent design sprint with team structure template, parallel agent spawning, and phase-based execution.
user_invocable: true
---

# Design Sprint

Launch a coordinated multi-agent design sprint with parallel execution and phased delivery.

## Invocation

When the user runs `/design-sprint`, execute the following workflow.

## Phase 0: Setup & Configuration

1. **Read the design-sprint-lead playbook** (`.claude/agents/design-sprint-lead.md`) to understand the full coordination model.

2. **Ask the user for sprint parameters:**
   - How many designs to generate? (default: 10)
   - What directories or output locations? (default: project root)
   - What review level? (`light`, `standard`, `thorough`) (default: `standard`)
   - Any specific design constraints or themes?
   - Branch name for the sprint? (default: `feature/design-sprint-<timestamp>`)

3. **Validate the environment:**
   - Confirm working directory and git status
   - Check for required config files and templates
   - Ensure clean git state or create feature branch

## Phase 1: Team Creation & Task Assignment

1. **Create the team** using TeamCreate with the following roles:
   - `design-sprint-lead` -- Coordinates the sprint (you)
   - `design-generator` -- One per batch of designs
   - `design-reviewer` -- One per batch for quality review

2. **Create tasks** for each design batch:
   - Split total designs into parallel batches (e.g., 10 designs = 2 batches of 5)
   - Create generation tasks with specific design IDs per batch
   - Create review tasks blocked by their corresponding generation tasks

## Phase 2: Parallel Design Generation

1. **Spawn design-generator agents** in parallel (one per batch):
   - Each generator receives its batch of design specs
   - Generators work independently and concurrently
   - Each generator commits its batch when complete

2. **Monitor progress:**
   - Track task completion via TaskList
   - Handle any failures or blockers
   - Rebalance batches if a generator finishes early

## Phase 3: Integration & Review

1. **Integration check:**
   - Verify all designs generated successfully
   - Check for conflicts between parallel outputs
   - Run any integration tests or build verification

2. **Spawn design-reviewer agents** in parallel (one per batch):
   - Each reviewer evaluates its batch against quality signals
   - Reviewers fix issues directly when possible
   - Reviewers flag issues requiring human input

## Phase 4: Verification & Delivery

1. **Collect results from all reviewers:**
   - Aggregate pass/fail status per design
   - List any issues that need manual attention
   - Generate sprint summary report

2. **Commit and push cadence:**
   - Stage all reviewed and approved designs
   - Create conventional commit: `feat(design): complete design sprint (<N> designs)`
   - Push to feature branch
   - Optionally create PR if user requested

3. **Report final status:**
   - Total designs generated
   - Designs passing review
   - Issues flagged for follow-up
   - Branch and commit information
