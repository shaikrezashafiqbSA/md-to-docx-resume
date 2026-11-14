# Resume Render

Markdown resume in, formatted `.docx` out. Runs as a static page on GitHub Pages.
No build step, no server, no upload: the file is parsed and the Word document is
packaged entirely in your browser.

## Where it sits

The strip at the top of the page shows the pipeline this tool is one stage of:

1. **Quest**: find the job description. Today by hand on the job portals.
2. **Trainer**: fit analysis and a tailored resume. Today an LLM, with
   `content/resume_prompt_instruction.md` as its system prompt and
   `master_resume_repository.md` as the evidence units.
3. **Dresser**: tidy the resume up for sending. Today this page.

The roadmap is one platform with a program for each stage. `docs/workflow.drawio`
holds the same chart for editing in draw.io.

## Use it

1. Paste the resume Markdown into the left column, or **Open** / drop a `.md`.
2. Fix it on the sheet. Every piece of text in the preview is editable in
   place and each edit rewrites its line of Markdown. Enter in a bullet starts
   the next bullet; Backspace in an empty bullet removes it. **B**, **I** and
   **Link** (Ctrl+B, Ctrl+I, Ctrl+K) work on the sheet and in the Markdown.
3. **Writer** hides the Markdown and leaves the sheet. **Split** brings it back.
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
email | [linkedin](url) | [github](url)  next line         -> contact
Target role: strength, strength          next plain line   -> tagline
                                         (a **bold** line first -> headline)

## PROFESSIONAL EXPERIENCE               # / ## / ALL-CAPS -> section heading
### Role Title | Employer | Jul 2025 to Jul 2026           -> job, on one line
Recruited to reverse a stalled ...       paragraph under a job -> scope note
- **Label:** body text                                    -> bullet with label
#### Adoption Recovery & Outcomes        #### / ***...***  -> sub-heading
| Category | items |                     two-column table  -> skill card

## EDUCATION
### Degree, Major | University | 2020                      -> qualification
Certificate of Concentration in ...      plain line after  -> its note
```

The role line is the one to get right. It prints as a single line: title first
in bold teal, employer second in bronze, dates at the right margin. Keep it to
about 85 characters so it does not wrap. Drafts that drift are still read as
roles: `**Title, Employer**, Jul 2025 to Jul 2026`, the same without bold inside
an experience section, and `### Title | Employer` followed by an italic date
line. Editing one on the sheet rewrites it in the canonical form.

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
