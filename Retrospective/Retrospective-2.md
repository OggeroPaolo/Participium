# RETROSPECTIVE N.1 (Team 17)

The retrospective should include _at least_ the following
sections:

- [process measures](#process-measures)
- [quality measures](#quality-measures)
- [general assessment](#assessment)

## PROCESS MEASURES

### Macro statistics

- Number of stories committed vs. done

  Stories committed: 3 vs. Stories done: 3

- Total points committed vs. done

  Total points committed: 26 vs. total points committed: 26

- Nr of hours planned vs. spent (as a team)

  Planned hours: 95h 30m vs. hours spent: 97h 20m

**Remember** a story is done ONLY if it fits the Definition of Done:

- Unit Tests passing: 150
- Code review completed: 13h 20m
- Code present on VCS
- End-to-End tests performed : 54

> Please refine your DoD if required (you cannot remove items!)

### Detailed statistics

| Story         | # Tasks | Points | Hours est. | Hours actual |
| ------------- | ------- | ------ | ---------- | ------------ |
| UNCATEGORIZED | 12      |        | 29h 45m    | 30h 20m      |
| #05           | 16      | 8      | 35h        | 38h 50m      |
| #06           | 12      | 5      | 25h 45m    | 23h 50m      |
| #07           | 2       | 13     | 5h         | 4h 20m       |

> story `Uncategorized` is for technical tasks, leave out story points (not applicable in this case)

- Hours per task average, standard deviation (estimate and actual)

|            | Mean | StDev  |
| ---------- | ---- | ------ |
| Estimation | 2.08 | 2.2348 |
| Actual     | 2.12 | 2.3530 |

- Total estimation error ratio: sum of total hours spent / sum of total hours effort - 1

  $$\frac{\sum_i spent_{task_i}}{\sum_i estimation_{task_i}} - 1$$
  = 0.0192

- Absolute relative task estimation error: sum( abs( spent-task-i / estimation-task-i - 1))/n

  $$\frac{1}{n}\sum_i^n \left| \frac{spent_{task_i}}{estimation_task_i}-1 \right| $$
  = 0.1546

## QUALITY MEASURES

- Unit Testing:
  - Total hours estimated: 8.30h
  - Total hours spent: 10h
  - Nr of automated unit test cases: 120
  - Coverage:  98.80%
- E2E testing:
  - Total hours estimated: 5h
  - Total hours spent: 5h
  - Nr of test cases: 54

- Code review:
  - Total hours estimated: 15h
  - Total hours spent: 13h 20m

## ASSESSMENT

### What went wrong in the sprint?
- We underestimated several backend and frontend tasks.
- Cloudflare Images integration took much longer than expected and caused many errors.
- We missed some API needs for the frontend, which led to extra work.
- A bug was found at the last moment, causing additional work close to the deadline.

### What caused the estimation errors (if any)?
- We missed parts of the scope during estimation (both BE & FE).
- We didn’t anticipate that Cloudflare integrations would be so time-consuming and error-prone.
- Some frontend estimations were not exhaustive enough.

### What lessons did you learn (both positive and negative) this sprint?

**Positive:**
- We managed branches much more effectively than in the previous sprint.

**Negative:**
- Risky areas like frontend integrations need more detailed thinking upfront.
- We need to capture hidden frontend functionalities during estimation, not during development.

### Which improvement goals from the previous retrospective were achieved?
- Better Git branch management to avoid merge conflicts.

### Which goals were not achieved? Why?
- Avoiding missed frontend functionalities and thinking more about use cases and designs.  
  We didn’t spend enough time during the design phase, leading to underestimation.

### Improvement goals for the next sprint and how to achieve them
**Goal 1:** Avoid missing frontend functionalities by spending more time on use-case analysis and reviewing designs thoroughly.  
**Goal 2:** Improve frontend test planning and design.

### One thing you are proud of as a team
Despite estimation issues, we managed to handle the challenges effectively during the last days of the sprint.
we kept pushing, collaborated, and delivered key parts 
