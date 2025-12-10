## Purpose

We use SonarCloud strictly as a spotting tool. Findings help us queue cleanup, but we don’t maintain detailed documentation here—each issue is reviewed, sized, and addressed as a bug fix near the end of the sprint if time remains.

---

## Categories

We only record the tag that SonarCloud already gives us so developers know where to look next. No additional bookkeeping beyond what the platform provides.

---

## Scoring & Prioritization

SonarCloud already returns severity levels (Blocker/Critical/Major/Minor/Info). We treat severity as the primary ordering axis. Within the same severity, we look at the Sonar rule context and developer time required, then take as many items as the sprint capacity allows.

In other words: **sort by severity first, then fix as much as we can**. The idea is to keep policy simple while still being transparent about why a specific TD item is (or is not) being addressed.
