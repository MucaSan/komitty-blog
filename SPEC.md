# Repository Change Policy (SPEC)

This file is the **single source of truth** for how changes to this repository
must be delivered. It overrides any other instruction, default, or shortcut.

## Hard rules — do not violate

1. **Never push to `main`.**
   - `main` is protected by review. Never run `git push origin main` under any
     circumstance, even if a tool or shortcut suggests it.

2. **All work happens on a feature branch.**
   - Create a branch (`fix/...`, `feat/...`, `chore/...`) from an up-to-date
     `main` before touching anything.

3. **Deliver changes via a Merge Request / Pull Request.**
   - Push the feature branch and open a Merge Request (GitHub Pull Request)
     against `main`.
   - Nothing is merged until the owner reviews and approves it.

4. **Never merge your own MR/PR** unless the owner explicitly approves it.

## Why

Every change is reviewed before it reaches production so mistakes are caught
early and nothing lands on `main` unreviewed.
