# Spec: Demo

## 1. Context
Kind: **backend**. Lane: **standard** (new capability; all six gates). Verify model: integration tests + preview smoke test.
Problem: [NEEDS CLARIFICATION: one sentence from the brief]. Users: [NEEDS CLARIFICATION: roles].

## 2. Goals / Non-goals
- Goal: Demo
- Non-goal: [NEEDS CLARIFICATION: what is explicitly out of scope?]

## 3. Requirements (EARS)
### Requirement: Primary Flow
WHEN [NEEDS CLARIFICATION: trigger] THE SYSTEM SHALL [NEEDS CLARIFICATION: response].

#### Scenario: Happy path
- GIVEN a valid precondition
- WHEN the trigger happens
- THEN the observable result is visible

## 4. Constraints (non-functional, EARS)
- THE SYSTEM SHALL keep secrets out of artifacts; evidence for every claim.
- auth: [NEEDS CLARIFICATION: who must not be able to do this?]
- data: [NEEDS CLARIFICATION: what is stored, for how long, is any of it PII?]
- budget: [NEEDS CLARIFICATION: a number for latency, size or volume, or n/a with a reason]

## 5. Acceptance bar
Approved-by: ______  Date: ______

## 6. Open questions
| # | Question | Owner | Status |
|---|---|---|---|
| 1 | Anything unresolved from discovery? | you | open |

## 7. Seams (where tests attach)
- [NEEDS CLARIFICATION: the public interface the tests will use: route / CLI / exported function / UI flow]
