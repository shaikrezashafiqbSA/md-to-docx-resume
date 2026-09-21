# Resume Render

Markdown resume in, formatted `.docx` out. Runs as a static page on GitHub Pages.
No build step, no server, no upload: the file is parsed and the Word document is
packaged entirely in your browser.

## Use it

The middle column is a Markdown editor. Type in it and the preview on the right
rebuilds as you go, from the same model that packages the `.docx`.

1. Write, or paste a resume, into the editor. **Open file** and dropping a `.md`
   onto the editor both load a file into it. From Google Docs, use
   **File → Download → Markdown (.md)**.
2. Optionally type a **target role**. It only shapes the file name.
3. Check the **file name**, or edit it. Default is
   `Shaik_Reza_Shafiq_Resume_<role>.docx`, or `Shaik_Reza_Shafiq_Resume.docx`
   with no role. Clear the box to hand naming back to the role.
4. Press **Download .docx** and drag the result back into Drive.

Your draft, role and file name are kept in this browser's local storage, so a
reload picks up where you left off. **Sample** replaces the editor with the
bundled resume.

Opening `index.html` straight off disk works, but the browser will block loading
the bundled sample. Type or paste instead, or serve the folder over HTTP.

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
# SHAIK REZA SHAFIQ                      first line        -> name
Singapore | +65 ... | [LinkedIn](url)    next line         -> contact
**Headline | With | Pipes**              next bold line    -> headline
MSc Quantitative Finance                 next plain line   -> tagline

## PROFESSIONAL EXPERIENCE               # / ## / ALL-CAPS -> section heading
### Role Title | Organisation                              -> job
*Jul 2025 - Jul 2026*                    short italic line -> that job's dates
*Recruited to reverse a stalled ...*     longer italic     -> scope note
#### Adoption Recovery & Outcomes        #### / ***...***  -> sub-heading
***Guiding Principle: ...***                              -> callout
* **Label:** body text                                    -> bullet with label
| Category | items |                     two-column table  -> "Category: items"
```

Inside EDUCATION, `**Degree** - School *Year*` becomes a qualification line, and
a plain line straight after it folds in as a coursework note.

Tables are flattened to `Label: items` rows rather than rendered as tables. The
document is one linear column by design, and text inside a table cell sits
outside that stream. A `---` thematic-break line is dropped.

Inline `**bold**`, `*italic*` and `[text](url)` are honoured everywhere. Nothing
else is parsed.

## Style

One fixed look, reproduced from the master resume: A4, 0.75 in margins,
Calibri throughout, a teal (`#177A9A`) and bronze (`#8F6E54`) palette. Section
headings sit on a thick bronze left bar with a thin teal underline;
sub-headings on their own bronze bar; each role's employer and dates share one
pipe-separated line; skills render as tinted cards.

It is length agnostic: nothing caps or reflows at a page count, so a two-page
draft and an eight-page master come out in the same style. The preview shows a
dashed rule at each estimated page boundary; the count is an estimate because a
browser and Word break lines differently.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Three-column layout, styling, palette tokens |
| `js/parse.js` | Markdown → ordered sections and blocks |
| `js/render.js` | Blocks → `.docx`, page geometry and type scale |
| `js/app.js` | Editor, role + file name, live preview, page ruler, download |
| `content/` | Sample and working resumes |

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
