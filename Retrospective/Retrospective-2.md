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
## ASSESSMENT

### What went wrong in the sprint?
- We developed slower than expected, so many major parts were completed in the last 2–3 days.
- Some frontend tasks (e.g., responsiveness on one page) were clearly overestimated out of fear of underestimating.
- Even though underestimations were small (15–30 minutes), the overall timing still ended up being “last minute,” increasing stress and risk.

### What caused your estimation errors (if any)?
- We shifted from underestimation to “safety padding,” especially on some frontend tasks.
- We didn’t manage flow during the sprint well enough, so tasks piled up toward the end regardless of accurate estimates.

### What lessons did you learn (both positive and negative) this sprint?

**Positive:**
- We can deliver full functionality on time, even under pressure.
- Git branch management and coordination around merging were handled very well.
- We no longer miss task details/requirements like before — our planning/spec clarity has improved.

**Negative:**
- Good estimates and correct requirements are not enough if execution is clustered at the end of the sprint.
- Overestimating out of fear is also a problem — it hides real velocity and creates a false sense of safety.

### Which improvement goals from the previous retrospective were achieved?
- **Goal 2 – Avoid missed frontend functionalities:** Achieved. We did not miss task details/requirements this time.
- **Goal 3 – Better git branch management:** Achieved. Branch management was strong, and we avoided merge conflicts.
- **Goal 1 – Improve estimation for risky tasks:** Partially achieved. Estimates were closer, and we had no major surprises, but fear-based overestimation appeared in some cases.

### Which goals were not achieved? Why?
- We still haven’t fully improved estimation quality: instead of underestimation, we shifted to overestimation in some areas.
- We didn’t solve the “last-minute delivery” issue: work still accumulated near the end despite better planning, likely due to pacing and flow rather than scope or tooling.

### Improvement goals for the next sprint and how to achieve them

**Goal 1 – Smooth execution across the sprint (avoid last-minute crunch).**
- Ensure that by mid-sprint, at least 60–70% of critical stories are “In Review” or “Done.”
- Break large tasks into smaller, earlier-deliverable chunks.
- Add a quick daily/bi-daily check: *“Which tasks are at risk of slipping into the last 2–3 days?”* and act early.

**Goal 2 – Calibrate estimations (reduce fear-based overestimation).**
- After the sprint, review 3–5 tasks (Estimate vs Actual) and note a one-line reason (e.g., “fear padding,” “unexpected UI bug”).
- Add a simple confidence level to each task (Low/Medium/High).  
  Low-confidence tasks may need a spike or more detailed breakdown instead of padded estimates.

### One thing you are proud of as a team
Despite slower execution, we delivered all planned functionality on time, maintained excellent git discipline, and missed no requirements — showing strong growth in planning and coordination, even if sprint pacing still needs improvement.
