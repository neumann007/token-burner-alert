## Description

- What problem does this PR solve?
- What approach was taken?
- Any risks, tradeoffs, or follow-up work?

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Performance improvement
- [ ] Documentation update
- [ ] Build/CI change
- [ ] Chore/maintenance

## Quality Assurance Checklist

### Extension (TypeScript)

- [ ] `npm run --workspace token-burner-alert build` passes.
- [ ] Token counting still runs off the UI thread (worker-based).
- [ ] TypeScript strict typing maintained (no `any` introduced without justification).
- [ ] VS Code activation path validated.
- [ ] Manual smoke test completed in VS Code (open file, edit, verify extension behavior).

### Backend (Python)

- [ ] Unit/integration tests added or updated for behavior changes.
- [ ] Lint/format checks pass.
- [ ] Type hints updated for changed interfaces.
- [ ] API/schema changes documented and backward-compatibility reviewed.
- [ ] Error handling and logging paths validated.

## Screenshots / Screen Recordings

- Attach screenshots or a short recording for UI/UX-impacting changes.
- If not applicable, state: `N/A`.

## Testing Instructions

1. Check out this branch locally.
2. Install dependencies for affected packages/services.
3. Run build/test commands listed above.
4. Execute manual validation steps for changed areas.
5. Confirm expected behavior and include observed results in this PR.
