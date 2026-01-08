# RETROSPECTIVE N.4 (Team 17)

The retrospective should include _at least_ the following
sections:

- [process measures](#process-measures)
- [quality measures](#quality-measures)
- [general assessment](#assessment)

## PROCESS MEASURES

### Macro statistics

- Number of stories committed vs done :

  Stories committed: 6 vs. Stories done: 6

- Total points committed vs done :

  Total points committed: 36 vs. total points committed: 36

- Nr of hours planned vs spent (as a team) :

  Planned hours: 97h 30m + 1h 15m from tasks added during the sprint vs. hours spent: 100h 10m

**Remember** a story is done ONLY if it fits the Definition of Done:

- Unit Tests passing:: 348
- Code review completed: 18h 15m
- Code present on VCS
- End-to-End tests performed: 113

> Please refine your DoD

### Detailed statistics

| Story | # Tasks | Points | Hours est. | Hours actual |
| ----- | ------- | ------ | ---------- | ------------ |
| _#0_  | 11      | -      | 28h 15m    | 27h 45m      |
| #28   | 3       | 2      | 2h 5m      | 2h 25m       |
| #15   | 3       | 2      | 2h 15m     | 2h 20m       |
| #09   | 9       | 3      | 12h 10m    | 11h 10m      |
| #30   | 3       | 3      | 3h 30m     | 4h 15m       |
| #10   | 12      | 5      | 20h 30m    | 21h 50m      |
| #11   | 18      | 21     | 30h        | 30h 25m      |

> place technical tasks corresponding to story `#0` and leave out story points (not applicable in this case)

- Hours per task (average, standard deviation)

|            | Mean | StDev  |
| ---------- | ---- | ------ |
| Estimation | 1.64 | 2.0217 |
| Actual     | 1.66 | 2.0283 |

- Total task estimation error ratio: sum of total hours estimation / sum of total hours spent -1

  = 0.0091

- Absolute relative task estimation error: sum( abs( spent-task-i / estimation-task-i - 1))/n

  = 0.1672

## QUALITY MEASURES

- Unit Testing:
  - Total hours estimated: 2h
  - Total hours spent: 2h 30m
  - Nr of automated unit test cases:348
  - Coverage: 98.94%
- Integration testing:
  - Total hours estimated: 7h
  - Total hours spent: 7h
- E2E testing:
  - Total hours estimated: 4h
  - Total hours spent: 3h 45m
- Code review:
  - Total hours estimated: 19h
  - Total hours spent: 18h 15m
- Technical Debt management:
  - Strategy adopted: Take the last day of work to focus on resolving code smells (as stated in SONAR_TD.md) and leverage on sonar plugin to reduce them while adding features
  - Total hours estimated estimated at sprint planning -> 2h
  - Total hours spent -> 2h

## ASSESSMENT

#### What caused your errors in estimation (if any)?

- Overall, our estimates were more realistic than in the previous sprint, but we still had slight overestimations on some frontend tasks (e.g., responsiveness tweaks), mostly due to uncertainty about UI edge cases
- For a few tasks, we underestimated the time needed to polish and fix small bugs after the main implementation was “done.”
- We did not fully account for context switching and code review overhead, so tasks that looked small on paper sometimes ended up slipping toward the end of the sprint.

#### What lessons did you learn (both positive and negative) in this sprint?

**Positive:**

- Our calibration of estimates improved compared to the previous sprint – there were fewer major surprises.
- The quality of planning and specifications remained stable: we are no longer missing major requirements, although some small tasks still emerge during development.
- We can consistently deliver working features, even when some work drifts into the last days.

**Negative:**

- Improving estimates alone is not enough; our pacing still pushes too many implementations into the final 2–3 days.
- Final integration and polishing take more time than we intuitively expect, and we still tend to treat them as “small” tasks.

#### Which improvement goals set in the previous retrospective were you able to achieve?

- **Goal 2 – Calibrate estimations (reduce fear-based overestimation):**
  Partially achieved. Our estimates, especially on frontend tasks like responsiveness, were closer to reality and less “fear padded” than before, though some overestimation still remains.

- **Goal 3 – Youtrack logging right after working on a task:**
  Partially achieved. Frequent reminders improved logging behavior compared to the previous sprint, but some logs were still missing, so there is room for further improvement

#### Which ones you were not able to achieve? Why?

- **Goal 1 – Smooth execution across the sprint (avoid last-minute crunch):**
  Not achieved. We again had a concentration of implementations and finishing touches in the last 2–3 days. On the positive side, we did apply bi-daily checks and broke large tasks into smaller pieces—but the pacing still needs work.

#### Improvement goals for the next sprint and how to achieve them (technical tasks, team coordination, etc.)

- **Goal 1 – Smooth execution across the sprint (avoid last-minute crunch):**
- Ensure that by mid-sprint, at least 60–70% of critical stories are “To verify” or “Done.”
- Continuing with daily/bi-daily check
- Reassign tasks as needed to balance workload

- **Goal 2 – Better management of Technical Debt:**
- Issues were 98 at the start (sprint 1/mid sprint 2), peaked at 215, and were reduced to 156 by the end of sprint 3, with no code smells above “medium” severity. This is progress, but we can do better.
- We aim to leverage the Sonar plugin continuously while developing new features to avoid increasing the issue count unnecessarily and to improve code quality without inflating TD-specific hours.

- **Goal 3 – Youtrack logging right after working on a task:**
- Maintain consistent logging immediately after completing or progressing on a task, to keep the team aligned and the board up to date.

#### One thing you are proud of as a Team!!

Even though we still struggled with last-minute implementations, we slightly improved our estimation quality compared to the previous sprint and kept our planning, coordination, and delivery discipline strong. We’re showing that we can learn from each sprint, adjust our approach, and keep delivering working features while gradually tightening our process.
