# RETROSPECTIVE N.3 (Team 17)

The retrospective should include _at least_ the following
sections:

- [process measures](#process-measures)
- [quality measures](#quality-measures)
- [general assessment](#assessment)

## PROCESS MEASURES

### Macro statistics

- Number of stories committed vs done :

  Stories committed: 5 vs. Stories done: 5

- Total points committed vs done :

  Total points committed: 34 vs. total points committed: 34

- Nr of hours planned vs spent (as a team) :

  Planned hours: 98h + 4h from tasks added during the sprint vs. hours spent: 98h 15m

**Remember** a story is done ONLY if it fits the Definition of Done:

- Unit Tests passing:
- Code review completed: 17h 30m
- Code present on VCS
- End-to-End tests performed

> Please refine your DoD

### Detailed statistics

| Story | # Tasks | Points | Hours est. | Hours actual |
| ----- | ------- | ------ | ---------- | ------------ |
| _#0_  | 17      | -      | 33h 45m    | 34h 45m      |
| #08   | 3       | 2      | 6h         | 4h 40m       |
| #24   | 11      | 13     | 18h 30m    | 19h 25m      |
| #25   | 8       | 3      | 11h        | 10h 20m      |
| #26   | 9       | 8      | 15h 15m    | 14h 55m      |
| #27   | 10      | 8      | 17h 30m    | 14h 10m      |

> place technical tasks corresponding to story `#0` and leave out story points (not applicable in this case)

- Hours per task (average, standard deviation)

|            | Mean | StDev  |
| ---------- | ---- | ------ |
| Estimation | 1.76 | 2.1729 |
| Actual     | 1.70 | 2.0093 |

- Total task estimation error ratio: sum of total hours estimation / sum of total hours spent -1

  = - 0.0367

- Absolute relative task estimation error: sum( abs( spent-task-i / estimation-task-i - 1))/n

  = 0.1557

## QUALITY MEASURES

- Unit Testing:
  - Total hours estimated
  - Total hours spent
  - Nr of automated unit test cases
  - Coverage (if available)
- Integration testing:
  - Total hours estimated
  - Total hours spent
- E2E testing:
  - Total hours estimated
  - Total hours spent
- Code review:
  - Total hours estimated: 25h 30m
  - Total hours spent: 17h 30m
- Technical Debt management:
  - Strategy adopted: Take the last day of work to focus or resolving code smells (as stated in SONAR_TD.md)
  - Total hours estimated estimated at sprint planning -> 2h
  - Total hours spent -> 3h

## ASSESSMENT

- What caused your errors in estimation (if any)?

- What lessons did you learn (both positive and negative) in this sprint?

- Which improvement goals set in the previous retrospective were you able to achieve?
- Which ones you were not able to achieve? Why?

- Improvement goals for the next sprint and how to achieve them (technical tasks, team coordination, etc.)

> Propose one or two

- One thing you are proud of as a Team!!
