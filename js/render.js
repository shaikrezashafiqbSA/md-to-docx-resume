/* render.js - block structure -> .docx, built in the browser.
 *
 * This reproduces the "teal and bronze" master resume: a Google Docs export
 * with US Letter geometry, Calibri throughout, section headings carried on a
 * thick left bar plus a thin underline, sub-headings on their own left bar,
 * and employer / date details on one pipe-separated line under each role.
 *
 * The look is fixed. It is length agnostic by construction: nothing here caps
 * or reflows at a page count, so a two-page draft and an eight-page master
 * come out in the same style.
 */
(function (global) {
  'use strict';

  /* A4 in twips (1/1440 in): 210mm x 297mm, 0.75in margins. */
  var PAGE_W = 11906, PAGE_H = 16838;
  var MARGIN = 1080;
  var TEXT_W = PAGE_W - 2 * MARGIN;

  var FONT = 'Calibri';

  /* Half-points for run sizes. */
  var SZ = {
    name: 36, contact: 19, headline: 21, subline: 19,
    section: 23, role: 22, org: 20, context: 19, subhead: 18,
    body: 20, skillLabel: 17, skillBody: 17,
    eduDegree: 20, eduMeta: 19
  };

  var C = {
    teal:   '177A9A',   // name, headline, section + role titles, degree, skill label
    bronze: '8F6E54',   // left bars, sub-headings, employer, subline accent
    grey:   '595959',   // contact, dates, role context
    ink:    '262626',   // body copy and bullet labels
    link:   '1155CC',
    band:   'E6F2F6'    // skill-card tint (alternating with white)
  };

  /* Inline markup, deliberately limited to the three things a resume needs. */
  var INLINE_RE = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\)/g;

  function assign(a, b) {
    var out = {}, k;
    for (k in a) if (Object.prototype.hasOwnProperty.call(a, k)) out[k] = a[k];
    for (k in b) if (Object.prototype.hasOwnProperty.call(b, k)) out[k] = b[k];
    return out;
  }

  function inlineRuns(text, base) {
    var d = global.docx;
    var runs = [], last = 0, m;
    INLINE_RE.lastIndex = 0;
    text = text || '';
    while ((m = INLINE_RE.exec(text)) !== null) {
      if (m.index > last) {
        runs.push(new d.TextRun(assign(base, { text: text.slice(last, m.index) })));
      }
      if (m[1] !== undefined) {
        runs.push(new d.TextRun(assign(base, { text: m[1], bold: true })));
      } else if (m[2] !== undefined) {
        runs.push(new d.TextRun(assign(base, { text: m[2], italics: true })));
      } else {
        runs.push(new d.ExternalHyperlink({
          link: m[4],
          children: [new d.TextRun(assign(base, {
            text: m[3], color: C.link, underline: {}
          }))]
        }));
      }
      last = INLINE_RE.lastIndex;
    }
    if (last < text.length) {
      runs.push(new d.TextRun(assign(base, { text: text.slice(last) })));
    }
    if (!runs.length) runs.push(new d.TextRun(assign(base, { text: '' })));
    return runs;
  }

  function build(model) {
    var d = global.docx;
    if (!d) throw new Error('The docx library did not load.');

    var S = d.BorderStyle.SINGLE;
    var head = model.header || {};
    var children = [];
    var skillTick = 0;

    function para(o) { return new d.Paragraph(o); }
    function run(o) { return new d.TextRun(assign({ font: FONT }, o)); }

    /* ---- identity block ---- */
    if (head.name) {
      children.push(para({
        spacing: { after: 20 },
        children: [run({ text: head.name, bold: true, color: C.teal, size: SZ.name })]
      }));
    }

    var contactRuns = [];
    if (head.contactText) {
      contactRuns = contactRuns.concat(inlineRuns(head.contactText,
        { font: FONT, size: SZ.contact, color: C.grey }));
    }
    (head.contactLinks || []).forEach(function (l, i) {
      if (contactRuns.length || i) {
        contactRuns.push(run({ text: '   |   ', size: SZ.contact, color: C.grey }));
      }
      contactRuns.push(new d.ExternalHyperlink({
        link: l.url,
        children: [run({ text: l.label, size: SZ.contact, color: C.link, underline: {} })]
      }));
    });
    if (contactRuns.length) {
      children.push(para({ spacing: { after: 60 }, children: contactRuns }));
    }

    if (head.headline) {
      children.push(para({
        spacing: { after: 20 },
        children: inlineRuns(head.headline,
          { font: FONT, size: SZ.headline, bold: true, color: C.teal })
      }));
    }
    if (head.subline) {
      children.push(para({
        spacing: { after: 160 },
        border: { bottom: { style: S, size: 12, color: C.bronze, space: 6 } },
        children: inlineRuns(head.subline,
          { font: FONT, size: SZ.subline, italics: true, color: C.bronze })
      }));
    }

    /* ---- sections ---- */
    (model.sections || []).forEach(function (section) {
      if (section.name) {
        children.push(para({
          spacing: { before: 200, after: 100 },
          keepNext: true, keepLines: true,
          outlineLevel: 0,
          border: {
            left:   { style: S, size: 24, color: C.bronze, space: 6 },
            bottom: { style: S, size: 4,  color: C.teal,   space: 3 }
          },
          children: [run({
            text: section.name, bold: true, allCaps: true,
            color: C.teal, size: SZ.section
          })]
        }));
      }
      (section.blocks || []).forEach(function (b) {
        blockParagraphs(b).forEach(function (p) { children.push(p); });
      });
    });

    function blockParagraphs(b) {
      switch (b.t) {
        case 'role': {
          var out = [para({
            spacing: { before: 220, after: 20 },
            keepNext: true, outlineLevel: 1,
            children: [run({ text: b.role, bold: true, color: C.teal, size: SZ.role })]
          })];
          if (b.org || b.dates) {
            var meta = [];
            if (b.org) {
              meta = meta.concat(inlineRuns(b.org,
                { font: FONT, size: SZ.org, bold: true, color: C.bronze }));
            }
            if (b.dates) {
              meta.push(run({
                text: (b.org ? '   |   ' : '') + b.dates,
                size: SZ.org, color: C.grey
              }));
            }
            out.push(para({ spacing: { after: 60 }, keepNext: true, children: meta }));
          }
          return out;
        }

        case 'context':
          return [para({
            spacing: { after: 80, line: 259 },
            children: inlineRuns(b.text,
              { font: FONT, size: SZ.context, italics: true, color: C.grey })
          })];

        case 'subhead':
          return [para({
            spacing: { before: 120, after: 40 },
            keepNext: true, outlineLevel: 2,
            indent: { left: 80 },
            border: { left: { style: S, size: 12, color: C.bronze, space: 4 } },
            children: [run({
              text: b.text, bold: true, allCaps: true,
              color: C.bronze, size: SZ.subhead
            })]
          })];

        case 'callout':
          return [para({
            spacing: { before: 60, after: 100 },
            indent: { left: 60 },
            border: { left: { style: S, size: 18, color: C.teal, space: 8 } },
            children: inlineRuns(b.text,
              { font: FONT, size: SZ.context, italics: true, color: C.teal })
          })];

        case 'skill': {
          var tint = (skillTick++ % 2 === 0) ? C.band : 'FFFFFF';
          var kids = [];
          if (b.label) {
            kids.push(run({ text: b.label, bold: true, color: C.teal, size: SZ.skillLabel }));
            if (b.text) kids.push(run({ text: '   ', size: SZ.skillLabel }));
          }
          if (b.text) {
            kids = kids.concat(inlineRuns(b.text,
              { font: FONT, size: SZ.skillBody, color: C.ink }));
          }
          return [para({
            spacing: { after: 40, line: 240 },
            shading: { type: d.ShadingType.CLEAR, fill: tint },
            indent: { left: 40 },
            border: {
              left:   { style: S, size: 18, color: C.bronze, space: 5 },
              top:    { style: S, size: 6,  color: tint,      space: 2 },
              bottom: { style: S, size: 6,  color: tint,      space: 2 },
              right:  { style: S, size: 6,  color: tint,      space: 5 }
            },
            children: kids
          })];
        }

        case 'edu': {
          var eduMeta = [run({ text: b.degree, bold: true, color: C.teal, size: SZ.eduDegree })];
          var tail = [];
          if (b.school) tail.push(b.school);
          if (b.year) tail.push(b.year);
          if (tail.length) {
            eduMeta.push(run({
              text: '   |   ' + tail.join('   |   '),
              size: SZ.eduMeta, color: C.grey
            }));
          }
          var eduOut = [para({ spacing: { after: b.note ? 10 : 100 }, children: eduMeta })];
          if (b.note) {
            eduOut.push(para({
              spacing: { after: 100, line: 264 },
              children: inlineRuns(b.note, { font: FONT, size: SZ.body, color: C.ink })
            }));
          }
          return eduOut;
        }

        case 'bullet': {
          var bkids = [];
          if (b.label) {
            bkids.push(run({ text: b.label + ': ', bold: true, color: C.ink, size: SZ.body }));
          }
          bkids = bkids.concat(inlineRuns(b.text,
            { font: FONT, size: SZ.body, color: C.ink }));
          return [para({
            numbering: { reference: 'resume-bullets', level: 0 },
            spacing: { after: 50, line: 259 },
            children: bkids
          })];
        }

        default:
          return [para({
            spacing: { after: 80, line: 250 },
            children: inlineRuns(b.text, { font: FONT, size: SZ.body, color: C.ink })
          })];
      }
    }

    return new d.Document({
      creator: head.name || 'Resume',
      title: (head.name || 'Resume') + ' - Resume',
      description: 'Rendered from Markdown',
      styles: {
        default: { document: { run: { font: FONT, size: SZ.body, color: C.ink } } }
      },
      numbering: {
        config: [{
          reference: 'resume-bullets',
          levels: [{
            level: 0, format: 'bullet', text: '•',
            alignment: d.AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 300, hanging: 220 } } }
          }]
        }]
      },
      sections: [{
        properties: {
          page: {
            size: { width: PAGE_W, height: PAGE_H },
            margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN,
                      header: 720, footer: 720 }
          }
        },
        children: children
      }]
    });
  }

  global.ResumeRender = { build: build, PALETTE: C };
})(window);
