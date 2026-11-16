# Starter prompt: build a Master Resume Repository

You are building a Master Resume Repository for the person whose resume is at the end of this message. The repository is their evidence base: every result they can prove, broken into small units, grouped by the capability each unit proves. A second prompt later reads this file to tailor a resume for a specific job, so the file must be complete, exact and easy to pick from.

## Working rules

1. Use only what the supplied material states. Invent no employer, date, title, tool, figure or outcome.
2. Keep every figure exactly as written. Where the source says "about", write "about".
3. One unit holds one result or one responsibility. Split a resume bullet that carries two results into two units.
4. Write each Canonical at the strongest wording the source supports: action verb first, the largest figure early, the starting state beside the result where the source gives one ("3 of 15 on track" to "all 15 active").
5. Where a claim has no number, write the claim as given and add an Unlock line that names the one fact that would raise it.
6. Where the source is silent on something the template asks for (reason for leaving, contract type, a tool), write "to confirm" in that place and ask about it in the recall questions.
7. Label inference as inference. A competency tag or a pitch angle is your reading of the evidence. A figure never is.

## Method

1. List the employers and roles, newest first. Give each a short prefix of 2 to 4 capital letters (an employer named Northbridge Digital becomes NBD).
2. Under each role, sort the evidence into stacks. A stack is one capability the role proves (for example "Adoption recovery and change leadership"). Aim for 1 to 5 stacks a role, each with 2 or more units where the evidence allows.
3. Number stacks per role: NBD-1, NBD-2. Number units per role, running across its stacks: EU-NBD-01, EU-NBD-02. An ID never changes once given.
4. Build the competency taxonomy from the evidence: 8 to 14 competencies, each with a 3-letter code. Tag every unit with 1 to 3 codes.
5. Write the stack claim last, using only figures that appear in the stack's own units.
6. Write the pitch angles, narrative map and signature patterns last of all, citing unit IDs for every figure.

## Output

Return the whole file in one fenced markdown block. Copy the headings, the bold markers and the field names exactly, because the Repository page splits the file on them. Replace only the bracketed text. Leave out a field that has nothing to hold, and leave out a section only where the note beside it says so.

````markdown
# **Master Resume Repository**

## **How to use this file**

This file is the evidence base for pitching [Full Name] at full strength for any role. It is one of two inputs to the job application workflow. The instruction set is the other, and it holds the tailoring rules. Every unit is a proven result. A stack groups the units that prove one capability, so a tailored resume leads with the stack the job scope values most.

Stack lines:

* Stack claim: the combined pitch, built only from figures in the member units. Lead a resume section with it, then pick the member units closest to the JD.
* Bends to: the job scopes and JD vocabulary the stack serves.
* Member units sit under the stack heading.

Unit fields:

* Tags: competency codes from the taxonomy. Internal only.
* Roles: employers a cross-role unit covers. Name each once.
* Tools: systems, tools and sources for bullets and the skills line.
* Metrics: figures recorded outside the Canonical. Use as written.
* Canonical: the lead claim, the strongest defensible wording. Rephrase to the JD and keep every figure as recorded.
* Outcome: a result recorded outside the Canonical. Use with it.
* Framing: approved alternative wording or title for a JD type.
* Scope: the setting of the claim, stated as fact. Binding. Write it into the bullet.
* Unlock: the recalled fact that raises the claim. Ask during elicitation. On answer, raise the claim and record the figure and its basis here.
* Notes: basis, arithmetic and stories for the interview room.
* Positioning: where the unit pitches best.
* Relationship: how the unit pairs with another.
* Resume rule: a fixed requirement for the resume entry.

Maintenance: add a new experience as a new unit at the end of its stack, with the next free number for that role. An EU ID is permanent. When a figure changes, write the new figure and log the old figure, the new figure and the basis in the unit's Notes.

Role prefixes: [PFX (Employer), PFX (Employer), XR (cross-role), EDU (education), COM (community)].

## **Identity and pitch angles**

### **Identity block**

| Field | Value |
| :---- | :---- |
| Name | [Full Name] |
| Citizenship | [as stated, or "to confirm"] |
| Location | [city, country] |
| Email | [email] |
| LinkedIn | [link, or "to confirm"] |
| Portfolio | [link, where one exists] |

### **Title rule**

Each role records a contracted title and a functional title. Application forms carry the contracted title. The resume and duties text carry the functional title, reframed to the functional role closest to the JD.

### **Pitch angles**

[2 to 4] approved angles for "Who I Am & The Value I Bring". Adapt one per application. Every fact traces to a unit.

| Angle | Headline | Pitch |
| :---- | :---- | :---- |
| [Angle name] | [Role · Strength · Strength · Strength] | [2 to 3 sentences. Which result leads, which follows, and what it adds up to.] |

## **Competency taxonomy**

Tag every unit with codes from this list and map new JD vocabulary to them. Append new codes to the table.

| Code | Competency | JD vocabulary that maps here |
| :---- | :---- | :---- |
| [ABC] | [Competency] | [terms a job description would use for it] |

### **JD vocabulary map**

Translates an employer's terms into this file's terms. Write the JD's own term in the resume where the mapped evidence supports it. Append each new mapping from the master resume feed.

| JD term | This file's term | Evidence |
| :---- | :---- | :---- |

## **Narrative builder**

Pick the narrative row closest to the JD, lead with its stacks, and open the resume with its headline evidence. Every figure traces to the unit named.

### **Core pitch**

[One or two sentences: what this person reliably does, and for how long, across which kinds of employer.]

### **Narrative map**

| Job scope | Lead stacks | Headline evidence |
| :---- | :---- | :---- |
| [A kind of job this person could apply for] | [PFX-1, PFX-2] | [The 3 to 5 strongest figures for that scope, each with its unit ID in brackets] |

### **Signature patterns**

These run across employers. Use one as the spine of a "Who I Am" paragraph. [Include only patterns that 2 or more units support. Leave the section out if there are none yet.]

| Pattern | Evidence | Pitch |
| :---- | :---- | :---- |
| [Short name] | [EU IDs] | [One sentence] |

### **Tenure narrative**

| Role | Mandate | How it ended | What stayed behind |
| :---- | :---- | :---- | :---- |
| [Employer] | [What the role was there to do] | [Reason for leaving, or "to confirm"] | [What outlasted the tenure, with unit ID] |

## **Role 1: [Employer]**

| Field | Value |
| :---- | :---- |
| Dates | [Mon YYYY to Mon YYYY] |
| Contract | [Permanent, fixed-term, internship, or "to confirm"] |
| Contracted title | [Title as on the contract or resume] |
| Functional title | [What the work amounted to, where it differs] |
| Reason for leaving | [as stated, or "to confirm"] |

Resume scope note: [2 to 3 sentences on the remit: what the role was hired to do, at what scale, for whom.]

### **Stack [PFX]-1 · [Capability this stack proves]**

* Stack claim: [The combined pitch, using only figures from the units below.]
* Bends to: [job scopes and JD vocabulary this stack serves.]

#### **EU-[PFX]-01 · [Short title of the result]**

* Tags: [ABC, DEF]
* Tools: [systems and tools named in the source]
* Canonical: [The lead claim.]
* Scope: [The setting, stated as fact: team size, level, stage reached.]
* Unlock: [The one fact that would raise this claim.]
* Notes: [Basis, arithmetic, or the story behind it.]

## **Role 2: [Employer]**

[Same shape. One section for every role, newest first.]

## **Cross-role evidence units**

[Only where one result spans 2 or more employers. Same stack and unit shape, prefix XR, with a Roles field naming the employers. Leave the section out if there are none.]

## **Community engagement and facilitation**

[Volunteering, teaching, side projects. Same stack and unit shape, prefix COM.]

## **Education, certifications and languages**

### **Education (canonical, fullest version)**

* [Degree, Major] | [University] | [YYYY]. [Honours, concentration, thesis.]

### **Certifications and professional development**

* [Certification, issuer, year]

### **Languages**

* [Language (level)]

## **Skills register**

| Category | Skills | Evidence |
| :---- | :---- | :---- |
| [Category] | [skill, skill, skill] | [EU IDs] |

## **Growth targets**

[Capabilities the evidence does not yet prove but the person is likely to be asked for. One line each. Start with the "to confirm" items.]
````

## After the file: the first recall round

Below the block, ask the 10 questions whose answers would raise the most claims. This is how the repository gets richer than the resume it started from.

- One fact per question, answerable in one line from memory.
- Name the unit ID each question serves.
- Ask for the exact figure, and say you will accept in its place a range, then a relative value ("about 2x"), then a countable proxy (per week, times weeks), then the document or person that could confirm it.
- Ask for one of these: scale (team size, users, budget), efficiency (before and after), growth, cost saved (money, headcount, time), or reach (who was affected).
- Put the "to confirm" items first.

Close with: "Reply with numbered answers. I will return only the units that changed, each in full under its stack heading, in one markdown block for pasting into the Repository page."
