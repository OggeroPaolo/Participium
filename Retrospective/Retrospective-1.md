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
  - Nr of automated unit test cases: 47
  - Coverage: 96.15%
- E2E testing:
  - Total hours estimated: 9h 30m
  - Total hours spent: 8h
  - Nr of test cases: 21
- Code review
  - Total hours estimated: 15h
  - Total hours spent: 13h 5m

## ASSESSMENT

- What did go wrong in the sprint?
	•	We underestimated some backend and frontend tasks.
	•	Firebase backend integrations took much longer than expected and caused many errors.
	•	We missed some frontend functionalities during estimation, which led to extra work.
	•	Map-related work was overestimated, so that time could have been used better.
  • Because of uncoordinated bad branch management we got merge conflicts which eat up some time of estimated tasks.
- What caused your errors in estimation (if any)?
	•	We missed some parts of the scope while estimating (both BE & FE).
	•	We didn’t realize that Firebase integrations would be this time-consuming and error-prone.
	•	Some frontend functionalities were not thought of during planning.
	•	We treated “map research” as a separate big task instead of doing lighter research during sprint planning.
- What lessons did you learn (both positive and negative) in this sprint?
	•	Positive:
	•	Once we understand the problem well (e.g., map part), implementation can be much faster than expected.
	•	Negative:
	•	Risky areas like backend integrations (Firebase) need more detailed thinking up front.
	•	We need to capture hidden frontend functionalities during estimation, not during development.
- Which improvement goals set in the previous retrospective were you able to achieve?
N/A 
- Which ones you were not able to achieve? Why?
N/A 
- Improvement goals for the next sprint and how to achieve them (technical tasks, team coordination, etc.)
Goal 1 – Improve estimation for risky tasks (especially backend & integrations). And in sprint planning, mark “risky” tasks (Firebase, complex flows). Do a short technical spike / quick research during planning for these tasks before estimating directly or assigning research tasks blindly.
	
Goal 2 – Avoid missed frontend functionalities and think more of use cases and designs as they tend to be underestimated.

Goal 3 - A better git branch management to avoid merge conflicts.
- One thing you are proud of as a Team!!
Despite estimation issues and Firebase errors, we kept pushing, collaborated, and delivered key parts (like the map) faster than expected 