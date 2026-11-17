# Resume Render

A job-application workbench that runs as static pages on GitHub Pages. No build
step, no server, no upload: everything is kept in your browser, and the page
calls no LLM itself.

## The five steps

The strip at the top of every page is the workflow and the navigation:

| # | Page | File | What it does |
| --- | --- | --- | --- |
| 0 | Instructions | `doc.html?d=instructions` | The LLM prompt, split into blocks at each heading, with an outline and search. Click a block to edit its Markdown. |
| 1 | Repository | `doc.html?d=repository` | The master resume repository, the same way: one block per evidence unit, **Add unit** on each stack, search across everything. |
| 2 | Quests | `quests.html` | Checklist of Singapore public-sector job portals. Tick the ones to check, **Open next ticked** walks through them and stamps each as checked today. |
| 3 | Tailor | `tailor.html` | Paste a job description, press **Copy prompt package**: instructions + repository + JD in one block for any LLM. Paste the resume it returns and **Open in Dresser**. |
| 4 | Dresser | `index.html` | Markdown resume in, formatted `.docx` out. |

Instructions and Repository load from `content/` the first time and then live in
the browser. **Open** loads a file, **Save .md** writes it back (straight to the
file in Chrome and Edge, a download elsewhere), **Whole file** is for pasting.
The repository file is private: it is in `.gitignore`, so on the public site the
Repository page starts empty until you open your own file.

## Starting a repository from nothing

A new user needs only their current resume. On the Repository page:

1. **Start from resume**: paste the resume, copy the starter prompt with it,
   and paste that into any LLM. The prompt (`content/repository_starter_prompt.md`)
   has the LLM split the resume into evidence units grouped in stacks, in the
   format the Repository page reads, without inventing facts. Paste the result
   back and press **Load into this page**.
2. **Enrich** (step 5 in the strip, the loop from Tailor back to Repository):
   while tailoring, the LLM's recall questions and your answers raise old
   claims and uncover new ones, and it lists them at the end as the master
   resume feed. Paste that block and **Merge into repository**: a unit whose ID
   exists is replaced, a new one goes to the end of its stack. With no
   tailoring session to hand, the same dialog copies
   `content/repository_recall_prompt.md` with the whole repository for a
   stand-alone recall round.

Each tailoring session makes the repository richer than the resume it started
from.

## Use the Dresser

1. Paste the resume Markdown into the left column, or **Open** / drop a `.md`.
2. Fix it on the sheet. Every piece of text in the preview is editable in
   place and each edit rewrites its line of Markdown. Enter in a bullet starts
   the next bullet; Backspace in an empty bullet removes it. **B**, **I** and
   **Link** (Ctrl+B, Ctrl+I, Ctrl+K) work on the sheet and in the Markdown.
3. **Writer** hides the Markdown and leaves the sheet. **Split** brings it back.
   In Split the two columns follow each other: click text on the sheet and its
   Markdown line scrolls into view under a yellow band; put the caret in the
   Markdown and its block is marked on the sheet.
4. Optionally type a **target role**. It only shapes the file name, which
   defaults to `Shaik_Reza_Shafiq_Resume_<role>.docx`.
5. Press **Download .docx**.

Your draft, view, role and file name are kept in this browser's local storage.
**Sample** replaces the text with `content/mock-resume.md`.

Opening `index.html` straight off disk works, but the browser will block loading
the bundled sample. Paste instead, or serve the folder over HTTP.

## Section headings

Headings are rendered exactly as written, in the order they appear. The `.md`
already carries the wording wanted in the document, tailored per application,
for example:

```
## WHO I AM & THE VALUE I BRING TO MEDIACORP
```

Any `#` or `##` line, or a whole line in **ALL-CAPS bold**, is a section
heading. There is no renaming or reordering step; edit further in Word after
downloading if you need to.

## Markdown the parser understands

It targets the dialect Google Docs and language models actually emit, not clean
CommonMark. Both work.

```
# Shaik Reza Shafiq                      first line        -> name
Singapore Citizen | email | [linkedin](url) | [github](url)   next line -> contact
**Role. Strength. Strength.**            bold line         -> tagline, in bronze
                                         (a plain line here is an italic tagline)

## PROFESSIONAL EXPERIENCE               # / ## / ALL-CAPS -> section heading
**Role Title** | Employer | Jul 2025 to Jul 2026           -> job, on one line
Recruited to reverse a stalled ...       paragraph under a job -> scope note
- **Label:** body text                                    -> bullet with label
#### Adoption Recovery & Outcomes        #### / ***...***  -> sub-heading
| Category | items |                     two-column table  -> skill card

## EDUCATION
- Degree, Major | University | 2020                        -> qualification
Certificate of Concentration in ...      plain line after  -> its note
```

The role line is the one to get right. It prints as a single line: title first
in bold teal, employer second in bronze, dates at the right margin. Keep it to
about 85 characters so it does not wrap. A closing full stop inside the bold
title is dropped. Drafts that drift are still read as roles:
`### Title | Employer | Jul 2025 to Jul 2026`,
`**Title, Employer**, Jul 2025 to Jul 2026`, the same without bold inside an
experience section, and `### Title | Employer` followed by an italic date line.
Editing one on the sheet rewrites it as `**Title** | Employer | Dates`, or
keeps the `###` if it was written with one.

A qualification prints the same way in plain type: degree, university in grey,
year at the right margin. `### Degree | University | 2020` and
`**Degree**, University, 2020` are read too.

Tables are flattened to `Label: items` rows rather than rendered as tables. The
document is one linear column by design, and text inside a table cell sits
outside that stream. A `---` thematic-break line is dropped.

Inline `**bold**`, `*italic*` and `[text](url)` are honoured everywhere. Nothing
else is parsed.

## Style

One fixed look, reproduced from the master resume: A4, 0.75 in margins,
Calibri throughout, a teal (`#177A9A`) and bronze (`#8F6E54`) palette. Section
headings sit on a thick bronze left bar with a thin teal underline;
sub-headings on their own bronze bar; each role is one line (title, employer,
dates at the right margin); skills tables render as tinted cards.

It is length agnostic: nothing caps or reflows at a page count, so a two-page
draft and an eight-page master come out in the same style. The preview shows a
dashed rule at each estimated page boundary; the count is an estimate because a
browser and Word break lines differently.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Workflow strip, bar, two-column layout, styling |
| `js/parse.js` | Markdown → ordered sections and blocks |
| `js/render.js` | Blocks → `.docx`, page geometry and type scale |
| `js/app.js` | Editable preview that writes back to the Markdown, views, page ruler, download |
| `content/` | Sample resume and the LLM prompt that produces the Markdown |
| `docs/workflow.drawio` | The pipeline chart, editable in draw.io |

The only external dependency is the `docx` library, pinned to 9.7.1 and loaded
from a CDN. Vendor it into the repo if you want the page to work offline.

## Deploy

Push to GitHub, then in the repository settings enable Pages from the `main`
branch at the root. There is nothing to build.

## Not included

No ATS scoring, no job-description matching, no Google Drive integration. Drive
read and write from a Pages site is possible, but it needs a Google Cloud
project, an OAuth client ID, an API key, and your Pages origin registered as an
allowed source. Downloading and dragging the file back is one step and no setup.
