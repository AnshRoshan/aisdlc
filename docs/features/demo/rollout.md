# Rollout: Demo

## Strategy
Flag <FLAG_NAME> · canary 5% → 25% → 100% · bake 30 min per step.

## Preconditions
- G4 green

## Rollback
1. Flip <FLAG_NAME> off.
2. Revert the release tag.
3. Run the smoke suite.
Owner: on-call. Max time to rollback: 10 minutes.

## Comms
Changelog · status page

Approved-by: ______  Date: ______
