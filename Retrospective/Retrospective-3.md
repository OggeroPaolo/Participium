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

- Unit Tests passing:: 220
- Code review completed: 17h 30m
- Code present on VCS
- End-to-End tests performed: 77

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
  - Total hours estimated: 3h
  - Total hours spent: 3h 30m
  - Nr of automated unit test cases:220
  - Coverage: 99.68%
- Integration testing:
  - Total hours estimated: 2h
  - Total hours spent: 2h 40m
- E2E testing:
  - Total hours estimated: 7h
  - Total hours spent: 7h
- Code review:
  - Total hours estimated: 25h 30m
  - Total hours spent: 17h 30m
- Technical Debt management:
  - Strategy adopted: Take the last day of work to focus or resolving code smells (as stated in SONAR_TD.md)
  - Total hours estimated estimated at sprint planning -> 2h
  - Total hours spent -> 3h

## ASSESSMENT

#### What caused your errors in estimation (if any)?
- Overall, our estimates were more realistic than in the previous sprint, but we still had slight overestimations on some frontend tasks (e.g., responsiveness tweaks), mostly due to uncertainty about UI edge cases
- For a few tasks, we underestimated the time needed to polish and fix small bugs after the main implementation was “done.”
- We still didn’t fully factor in the overhead of context switching and code reviews, so tasks that looked small on paper sometimes slipped toward the end of the sprint.

#### What lessons did you learn (both positive and negative) in this sprint?

**Positive:**
- Our calibration of estimates improved compared to the previous sprint – there were fewer big surprises.
- We see that our planning/spec quality is stable: we are not missing major requirements like we used to (but missing smaller tasks still happens).
- We can consistently deliver working features, even when some work drifts into the last days.

**Negative:**
- Improving estimates alone is not enough; our pacing still pushes too many implementations into the final 2–3 days.
- Final integration, testing, and polishing take more time than we intuitively expect, and we still tend to treat them as “small” tasks.
- We didn’t fully enforce mid-sprint checkpoints, so we lost the opportunity to re-balance workload earlier

#### Which improvement goals set in the previous retrospective were you able to achieve?

- **Goal 2 – Calibrate estimations (reduce fear-based overestimation):**
Partially achieved. Our estimates, especially on frontend tasks like responsiveness, were closer to reality and less “fear padded” than before, even if some were still on the safe side.

- **Goal 3 – Youtrack logging right after working on a task:**
Partially achieved. We reminded frequently during the sprint to log the work, there is an improvement if we look at the previous sprint but we missed some logs so we can still improve

#### Which ones you were not able to achieve? Why?

- **Goal 1  – Smooth execution across the sprint (avoid last-minute crunch):**
Not achieved. We again had a concentration of implementations and finishing touches in the last 2–3 days. We indeed achieved the bi-dailiy check and break large tasks into smaller chunks

#### Improvement goals for the next sprint and how to achieve them (technical tasks, team coordination, etc.)

- **Goal 1  – Smooth execution across the sprint (avoid last-minute crunch):**
- Ensure that by mid-sprint, at least 60–70% of critical stories are “To verify” or “Done.”
- Continuing with daily/bi-daily check
- Re-assign the task if necessary

- **Goal 2  – Better management of Technical Debt:**
- The issues in sprint 1/mid sprint 2 where 98, before starting TD management we peaked at 215 and by the end of sprint 3 we reached 156 (with no code smells with severity higher than "medium"). There is margin for improvement
- Using sonar plugin along developing new feature we want to try to not increase the number of issues (not with this rapidity) in order to getting better code without increasing the hours dedicated to TD alone

- **Goal 3 – Youtrack logging right after working on a task:**
- We still need to achieve better logging, in order to update the team of the work done costantly

#### One thing you are proud of as a Team!!
Even though we still struggled with last-minute implementations, we clearly improved our estimation quality compared to the previous sprint and kept our planning, coordination, and delivery discipline strong. We’re showing that we can learn from each sprint, adjust our approach, and keep delivering working features while gradually tightening our process.
