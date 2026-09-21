/* app.js - the page: type Markdown, watch the document build, download it.
 *
 * The preview is drawn from the same block model as the .docx rather than from
 * a generic markdown renderer. That is the only way the page ruler can mean
 * anything: if the preview came from a different pipeline, its page breaks
 * would be a different document's page breaks.
 */
(function () {
  'use strict';

  var SAMPLE = 'content/Shaik_Reza_Shafiq_Resume.md';
  var STORE = 'resume-render.v2';
  var DEBOUNCE_MS = 180;
  var BASE_NAME = 'Shaik_Reza_Shafiq_Resume';

  var el = {
    editor:   document.getElementById('editor'),
    file:     document.getElementById('file'),
    open:     document.getElementById('open'),
    sample:   document.getElementById('sample'),
    role:     document.getElementById('role'),
    filename: document.getElementById('filename'),
    fnote:    document.getElementById('filename-note'),
    download: document.getElementById('download'),
    status:   document.getElementById('status'),
    pages:    document.getElementById('pages'),
    source:   document.getElementById('source'),
    stage:    document.querySelector('.stage'),
    scaler:   document.getElementById('scaler'),
    wrap:     document.getElementById('wrap'),
    sheet:    document.getElementById('sheet'),
    rules:    document.getElementById('rules')
  };

  var model = null;         // { header, sections }
  var prefs = { role: '', filename: '', filenameEdited: false, md: '' };
  var timer = null;

  /* ---------------------------------------------------------------- state */

  function loadPrefs() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORE) || '{}');
      prefs.role = saved.role || '';
      prefs.filename = saved.filename || '';
      prefs.filenameEdited = !!saved.filenameEdited;
      prefs.md = typeof saved.md === 'string' ? saved.md : '';
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
    el.fnote.textContent = prefs.filenameEdited
      ? 'Custom name. Clear the box to track the role again.'
      : 'Default. Edit to override.';
  }

  /* -------------------------------------------------------------- preview */

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

  function blockHtml(b) {
    switch (b.t) {
      case 'role': {
        var h = '<p class="r-role">' + esc(b.role) + '</p>';
        if (b.org || b.dates) {
          h += '<p class="r-org">';
          if (b.org) h += '<span class="r-emp">' + inlineHtml(b.org) + '</span>';
          if (b.dates) h += '<span class="r-dates">' + (b.org ? '&nbsp;&nbsp;|&nbsp;&nbsp;' : '') + esc(b.dates) + '</span>';
          h += '</p>';
        }
        return h;
      }
      case 'context':
        return '<p class="r-context">' + inlineHtml(b.text) + '</p>';
      case 'subhead':
        return '<p class="r-subhead">' + esc(b.text) + '</p>';
      case 'callout':
        return '<p class="r-callout">' + inlineHtml(b.text) + '</p>';
      case 'skill': {
        var alt = (skillTick++ % 2 === 1) ? ' alt' : '';
        return '<p class="r-skill' + alt + '">' +
               (b.label ? '<span class="r-skill-label">' + esc(b.label) + '</span>&nbsp;&nbsp;&nbsp;' : '') +
               inlineHtml(b.text) + '</p>';
      }
      case 'edu': {
        var tail = [];
        if (b.school) tail.push(esc(b.school));
        if (b.year) tail.push(esc(b.year));
        var e = '<p class="r-edu"><span class="r-deg">' + esc(b.degree) + '</span>' +
                (tail.length ? '<span class="r-edu-meta">&nbsp;&nbsp;|&nbsp;&nbsp;' +
                  tail.join('&nbsp;&nbsp;|&nbsp;&nbsp;') + '</span>' : '') + '</p>';
        if (b.note) e += '<p class="r-note">' + inlineHtml(b.note) + '</p>';
        return e;
      }
      case 'bullet':
        return '<p class="r-bullet">' +
               (b.label ? '<strong>' + esc(b.label) + ': </strong>' : '') +
               inlineHtml(b.text) + '</p>';
      default:
        return '<p class="r-para">' + inlineHtml(b.text) + '</p>';
    }
  }

  function renderPreview() {
    var h = model.header, out = '';
    if (h.name) out += '<p class="r-name">' + esc(h.name) + '</p>';

    var contact = h.contactText ? inlineHtml(h.contactText) : '';
    (h.contactLinks || []).forEach(function (l) {
      if (contact) contact += '&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;';
      contact += '<a href="' + esc(l.url) + '">' + esc(l.label) + '</a>';
    });
    if (contact) out += '<p class="r-contact">' + contact + '</p>';
    if (h.headline) out += '<p class="r-headline">' + inlineHtml(h.headline) + '</p>';
    if (h.subline) out += '<p class="r-subline">' + inlineHtml(h.subline) + '</p>';

    skillTick = 0;
    model.sections.forEach(function (s) {
      if (s.name) out += '<p class="r-section">' + esc(s.name) + '</p>';
      s.blocks.forEach(function (b) { out += blockHtml(b); });
    });

    el.sheet.innerHTML = out;
    measurePages();
    fitPreview();
  }

  /* The sheet is a fixed 8.5in wide. Rather than force a horizontal scrollbar
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
    el.pages.textContent = count + (count === 1 ? ' page' : ' pages') + ' (estimated)';
  }

  /* --------------------------------------------------------------- render */

  function refresh() {
    if (!model) return;
    renderPreview();
  }

  function reparse() {
    model = window.ResumeParse.parse(el.editor.value);
    refresh();
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
    el.source.textContent = label || '';
    reparse();
  }

  function download() {
    if (!model) return;
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

  /* ----------------------------------------------------------------- wire */

  el.editor.addEventListener('input', scheduleReparse);

  /* Tab indents instead of leaving the editor, which matters when the whole
   * document is written here rather than pasted in. */
  el.editor.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || e.ctrlKey || e.altKey || e.metaKey) return;
    e.preventDefault();
    var start = el.editor.selectionStart, end = el.editor.selectionEnd;
    var v = el.editor.value;
    el.editor.value = v.slice(0, start) + '  ' + v.slice(end);
    el.editor.selectionStart = el.editor.selectionEnd = start + 2;
    scheduleReparse();
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
    else el.fnote.textContent = 'Custom name. Clear the box to track the role again.';
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
            'Type or paste your Markdown instead, or serve the folder over HTTP.'
          : 'Could not load the sample (' + err + '). Type or paste instead.',
          'err');
      });
  }

  loadPrefs();
  el.role.value = prefs.role;
  syncFilename();
  if (prefs.filenameEdited && prefs.filename) el.filename.value = prefs.filename;

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
