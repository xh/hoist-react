# Hoist React v78 Upgrade Notes

> **From:** v77.x → v78.0.0 | **Released:** 2025-11-21 | **Difficulty:** 🎉 TRIVIAL

## Overview

Hoist React v78 is a small release with only one breaking change to grid column state management.

The most significant app-level impact is:

- **`GridModel.setColumnState` behavior change** — the method now replaces column state wholesale
  instead of patching. Apps relying on the previous patching behavior must switch to
  `GridModel.applyColumnStateChanges`.

## Prerequisites

Before starting, ensure:

- [ ] Running hoist-react v77.x

## Upgrade Steps

### 1. Update `package.json`

Bump hoist-react to v78.

**File:** `package.json`

Before:
```json
"@xh/hoist": "~77.1.0"
```

After:
```json
"@xh/hoist": "~78.0.0"
```

### 2. Update `GridModel.setColumnState` Usage

`GridModel.setColumnState` no longer patches existing column state — it replaces it wholesale.
If your app passes a partial column state object expecting it to be merged with existing state,
switch to `GridModel.applyColumnStateChanges` instead.

**Find affected files:**
```bash
grep -r "setColumnState" client-app/src/
```

Before:
```typescript
// Partial update — this no longer works as a patch
gridModel.setColumnState({visible: ['name', 'status']});
```

After:
```typescript
// Use applyColumnStateChanges for partial updates
gridModel.applyColumnStateChanges({visible: ['name', 'status']});
```

If your app always passes a complete column state object to `setColumnState`, no change is needed.

Note: `GridModel.cleanColumnState` is now private. This is not expected to impact applications.

## Verification Checklist

After completing all steps:

- [ ] `yarn install` completes without errors
- [ ] `npx tsc --noEmit` passes
- [ ] Application loads without console errors
- [ ] Grids with persisted or programmatically managed column state function correctly
- [ ] Column visibility, ordering, and sizing work as expected

## Reference

- [Toolbox on GitHub](https://github.com/xh/toolbox) — canonical example of a Hoist app
