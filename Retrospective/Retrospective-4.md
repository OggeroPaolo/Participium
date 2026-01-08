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

-	Overall, estimation accuracy was strong this sprint and we delivered all accepted stories.

-	Most underestimations were minor (typically ~10–15 minutes) and came from small implementation details and polish that surfaced during execution.

-	We had one notable frontend underestimation (~1+ hour), which was primarily caused by a misunderstanding of the feature’s intended functionality—this required discussion and alignment to reach a “middle-ground” solution to re-implementation could proceed.

-	Some work naturally landed later in the sprint because multiple tasks had hard dependencies (linked functionalities that needed to be implemented in sequence), which limited how early we could start certain items.

#### What lessons did you learn (both positive and negative) in this sprint?

**Positive:**

- When requirements are clear, our team can estimate and execute very reliably—most tasks landed close to plan.
- Alignment conversations (even when they cost time) prevented us from implementing the “wrong” solution and reduced downstream rework.
- SonarCloud discipline worked extremely well: we reduced code smells and improved overall code quality while still delivering features.

**Negative:**

-	A single misunderstanding can still create a disproportionate slip (as seen in the 1+ hour FE task), so catching ambiguity earlier is the biggest lever to keep estimates accurate.

-	Even if late-sprint concentration is “expected” due to dependencies, it can still increase risk if integration or QA gets compressed—worth monitoring to keep it from turning into a recurring pattern.

#### Which improvement goals set in the previous retrospective were you able to achieve?


- **Goal 2 – Better management of Technical Debt:**
	SonarCloud results were strong: we lowered code smells and improved code health during feature delivery.
- **Goal 3 – YouTrack logging right after working on a task::**
  We maintained as much as possible "on-time" tracking on YouTrack. 

#### Which ones you were not able to achieve? Why?

- **Goal 1 – Smooth execution across the sprint:**
  Mostly achieved within the constraints of dependencies. While a larger portion of implementation happened in the last week, this was driven by sequenced work rather than avoidable crunch.

#### Improvement goals for the next sprint and how to achieve them (technical tasks, team coordination, etc.)

- **Goal 1 –  Reduce “misunderstanding-driven” slippage :**
  Add a quick “definition checkpoint” before starting any story with unclear behavior (5–10 min sync or async clarification). For any story with UX/logic ambiguity, write a 3–5 bullet “expected behavior” note in the ticket before implementation.

- **Goal 2 – Dependency-aware sprint planning :**
	Explicitly mark dependency chains in YouTrack and schedule prerequisites earlier.
	If a chain forces last-week concentration, plan QA/integration time accordingly (so testing doesn’t get squeezed).

#### One thing you are proud of as a Team!!

We delivered 100% of the stories we committed to, kept estimation accuracy high, and simultaneously improved code quality through SonarCloud—showing we can ship reliably while raising engineering standards.
