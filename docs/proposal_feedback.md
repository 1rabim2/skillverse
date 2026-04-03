# Skill Verse FYP Proposal - Review Notes (Actionable)

Source text extracted from `docs/proposal_extracted.txt`.

## Highest impact fixes (do these first)

1. Add an **Abstract + Keywords** (missing).
2. Split **Literature Review** vs **Existing Systems/Competitor Analysis**.
3. Add a short **Evaluation/Testing Plan** (how you will prove it works).
4. Add a **Risk + Mitigation** section (scope control + technical risks).
5. Ensure every strong numeric claim has a citation (for example "over 80%" in the Introduction).

## Line-level writing fixes (quick wins)

- `docs/proposal_extracted.txt:2`: Encoding artifact fixed to "Skill Verse -".
- `docs/proposal_extracted.txt:19-24`: Many missing spaces and punctuation breaks:
  - "e learning" -> "e-learning" (be consistent).
  - "skill pathsauto generated" -> "skill paths, auto-generated".
  - "track the process" -> "track progress".
  - "progress trackingand" -> "progress tracking and".
- `docs/proposal_extracted.txt:20`: Tech names should be consistently capitalized:
  - "react" -> "React"
  - "mongo dB" -> "MongoDB"
  - "node.js" -> "Node.js"
- `docs/proposal_extracted.txt:38`: Sentence case + grammar:
  - "the point of e-learning will have been wasted" is awkward; rephrase to a clearer impact sentence.
- `docs/proposal_extracted.txt:41`: "lean-based learning ecosystem" likely meant "learner-centered learning ecosystem".
- `docs/proposal_extracted.txt:42`: Replace hyphen use:
  - "Skill Paths-a" -> "Skill Paths - a" or "Skill Paths: a".
- `docs/proposal_extracted.txt:76`: "authenticationand" -> "authentication and".
- `docs/proposal_extracted.txt:94`: "notesand" -> "notes and".

## Content gaps / clarity improvements

- Objectives are strong, but make them **measurable and testable**:
  - Add acceptance criteria (example: "complete a skill path -> certificate and portfolio entry created").
- "Functional Decomposition Diagram" is referenced (`docs/proposal_extracted.txt:72`) but no diagram appears in extracted text.
  - If it's an image in Word, add a caption and reference it in text (Figure 1).
- The subsystem tool choices should match your actual implementation direction:
  - Your backend already uses JWT + bcrypt; avoid "Firebase Auth / JWT" unless you truly plan to integrate Firebase.
- Add a brief **Data/Privacy** note:
  - What user data is stored (email, progress, quiz scores) and basic protections (hash passwords, JWT expiry).

## Literature review cleanup (important)

- Several paragraphs mention author names/years but do not provide full references (and some names are inconsistent like "Khaldi" vs "Khadji").
- Separate into:
  - Academic sources: dropout/retention, gamification, portfolios, learning analytics.
  - Existing systems: Coursera/Udemy/Khan Academy/Duolingo/SoloLearn comparisons.
- Add a proper **References** section (APA/IEEE, whatever your department wants) and ensure every in-text citation appears there.

## Suggested structure (typical FYP format)

1. Title page
2. Abstract + Keywords
3. Introduction + Background
4. Problem statement
5. Aim + objectives
6. Proposed solution + novelty
7. Scope + limitations
8. Methodology (Scrum) + work plan (sprints + Gantt)
9. System design (architecture + modules + data model)
10. Tools/tech stack
11. Risks + mitigation
12. Evaluation plan
13. References

Next: a cleaned, ready-to-paste rewrite is in `docs/SkillVerse_FYP_Proposal_Rewrite.md`.
