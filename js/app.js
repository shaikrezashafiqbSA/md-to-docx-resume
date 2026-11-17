/* app.js - the page: paste Markdown, fix it on the sheet, download the .docx.
 *
 * The preview is drawn from the same block model as the .docx rather than from
 * a generic markdown renderer. That is the only way the page ruler can mean
 * anything: if the preview came from a different pipeline, its page breaks
 * would be a different document's page breaks.
 *
 * The Markdown stays the single source of truth. Every piece of text on the
 * sheet is an editable field stamped with the source line it came from; typing
 * in one rewrites that one line of Markdown, and everything else (the model,
 * the .docx) is derived from the Markdown as before.
 */
(function () {
  'use strict';

  var SAMPLE = 'content/mock-resume.md';
  var STORE = 'resume-render.v2';
  var DEBOUNCE_MS = 180;
  var BASE_NAME = 'Shaik_Reza_Shafiq_Resume';
  var HL_CLASS = 'hl';

  var el = {
    editor:   document.getElementById('editor'),
    file:     document.getElementById('file'),
    open:     document.getElementById('open'),
    sample:   document.getElementById('sample'),
    role:     document.getElementById('role'),
    filename: document.getElementById('filename'),
    download: document.getElementById('download'),
    status:   document.getElementById('status'),
    pages:    document.getElementById('pages'),
    source:   document.getElementById('source'),
    stage:    document.querySelector('.stage'),
    scaler:   document.getElementById('scaler'),
    wrap:     document.getElementById('wrap'),
    sheet:    document.getElementById('sheet'),
    rules:    document.getElementById('rules'),
    flow:     document.getElementById('flow'),
    vSplit:   document.getElementById('view-split'),
    vWriter:  document.getElementById('view-writer'),
    bar:      document.getElementById('bar')
  };

  var model = null;         // { header, sections }
  var prefs = { role: '', filename: '', filenameEdited: false, md: '',
                view: 'split' };
  var timer = null;
  var prompting = false;

  /* ---------------------------------------------------------------- state */

  function loadPrefs() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORE) || '{}');
      prefs.role = saved.role || '';
      prefs.filename = saved.filename || '';
      prefs.filenameEdited = !!saved.filenameEdited;
      prefs.md = typeof saved.md === 'string' ? saved.md : '';
      prefs.view = saved.view === 'writer' ? 'writer' : 'split';
    } catch (e) { /* private window, cleared storage: defaults are fine */ }
  }

  function savePrefs() {
    try {
      localStorage.setItem(STORE, JSON.stringify(prefs));
    } catch (e) { /* nothing here is worth failing a render over */ }
  }

  function setStatus(msg, kind) {
    el.status.textContent = msg || '';
    el.status.className = msg ? ('status ' + (kind || '')) : 'status';
  }

  /* --------------------------------------------------------- file naming */

  function slug(s) {
    return String(s || '').trim().replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function defaultFilename() {
    var r = slug(prefs.role);
    return (r ? BASE_NAME + '_' + r : BASE_NAME) + '.docx';
  }

  function ensureDocx(name) {
    name = String(name || '').trim();
    if (!name) return defaultFilename();
    return /\.docx$/i.test(name) ? name : name + '.docx';
  }

  /* The file-name box tracks the role until the moment it is hand-edited,
   * then it holds whatever was typed. Clearing it hands control back. */
  function syncFilename() {
    if (!prefs.filenameEdited) {
      prefs.filename = defaultFilename();
      el.filename.value = prefs.filename;
    }
  }

  /* -------------------------------------------------------------- preview */

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var INLINE_RE = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\)/g;

  function inlineHtml(text) {
    var out = '', last = 0, m;
    text = text || '';
    INLINE_RE.lastIndex = 0;
    while ((m = INLINE_RE.exec(text)) !== null) {
      out += esc(text.slice(last, m.index));
      if (m[1] !== undefined) out += '<strong>' + esc(m[1]) + '</strong>';
      else if (m[2] !== undefined) out += '<em>' + esc(m[2]) + '</em>';
      else out += '<a href="' + esc(m[4]) + '">' + esc(m[3]) + '</a>';
      last = INLINE_RE.lastIndex;
    }
    return out + esc(text.slice(last));
  }

  var skillTick = 0;
  var PIPE = '&nbsp;&nbsp;|&nbsp;&nbsp;';

  /* A paragraph tied to one source line. `kind` and `form` tell the writer
   * which Markdown shape to put back when one of its fields is edited. */
  function P(cls, line, kind, form, inner) {
    return '<p class="' + cls + '"' +
           (line === undefined ? '' : ' data-line="' + line + '"') +
           (kind ? ' data-k="' + kind + '"' : '') +
           (form ? ' data-v="' + form + '"' : '') + '>' + inner + '</p>';
  }

  /* An editable field. Plain fields hold text only; rich fields may hold bold,
   * italic and links. `blk` makes the whole row clickable, not just the ink. */
  function F(name, html, opt) {
    opt = opt || {};
    return '<span class="ed' + (opt.blk ? ' blk' : '') + (opt.cls ? ' ' + opt.cls : '') +
           '" contenteditable="true" spellcheck="false" data-f="' + name + '"' +
           (opt.plain ? ' data-p="1"' : '') + '>' + html + '</span>';
  }

  function blockHtml(b) {
    switch (b.t) {
      case 'role':
        return P('r-role', b.line, 'role', '',
          '<span>' + F('role', esc(b.role), { plain: true, cls: 'r-title' }) +
          (b.org ? '<span class="r-pipe">  |  </span>' +
                   F('org', inlineHtml(b.org), { cls: 'r-emp' }) : '') + '</span>' +
          (b.dates ? F('dates', esc(b.dates), { plain: true, cls: 'r-dates' }) : ''));
      case 'context':
        return P('r-context', b.line, 'context', b.ital ? 'ital' : '',
                 F('text', inlineHtml(b.text), { blk: true }));
      case 'subhead':
        return P('r-subhead', b.line, 'subhead', '',
                 F('text', esc(b.text), { blk: true, plain: true }));
      case 'callout':
        return P('r-callout', b.line, 'callout', '',
                 F('text', inlineHtml(b.text), { blk: true }));
      case 'skill': {
        var alt = (skillTick++ % 2 === 1) ? ' alt' : '';
        return P('r-skill' + alt, b.line, 'skill', b.table ? 'table' : '',
          (b.label ? F('label', esc(b.label), { plain: true, cls: 'r-skill-label' }) +
                     '&nbsp;&nbsp;&nbsp;' : '') +
          F('text', inlineHtml(b.text)));
      }
      case 'edu': {
        var e = F('degree', esc(b.degree), { plain: true, cls: 'r-deg' });
        if (b.school) e += '<span class="r-edu-meta">' + PIPE + '</span>' +
                           F('school', esc(b.school), { plain: true, cls: 'r-edu-meta' });
        if (b.year) e += '<span class="r-edu-meta">' + PIPE + '</span>' +
                         F('year', esc(b.year), { plain: true, cls: 'r-edu-meta' });
        var out = P('r-edu', b.line, 'edu', b.form || 'dash', e);
        if (b.note) {
          /* A note written on the degree's own line is written back with it. */
          out += b.noteLine === b.line
            ? P('r-note', b.line, '', '', F('note', inlineHtml(b.note), { blk: true }))
            : P('r-note', b.noteLine, 'para', '', F('text', inlineHtml(b.note), { blk: true }));
        }
        return out;
      }
      case 'bullet':
        return P('r-bullet', b.line, 'bullet', '',
          F('text', (b.label ? '<strong>' + esc(b.label) + ': </strong>' : '') +
                    inlineHtml(b.text), { blk: true }));
      default:
        return P('r-para', b.line, 'para', '', F('text', inlineHtml(b.text), { blk: true }));
    }
  }

  function renderPreview() {
    var h = model.header, out = '';
    var hl = h.lines || {};
    if (h.name) out += P('r-name', hl.name, 'name', '', F('text', esc(h.name), { blk: true, plain: true }));
    if (h.contactRaw) {
      out += P('r-contact', hl.contact, 'contact', '',
               F('text', inlineHtml(h.contactRaw.replace(/\s*\|\s*/g, '   |   ')), { blk: true }));
    }
    if (h.headline) out += P('r-headline', hl.headline, 'headline', '', F('text', inlineHtml(h.headline), { blk: true }));
    if (h.subline) out += P('r-subline', hl.subline, 'para', '', F('text', inlineHtml(h.subline), { blk: true }));

    skillTick = 0;
    model.sections.forEach(function (s) {
      if (s.name) out += P('r-section', s.line, 'section', '', F('text', esc(s.name), { blk: true, plain: true }));
      s.blocks.forEach(function (b) { out += blockHtml(b); });
    });

    el.sheet.innerHTML = out;
    hlEl = null;
    syncHighlight(false);
    measurePages();
    fitPreview();
  }

  /* The sheet is a fixed A4 width. Rather than force a horizontal scrollbar
   * on a laptop, scale it down to whatever width the column has. Transforms do
   * not change layout metrics, so the page measurement below stays honest. */
  function fitPreview() {
    var avail = el.stage.clientWidth;
    var natural = el.wrap.offsetWidth;
    if (!avail || !natural) return;
    var scale = Math.min(1, avail / natural);
    el.wrap.style.transform = scale < 1 ? 'scale(' + scale + ')' : '';
    el.scaler.style.width = Math.round(natural * scale) + 'px';
    el.scaler.style.height = Math.round(el.wrap.offsetHeight * scale) + 'px';
  }

  /* Page count is an estimate. The preview uses the same page size, margins and
   * type scale as the .docx, but a browser and Word break lines differently, so
   * treat a result right on the boundary as "check it in Word". */
  function measurePages() {
    var probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;height:297mm';
    document.body.appendChild(probe);
    var pageH = probe.offsetHeight;
    document.body.removeChild(probe);

    var padY = parseFloat(getComputedStyle(el.sheet).paddingTop) || 0;
    var usable = pageH - 2 * padY;
    var contentH = el.sheet.scrollHeight - 2 * padY;
    var count = Math.max(1, Math.ceil(contentH / usable));

    el.rules.innerHTML = '';
    for (var i = 1; i < count; i++) {
      var line = document.createElement('div');
      line.className = 'page-rule';
      line.style.top = (padY + i * usable) + 'px';
      line.dataset.label = 'page ' + (i + 1);
      el.rules.appendChild(line);
    }
    el.pages.textContent = '~' + count + (count === 1 ? ' page' : ' pages');
    el.pages.title = 'Estimated. A browser and Word break lines differently.';
  }

  /* ------------------------------------------------------------ highlight
   * While the caret is in the Markdown, the block it belongs to is marked on
   * the sheet: the last element starting at or before the caret's line. */

  var hlEl = null;

  function caretLine() {
    var v = el.editor.value, pos = el.editor.selectionStart, n = 0;
    for (var i = v.indexOf('\n'); i !== -1 && i < pos; i = v.indexOf('\n', i + 1)) n++;
    return n;
  }

  function clearHighlight() {
    if (hlEl) hlEl.classList.remove(HL_CLASS);
    hlEl = null;
  }

  function syncHighlight(scroll) {
    if (document.activeElement !== el.editor) { clearHighlight(); return; }
    var line = caretLine(), best = null, bestLine = -1;
    var nodes = el.sheet.querySelectorAll('[data-line]');
    for (var i = 0; i < nodes.length; i++) {
      var n = +nodes[i].getAttribute('data-line');
      if (n <= line && n >= bestLine) { best = nodes[i]; bestLine = n; }
    }
    if (best === hlEl) return;
    clearHighlight();
    hlEl = best;
    if (!hlEl) return;
    hlEl.classList.add(HL_CLASS);
    if (!scroll) return;
    var r = hlEl.getBoundingClientRect(), s = el.stage.getBoundingClientRect();
    if (r.top < s.top + 12 || r.bottom > s.bottom - 12) {
      el.stage.scrollTop += r.top - s.top - s.height / 3;
    }
  }

  /* --------------------------------------------------------------- render */

  function reparse() {
    model = window.ResumeParse.parse(el.editor.value);
    renderPreview();
    el.download.disabled = !window.docx || !el.editor.value.trim();
  }

  function scheduleReparse() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () {
      timer = null;
      prefs.md = el.editor.value;
      savePrefs();
      reparse();
    }, DEBOUNCE_MS);
  }

  function setMarkdown(md, label) {
    el.editor.value = md;
    prefs.md = md;
    savePrefs();
    if (label !== undefined) el.source.textContent = label;
    reparse();
  }

  /* ------------------------------------------------- editing on the sheet
   * DOM back to Markdown. Only the three inline marks the parser knows are
   * written; any other markup a browser adds while editing is flattened. */

  function tidy(s) {
    return s.replace(/​/g, '').replace(/[ \s]+/g, ' ');
  }

  function mark(inner, m) {
    var core = inner.trim();
    if (!core) return inner;
    /* Keep spaces outside the marks so "**Label:** text" stays parseable. */
    return inner.match(/^\s*/)[0] + m + core + m + inner.match(/\s*$/)[0];
  }

  function inlineMd(node) {
    var out = '';
    for (var c = node.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) { out += c.nodeValue; continue; }
      if (c.nodeType !== 1) continue;
      var tag = c.tagName, inner = inlineMd(c);
      if (tag === 'STRONG' || tag === 'B') out += mark(inner, '**');
      else if (tag === 'EM' || tag === 'I') out += mark(inner, '*');
      else if (tag === 'A' && c.getAttribute('href') && inner.trim()) {
        out += '[' + inner.trim() + '](' + c.getAttribute('href') + ')';
      } else if (tag === 'BR') out += ' ';
      else out += inner;
    }
    return out;
  }

  function fieldMd(span) {
    var raw = span.hasAttribute('data-p') ? span.textContent : inlineMd(span);
    return tidy(raw).trim();
  }

  function bare(s) { return s.replace(/\*+/g, '').trim(); }

  function join(parts) { return parts.filter(Boolean).join(' | '); }

  /* One block's fields -> its line of Markdown, in the form it was written. */
  function lineMd(kind, form, f) {
    switch (kind) {
      case 'name':     return '# ' + f.text;
      case 'contact':  return f.text.replace(/\s*\|\s*/g, ' | ');
      case 'headline': return '**' + bare(f.text) + '**';
      case 'section':  return '## ' + f.text;
      case 'role':
        /* A title that holds a pipe is kept in bold so it still reads as one field. */
        return '### ' + join([f.role.indexOf('|') < 0 ? f.role : '**' + f.role + '**',
                              f.org, f.dates]);
      case 'context':  return form === 'ital' ? '*' + bare(f.text) + '*' : f.text;
      case 'subhead':  return '#### ' + f.text;
      case 'callout':  return '***' + bare(f.text) + '***';
      case 'skill':
        if (form === 'table') return '| ' + (f.label || '') + ' | ' + f.text + ' |';
        return f.label ? '**' + f.label + '** - ' + f.text : f.text;
      case 'edu':
        if (form === 'atx') return '### ' + join([f.degree, f.school, f.year]);
        if (form === 'bullet') return '- ' + join([f.degree, f.school, f.year]);
        if (form === 'comma') {
          return '**' + f.degree + '**' + (f.school ? ', ' + f.school : '') +
                 (f.year ? ', ' + f.year : '') + (f.note ? '. ' + f.note : '');
        }
        return '**' + f.degree + '** - ' + (f.school || '') +
               (f.year ? ' *' + f.year + '*' : '');
      case 'bullet':   return '- ' + f.text;
      default:         return f.text;
    }
  }

  function lineOf(node) {
    var p = node && node.closest ? node.closest('[data-line]') : null;
    return p ? +p.getAttribute('data-line') : -1;
  }

  function setLine(n, text) {
    var lines = el.editor.value.split('\n');
    lines[n] = text;
    el.editor.value = lines.join('\n');
    prefs.md = el.editor.value;
    savePrefs();
  }

  /* Write the block at source line `n` back from what is on the sheet. The
   * sheet is left alone: it already shows what was typed, and rebuilding it
   * mid-keystroke would throw the caret away. */
  function commitLine(n) {
    var nodes = el.sheet.querySelectorAll('[data-line="' + n + '"]');
    var kind = '', form = '', f = {};
    for (var i = 0; i < nodes.length; i++) {
      if (!kind && nodes[i].dataset.k) {
        kind = nodes[i].dataset.k;
        form = nodes[i].dataset.v || '';
      }
      var spans = nodes[i].querySelectorAll('[data-f]');
      for (var j = 0; j < spans.length; j++) f[spans[j].dataset.f] = fieldMd(spans[j]);
    }
    if (!kind) return;
    setLine(n, lineMd(kind, form, f));
    model = window.ResumeParse.parse(el.editor.value);
    el.source.textContent = 'edited on the sheet';
    measurePages();
    fitPreview();
  }

  function activeField() {
    var a = document.activeElement;
    return a && a.classList && a.classList.contains('ed') && el.sheet.contains(a) ? a : null;
  }

  function focusLine(n, atEnd) {
    var f = el.sheet.querySelector('[data-line="' + n + '"] .ed');
    if (!f) return;
    f.focus();
    var r = document.createRange();
    r.selectNodeContents(f);
    r.collapse(!atEnd);
    var s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
  }

  /* Enter in a bullet starts the next bullet, carrying over whatever sat to
   * the right of the caret. */
  function splitBullet(field) {
    var sel = window.getSelection();
    if (!sel.rangeCount) return;
    var r = sel.getRangeAt(0);
    r.deleteContents();
    var tail = document.createRange();
    tail.selectNodeContents(field);
    tail.setStart(r.endContainer, r.endOffset);
    var holder = document.createElement('span');
    holder.appendChild(tail.extractContents());
    var n = lineOf(field);
    commitLine(n);
    var lines = el.editor.value.split('\n');
    lines.splice(n + 1, 0, '- ' + tidy(inlineMd(holder)).trim());
    setMarkdown(lines.join('\n'));
    focusLine(n + 1, false);
  }

  function removeLine(field) {
    var n = lineOf(field), prev = -1;
    var nodes = el.sheet.querySelectorAll('[data-line]');
    for (var i = 0; i < nodes.length; i++) {
      var k = +nodes[i].getAttribute('data-line');
      if (k < n && k > prev) prev = k;
    }
    var lines = el.editor.value.split('\n');
    lines.splice(n, 1);
    setMarkdown(lines.join('\n'));
    if (prev >= 0) focusLine(prev, true);
  }

  function linkOnSheet() {
    var sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) {
      setStatus('Select the words to turn into a link first.', 'err');
      return;
    }
    var saved = sel.getRangeAt(0).cloneRange(), field = activeField();
    prompting = true;                 // the dialog blurs the field; do not rebuild
    var url = window.prompt('Link address', 'https://');
    prompting = false;
    if (field) field.focus();
    if (!url || url === 'https://') return;
    sel.removeAllRanges();
    sel.addRange(saved);
    document.execCommand('createLink', false, url.trim());
  }

  function format(what) {
    var field = activeField();
    if (field) {
      if (field.hasAttribute('data-p')) {
        setStatus('Headings, titles and dates carry their own style. Bold, italic and links work in body text.', 'err');
        return;
      }
      setStatus('');
      if (what === 'link') linkOnSheet();
      else document.execCommand(what, false, null);
      return;
    }
    el.editor.focus();
    if (what === 'bold') wrapSelection('**');
    else if (what === 'italic') wrapSelection('*');
    else insertLink();
  }

  el.sheet.addEventListener('input', function (e) {
    var field = e.target.closest ? e.target.closest('.ed') : null;
    if (field) commitLine(lineOf(field));
  });

  el.sheet.addEventListener('keydown', function (e) {
    var field = activeField();
    if (!field) return;
    var mod = (e.ctrlKey || e.metaKey) && !e.altKey;
    if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); format('link'); return; }
    if (mod && (e.key.toLowerCase() === 'b' || e.key.toLowerCase() === 'i') &&
        field.hasAttribute('data-p')) { e.preventDefault(); return; }
    var kind = field.closest('[data-k]') ? field.closest('[data-k]').dataset.k : '';
    if (e.key === 'Enter') {
      e.preventDefault();
      if (kind === 'bullet' && !e.shiftKey) splitBullet(field);
      return;
    }
    if (e.key === 'Backspace' && kind === 'bullet' && !tidy(field.textContent).trim()) {
      e.preventDefault();
      removeLine(field);
    }
  });

  /* Pasting into the sheet brings text only, on one line. */
  el.sheet.addEventListener('paste', function (e) {
    if (!activeField()) return;
    e.preventDefault();
    var text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text.replace(/\s*[\r\n]+\s*/g, ' '));
  });
  el.sheet.addEventListener('drop', function (e) { e.preventDefault(); });

  /* Entering a field brings its line into view in the Markdown column. */
  el.sheet.addEventListener('focusin', function (e) {
    var n = lineOf(e.target);
    if (n < 0 || document.body.classList.contains('writer')) return;
    var total = el.editor.value.split('\n').length || 1;
    el.editor.scrollTop = Math.max(0,
      (n / total) * el.editor.scrollHeight - el.editor.clientHeight / 2);
  });

  /* Leaving the sheet rebuilds it from the Markdown, which settles anything
   * the edit changed structurally (a line that is now a different block). */
  el.sheet.addEventListener('focusout', function (e) {
    if (prompting || (e.relatedTarget && el.sheet.contains(e.relatedTarget))) return;
    if (model) reparse();
  });

  /* ------------------------------------------------------------- download */

  function download() {
    if (!el.editor.value.trim()) return;
    model = window.ResumeParse.parse(el.editor.value);
    el.download.disabled = true;
    var original = el.download.textContent;
    el.download.textContent = 'Building...';

    setTimeout(function () {
      try {
        var doc = window.ResumeRender.build(model);
        window.docx.Packer.toBlob(doc).then(function (blob) {
          var filename = ensureDocx(el.filename.value);
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          setStatus('Downloaded ' + filename, 'ok');
        }).catch(function (e) {
          setStatus('Could not package the .docx: ' + e, 'err');
        }).then(function () {
          el.download.disabled = false;
          el.download.textContent = original;
        });
      } catch (e) {
        setStatus('Could not build the .docx: ' + e, 'err');
        el.download.disabled = false;
        el.download.textContent = original;
      }
    }, 0);
  }

  /* ------------------------------------------------------ Markdown column */

  el.editor.addEventListener('input', scheduleReparse);
  el.editor.addEventListener('blur', clearHighlight);
  document.addEventListener('selectionchange', function () {
    if (document.activeElement === el.editor && model) syncHighlight(true);
  });

  function wrapSelection(mark) {
    var ed = el.editor, s = ed.selectionStart, e = ed.selectionEnd;
    var sel = ed.value.slice(s, e) || 'text';
    ed.value = ed.value.slice(0, s) + mark + sel + mark + ed.value.slice(e);
    ed.focus();
    ed.setSelectionRange(s + mark.length, s + mark.length + sel.length);
    scheduleReparse();
  }

  function insertLink() {
    var ed = el.editor, s = ed.selectionStart, e = ed.selectionEnd;
    var sel = ed.value.slice(s, e) || 'link text';
    var url = 'https://';
    ed.value = ed.value.slice(0, s) + '[' + sel + '](' + url + ')' + ed.value.slice(e);
    ed.focus();
    var u = s + sel.length + 3;
    ed.setSelectionRange(u, u + url.length);
    scheduleReparse();
  }

  el.editor.addEventListener('keydown', function (e) {
    if (e.key === 'Tab' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      /* Tab indents instead of leaving the editor. */
      e.preventDefault();
      var start = el.editor.selectionStart, end = el.editor.selectionEnd;
      var v = el.editor.value;
      el.editor.value = v.slice(0, start) + '  ' + v.slice(end);
      el.editor.selectionStart = el.editor.selectionEnd = start + 2;
      scheduleReparse();
      return;
    }
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    var k = e.key.toLowerCase();
    if (k === 'b') { e.preventDefault(); wrapSelection('**'); }
    else if (k === 'i') { e.preventDefault(); wrapSelection('*'); }
    else if (k === 'k') { e.preventDefault(); insertLink(); }
  });

  function readFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () { setMarkdown(String(reader.result), file.name); };
    reader.onerror = function () { setStatus('Could not read that file.', 'err'); };
    reader.readAsText(file);
  }

  el.open.addEventListener('click', function () { el.file.click(); });
  el.file.addEventListener('change', function () {
    readFile(el.file.files[0]);
    el.file.value = '';               // so re-opening the same file still fires
  });

  ['dragenter', 'dragover'].forEach(function (ev) {
    el.editor.addEventListener(ev, function (e) {
      e.preventDefault();
      el.editor.classList.add('over');
    });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    el.editor.addEventListener(ev, function (e) {
      e.preventDefault();
      el.editor.classList.remove('over');
    });
  });
  el.editor.addEventListener('drop', function (e) {
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      readFile(e.dataTransfer.files[0]);
    }
  });

  /* ------------------------------------------------------------------ bar */

  function setView(view) {
    prefs.view = view === 'writer' ? 'writer' : 'split';
    document.body.classList.toggle('writer', prefs.view === 'writer');
    el.vSplit.setAttribute('aria-pressed', String(prefs.view === 'split'));
    el.vWriter.setAttribute('aria-pressed', String(prefs.view === 'writer'));
    savePrefs();
    if (model) { measurePages(); fitPreview(); }
  }

  el.vSplit.addEventListener('click', function () { setView('split'); });
  el.vWriter.addEventListener('click', function () { setView('writer'); });

  /* Format buttons must not take focus, or the selection they act on is gone. */
  el.bar.addEventListener('mousedown', function (e) {
    if (e.target.closest('[data-fmt]')) e.preventDefault();
  });
  el.bar.addEventListener('click', function (e) {
    var b = e.target.closest('[data-fmt]');
    if (b) format(b.dataset.fmt);
  });

  el.flow.addEventListener('toggle', function () {
    if (model) fitPreview();
  });

  el.sample.addEventListener('click', loadSample);

  el.role.addEventListener('input', function () {
    prefs.role = el.role.value;
    syncFilename();
    savePrefs();
  });

  el.filename.addEventListener('input', function () {
    prefs.filenameEdited = el.filename.value.trim() !== '' &&
                           el.filename.value.trim() !== defaultFilename();
    prefs.filename = el.filename.value;
    if (!prefs.filenameEdited) syncFilename();
    savePrefs();
  });

  el.download.addEventListener('click', download);
  window.addEventListener('resize', function () {
    if (model) { measurePages(); fitPreview(); }
  });

  /* ---------------------------------------------------------------- start */

  function loadSample() {
    return fetch(SAMPLE)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (md) { setMarkdown(md, SAMPLE.split('/').pop()); })
      .catch(function (err) {
        setStatus(location.protocol === 'file:'
          ? 'Opened over file://, so the browser blocks loading the sample. ' +
            'Paste your Markdown instead, or serve the folder over HTTP.'
          : 'Could not load the sample (' + err + '). Paste instead.',
          'err');
      });
  }

  loadPrefs();
  el.role.value = prefs.role;
  syncFilename();
  if (prefs.filenameEdited && prefs.filename) el.filename.value = prefs.filename;
  setView(prefs.view);

  if (!window.docx) {
    setStatus('The docx library did not load, so download is unavailable. ' +
              'Check your network or ad blocker.', 'err');
  }

  if (prefs.md) {
    setMarkdown(prefs.md, 'restored from this browser');
  } else {
    reparse();
    loadSample();
  }
})();
