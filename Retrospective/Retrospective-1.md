# RETROSPECTIVE N.1 (Team 17)

The retrospective should include _at least_ the following
sections:

- [process measures](#process-measures)
- [quality measures](#quality-measures)
- [general assessment](#assessment)

## PROCESS MEASURES

### Macro statistics

- Number of stories committed vs. done

  Stories committed: 4 vs. Stories done: 4

- Total points committed vs. done

  Total points committed: 15 vs. total points committed: 15

- Nr of hours planned vs. spent (as a team)

  Planned hours: 96h vs. hours spent: 97h

**Remember** a story is done ONLY if it fits the Definition of Done:

- Unit Tests passing: 47
- Code review completed: 11h 55m
- Code present on VCS
- End-to-End tests performed : 21

> Please refine your DoD if required (you cannot remove items!)

### Detailed statistics

| Story         | # Tasks | Points | Hours est. | Hours actual |
| ------------- | ------- | ------ | ---------- | ------------ |
| UNCATEGORIZED | 14      |        | 36h 30m    | 37h          |
| #01           | 11      | 5      | 20h        | 25h 45m      |
| #02           | 7       | 3      | 10h 30m    | 11h 15m      |
| #03           | 8       | 2      | 12h        | 11h          |
| #04           | 8       | 5      | 17h        | 12h          |

> story `Uncategorized` is for technical tasks, leave out story points (not applicable in this case)

- Hours per task average, standard deviation (estimate and actual)

|            | Mean | StDev  |
| ---------- | ---- | ------ |
| Estimation | 2.05 | 2.2273 |
| Actual     | 2.11 | 2.2294 |

- Total estimation error ratio: sum of total hours spent / sum of total hours effort - 1

  $$\frac{\sum_i spent_{task_i}}{\sum_i estimation_{task_i}} - 1$$
  = 0.0264

- Absolute relative task estimation error: sum( abs( spent-task-i / estimation-task-i - 1))/n

  $$\frac{1}{n}\sum_i^n \left| \frac{spent_{task_i}}{estimation_task_i}-1 \right| $$
  = 0.2989

## QUALITY MEASURES

- Unit Testing:
  - Total hours estimated: 4h
  - Total hours spent: 5h
  - Nr of automated unit test cases: 53
  - Coverage: 96.15%
- E2E testing:
  - Total hours estimated: 9h 30m
  - Total hours spent: 8h
  - Nr of test cases: 15
- Code review
  - Total hours estimated: 15h
  - Total hours spent: 13h 5m

## ASSESSMENT

- What did go wrong in the sprint?

- What caused your errors in estimation (if any)?

- What lessons did you learn (both positive and negative) in this sprint?

- Which improvement goals set in the previous retrospective were you able to achieve?
- Which ones you were not able to achieve? Why?

- Improvement goals for the next sprint and how to achieve them (technical tasks, team coordination, etc.)

  > Propose one or two

- One thing you are proud of as a Team!!
