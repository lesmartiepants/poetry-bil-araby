# Documentation Index

This document provides a clear guide to all documentation in the Poetry Bil-Araby repository.

---

## Quick Start

New to the project? Start here:
1. **README.md** - Project overview, setup, and basic usage
2. **.github/TESTING_STRATEGY.md** - Understanding the test infrastructure
3. **e2e/README.md** - Running E2E tests locally

---

## Documentation Structure

### Core Project Documentation

**Location:** Repository root

- **README.md** - Main project documentation
  - Project overview and features
  - Setup and installation instructions
  - Usage guide
  - Deployment guide (Vercel)
  - Test commands reference
  - TODO list

### GitHub-Specific Documentation

**Location:** `.github/`

- **TESTING_STRATEGY.md** - Authoritative testing documentation (387 lines)
  - Test pyramid architecture
  - All testing layers (Unit, E2E, UI/UX)
  - CI/CD pipeline integration
  - Test configuration files
  - Agent integration
  - Testing best practices
  - Troubleshooting guide

- **CI_CD_GUIDE.md** - CI/CD operational reference (389 lines)
  - Pipeline overview and stages
  - Job details and durations
  - Parallel execution strategy
  - Performance optimizations
  - Viewing test results
  - Test failure workflow
  - Common commands
  - Quality gates

### Testing Documentation

**Location:** `e2e/`

- **README.md** - E2E testing guide
  - Test structure overview
  - Running E2E tests
  - Test configuration
  - CI integration
  - UI/UX agent information
  - Debugging failed tests
  - Writing new tests

### Technical Deep Dives

**Location:** `docs/`

- **CI_PERFORMANCE_OPTIMIZATION.md** - Complete performance optimization journey
  - 90% CI time reduction (30+ min → 3 min)
  - Root cause analysis
  - Optimization implementation details
  - Performance metrics
  - Configuration strategies
  - Best practices and learnings
  - Future optimization opportunities

### Agent Documentation

**Location:** `.claude/agents/`

Specialized AI agents for development tasks:

- **git-workflow-manager.md** - Git workflow and commit management
- **docs-sync-reviewer.md** - Documentation synchronization after code changes
- **test-orchestrator.md** - Test coordination and reporting
- **test-coverage-reviewer.md** - Coverage analysis and recommendations
- **ui-ux-reviewer.md** - UI/UX quality review and testing
- **ci-test-guardian.md** - CI/CD test monitoring
- **test-suite-maintainer.md** - Test suite health and maintenance

---

## Documentation by Topic

### Getting Started
- README.md - Start here for setup and basic usage

### Testing
- `.github/TESTING_STRATEGY.md` - Comprehensive testing strategy
- `e2e/README.md` - E2E testing guide
- README.md (Testing section) - Quick test command reference

### CI/CD
- `.github/CI_CD_GUIDE.md` - Complete CI/CD operational guide
- `docs/CI_PERFORMANCE_OPTIMIZATION.md` - Performance optimization details
- README.md (Deployment section) - Deployment setup

### Development Workflow
- `.claude/agents/git-workflow-manager.md` - Git best practices
- `.claude/agents/docs-sync-reviewer.md` - Documentation workflow

### Quality Assurance
- `.claude/agents/test-orchestrator.md` - Test coordination
- `.claude/agents/ui-ux-reviewer.md` - UI/UX standards
- `.claude/agents/test-coverage-reviewer.md` - Coverage standards

---

## Documentation Status

### Current and Maintained
✅ README.md - Updated January 2026
✅ .github/TESTING_STRATEGY.md - Authoritative testing docs
✅ .github/CI_CD_GUIDE.md - Current CI/CD reference
✅ docs/CI_PERFORMANCE_OPTIMIZATION.md - Complete optimization history
✅ e2e/README.md - E2E testing guide
✅ All agent documentation - Active and current

### Archived Files

The following files have been consolidated into authoritative sources:

**Replaced by `.github/TESTING_STRATEGY.md`:**
- TESTING.md (basic overview - replaced by comprehensive strategy)
- TEST_SUMMARY.md (implementation summary - information integrated)
- E2E_INTEGRATION_SUMMARY.md (integration details - information integrated)

**Replaced by `.github/CI_CD_GUIDE.md`:**
- CI_CD_STRATEGY.md (early strategy - replaced by current guide)

**Replaced by `docs/CI_PERFORMANCE_OPTIMIZATION.md`:**
- CI_PERFORMANCE_PROFILE.md (initial analysis)
- CI_PERFORMANCE_FIX.md (detailed fix)
- CI_FIX_SUMMARY.md (quick summary)
- E2E_OPTIMIZATION_PLAN.md (E2E-specific plan)
- FINAL_PERFORMANCE_REPORT.md (final report)
- CI_PERFORMANCE_COMPARISON.txt (raw data)

All information from archived files has been consolidated and preserved in the current authoritative documentation.

---

## Finding Information

### Common Questions

**"How do I run tests?"**
→ README.md (Testing section) or `.github/TESTING_STRATEGY.md`

**"How does the CI/CD pipeline work?"**
→ `.github/CI_CD_GUIDE.md`

**"Why is CI so fast now?"**
→ `docs/CI_PERFORMANCE_OPTIMIZATION.md`

**"How do I write E2E tests?"**
→ `e2e/README.md`

**"What are the testing best practices?"**
→ `.github/TESTING_STRATEGY.md` (Testing Best Practices section)

**"How do I debug failing tests?"**
→ `.github/CI_CD_GUIDE.md` (Test Failure Workflow) or `e2e/README.md` (Debugging section)

**"What agents are available?"**
→ See Agent Documentation section above

---

## Contributing to Documentation

When adding or modifying documentation:

1. **Choose the right location:**
   - Root: User-facing project docs
   - `.github/`: GitHub/CI/CD specific docs
   - `e2e/`: E2E testing specific docs
   - `docs/`: Technical deep dives and historical documents

2. **Update this index** when adding new documentation files

3. **Keep it DRY:**
   - Avoid duplicating information
   - Link to authoritative sources
   - Consolidate when overlap occurs

4. **Maintain accuracy:**
   - Update docs when features change
   - Remove outdated information
   - Archive rather than delete (preserve history)

5. **Use the docs-sync-reviewer agent:**
   - Automatically reviews commits for documentation impact
   - Ensures docs stay synchronized with code
   - See `.claude/agents/docs-sync-reviewer.md`

---

## Documentation Principles

1. **Single Source of Truth:** Each topic has one authoritative document
2. **Clear Hierarchy:** Quick references link to comprehensive guides
3. **Progressive Disclosure:** Start simple, link to details
4. **Always Current:** Docs updated with code changes
5. **Accessible:** Clear navigation and search

---

**Last Updated:** January 7, 2026
**Maintained By:** Project team and docs-sync-reviewer agent
**Status:** Current and comprehensive
