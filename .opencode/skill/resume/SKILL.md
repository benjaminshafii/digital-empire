---
name: resume
description: Generate tailored resumes from core profile data for specific job applications
---

## Purpose

Adapt Benjamin's core resume for specific job applications. Stay concise, factual, and never invent experience or skills.

## Source of Truth

`BASE-RESUME.md` in this folder contains the canonical resume. Do not modify it unless explicitly instructed.

## Workflow

### 1. Load Core Resume
Read `.opencode/skill/resume/BASE-RESUME.md` to get the baseline.

### 2. Understand the Target Role
When given a job posting or company:
- Identify key requirements (skills, experience, values)
- Note the tone (startup vs corporate, technical vs product)
- Extract keywords that matter for ATS/screening

### 3. Research (Optional Enrichment)
Use available tools to add context — but never invent:
- `exa_web_search_exa` — search for recent work, mentions, or projects
- `exa_linkedin_search_exa` — find LinkedIn profile details
- `exa_crawling_exa` — crawl specific URLs (twitter.com/benjaminshafii, linkedin, github)
- Browser tools if needed for authenticated pages

Useful links:
- Twitter: https://x.com/hotkartoffel1 (also @benjaminshafii)
- LinkedIn: https://www.linkedin.com/in/ben-shafii-450039107/
- GitHub: https://github.com/different-ai (also github.com/benjaminshafii)
- 0.finance: https://0.finance
- Blog: https://blog.benjaminshafii.com

### 4. Tailor the Resume
Adjust emphasis without lying:
- **Reorder** sections/bullets to match job priorities
- **Highlight** relevant experience (e.g., if role needs AI, emphasize Embedbase/Note Companion)
- **Adjust wording** slightly to match job language (e.g., "product lead" vs "founder")
- **Trim** irrelevant ventures if space is tight
- **Keep** core facts unchanged

### 5. Output Format
Produce a clean markdown resume. Use this structure:

```markdown
# BENJAMIN SHAFII

[Location] | [email] | [LinkedIn URL]

[One-line tagline tailored to role]

---

## SUMMARY
[2-3 sentences max, tailored]

## SKILLS
[Bullet list, prioritized for role]

---

## EXPERIENCE

### [Company]
**[Title]** | [Dates]

[2-3 bullet points, achievement-focused]

---

## OTHER VENTURES
[Only include if relevant to role]
```

## Rules

1. **Never invent** — only use facts from BASE-RESUME.md or verified sources
2. **Stay concise** — 1 page equivalent in markdown
3. **Match tone** — startup roles get punchy language, corporate gets formal
4. **Preserve dates** — don't fudge timelines
5. **ATS-friendly** — use standard section headers

## Example Invocation

User: "Tailor my resume for this PM role at Stripe focusing on payments infrastructure"

Agent:
1. Read BASE-RESUME.md
2. Note Stripe wants: payments experience, technical depth, product strategy
3. Emphasize: Gnosis Pay (payments), Request Network (payment protocols), 0.finance (fintech)
4. De-emphasize: Note Companion, prologe.io
5. Output tailored markdown

## Output Location

Save tailored resumes to: `.opencode/skill/resume/outputs/[company]-[date].md`
