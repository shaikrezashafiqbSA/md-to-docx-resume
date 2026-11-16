/* tailor.js - builds the prompt package: instructions + master resume
 * repository + job description(s), ready to paste into whichever LLM is in
 * use. The page calls no model itself; it only assembles and copies text. */
(function () {
  'use strict';

  var Kit = window.Kit;
  var KEY = 'kit.jds';
  var DRESSER = 'resume-render.v2';

  var $ = function (id) { return document.getElementById(id); };
  var el = { list: $('list'), add: $('new'), del: $('del'),
             title: $('f-title'), company: $('f-company'), fit: $('f-fit'), url: $('f-url'), jd: $('jd'),
             pIns: $('p-ins'), pRepo: $('p-repo'), pJd: $('p-jd'),
             sIns: $('s-ins'), sRepo: $('s-repo'), sJd: $('s-jd'),
             mode: $('mode'), preview: $('preview'), copy: $('copy'), size: $('size'),
             resume: $('resume'), dress: $('dress') };

  var state = Kit.load(KEY, null) || {};
  state.items = state.items || [];
  state.parts = state.parts || { ins: true, repo: true, jd: true };
  state.mode = state.mode || 'standard';
  var docs = { instructions: null, repository: null };

  var ASK = {
    standard: ['Run Turn 1 (vetting and recall questions) for the job description above.',
               'Run Turn 1 (vetting and recall questions) for each job description above, one at a time, starting with the first.'],
    quick:    ['Quick look. Run Diagnostic mode on the job description above.',
               'Quick look. Run Diagnostic mode on each job description above. Give one table, one row per job, ranked by fit: position, organisation, fit %, required-keyword coverage, ATS estimate, strongest angle, top gap.'],
    straight: ['Straightaway. Skip the recall questions and write the optimised resume for the job description above.',
               'Straightaway. Skip the recall questions and write one optimised resume for each job description above.']
  };

  function persist() { Kit.save(KEY, state); }

  function current() {
    for (var i = 0; i < state.items.length; i++) if (state.items[i].id === state.current) return state.items[i];
    return null;
  }

  function newJd() {
    var jd = { id: 'jd' + Date.now().toString(36), title: '', company: '', url: '', text: '', fit: '', pick: false };
    state.items.unshift(jd);
    state.current = jd.id;
    persist();
    return jd;
  }

  /* The jobs that go into the package: the ticked ones, else the open one. */
  function chosen() {
    var picked = state.items.filter(function (j) { return j.pick && j.text.trim(); });
    if (picked.length) return picked;
    var c = current();
    return c && c.text.trim() ? [c] : [];
  }

  /* --------------------------------------------------------------- package */

  function jdBlock(j, n, total) {
    var head = [];
    if (j.title) head.push('Position: ' + j.title);
    if (j.company) head.push('Organisation: ' + j.company);
    if (j.url) head.push('Link: ' + j.url);
    return '<job_description' + (total > 1 ? ' number="' + n + '"' : '') + '>\n' +
           (head.length ? head.join('\n') + '\n\n' : '') + j.text.trim() + '\n</job_description>';
  }

  function build() {
    var out = [], jobs = state.parts.jd ? chosen() : [];
    if (state.parts.ins && docs.instructions) {
      out.push('<instructions>\n' + docs.instructions.md.trim() + '\n</instructions>');
    }
    if (state.parts.repo && docs.repository) {
      out.push('<master_resume_repository>\n' + docs.repository.md.trim() + '\n</master_resume_repository>');
    }
    jobs.forEach(function (j, i) { out.push(jdBlock(j, i + 1, jobs.length)); });
    if (jobs.length) out.push(ASK[state.mode][jobs.length > 1 ? 1 : 0]);
    return out.join('\n\n');
  }

  function docNote(span, doc, page) {
    if (doc) { span.textContent = Kit.size(doc.md.length); span.className = 's'; return; }
    span.innerHTML = 'not loaded. <a href="doc.html?d=' + page + '">Open it in step ' +
                     (page === 'instructions' ? 0 : 1) + '</a>';
    span.className = 's warn';
  }

  function renderPackage() {
    var jobs = chosen();
    docNote(el.sIns, docs.instructions, 'instructions');
    docNote(el.sRepo, docs.repository, 'repository');
    el.sJd.textContent = !jobs.length ? 'none pasted yet'
      : jobs.length === 1 ? (jobs[0].title || 'untitled') + ', ' + Kit.size(jobs[0].text.length)
      : jobs.length + ' ticked jobs';
    el.sJd.className = 's' + (jobs.length ? '' : ' warn');
    var text = build();
    el.preview.value = text;
    el.size.textContent = text
      ? Kit.size(text.length) + ', about ' + Math.round(text.length / 4000) + 'k tokens'
      : 'Nothing to copy yet';
    el.copy.disabled = !text;
  }

  /* ------------------------------------------------------------------ list */

  function renderList() {
    el.list.innerHTML = state.items.map(function (j) {
      return '<li data-id="' + j.id + '"' + (j.id === state.current ? ' class="on"' : '') + '>' +
        '<input type="checkbox"' + (j.pick ? ' checked' : '') + ' title="Include in the package">' +
        '<div class="t"><b>' + Kit.esc(j.title || 'Untitled position') + '</b><span>' +
        Kit.esc(j.company || (j.text.trim() ? 'No organisation' : 'Empty')) + '</span></div>' +
        (j.fit !== '' && j.fit !== undefined ? '<span class="fit">' + Kit.esc(j.fit) + '%</span>' : '') +
        '</li>';
    }).join('');
  }

  function renderFields() {
    var j = current();
    el.title.value = j ? j.title : '';
    el.company.value = j ? j.company : '';
    el.url.value = j ? j.url : '';
    el.fit.value = j ? j.fit : '';
    el.jd.value = j ? j.text : '';
  }

  function render() { renderList(); renderFields(); renderPackage(); }

  /* ------------------------------------------------------------------ wire */

  function bind(input, field) {
    input.addEventListener('input', function () {
      var j = current() || newJd();
      j[field] = input.value;
      persist();
      renderList();
      renderPackage();
    });
  }
  bind(el.title, 'title'); bind(el.company, 'company'); bind(el.url, 'url');
  bind(el.fit, 'fit'); bind(el.jd, 'text');

  el.list.addEventListener('click', function (e) {
    var li = e.target.closest('li');
    if (!li) return;
    var id = li.getAttribute('data-id');
    var j = state.items.filter(function (x) { return x.id === id; })[0];
    if (e.target.matches('input[type="checkbox"]')) {
      j.pick = e.target.checked;
      persist();
      renderPackage();
      return;
    }
    state.current = id;
    persist();
    render();
  });

  el.add.addEventListener('click', function () { newJd(); render(); el.title.focus(); });

  el.del.addEventListener('click', function () {
    var j = current();
    if (!j) return;
    if (j.text.trim() && !window.confirm('Delete "' + (j.title || 'this job description') + '"?')) return;
    state.items = state.items.filter(function (x) { return x.id !== j.id; });
    state.current = state.items.length ? state.items[0].id : null;
    persist();
    render();
  });

  [['pIns', 'ins'], ['pRepo', 'repo'], ['pJd', 'jd']].forEach(function (pair) {
    el[pair[0]].checked = state.parts[pair[1]] !== false;
    el[pair[0]].addEventListener('change', function () {
      state.parts[pair[1]] = el[pair[0]].checked;
      persist();
      renderPackage();
    });
  });

  el.mode.value = state.mode;
  el.mode.addEventListener('change', function () {
    state.mode = el.mode.value;
    persist();
    renderPackage();
  });

  el.copy.addEventListener('click', function () {
    var text = build();
    if (!text) return;
    Kit.copy(text).then(function () {
      Kit.toast('Copied ' + Kit.size(text.length) + '. Paste it into your LLM.');
    }).catch(function () {
      el.preview.focus(); el.preview.select();
      Kit.toast('The browser blocked the copy. The package is selected: press Ctrl+C.', 'err');
    });
  });

  /* Hand the LLM's resume to the Dresser through the Dresser's own store. */
  el.dress.addEventListener('click', function () {
    var md = el.resume.value.trim()
      .replace(/^```[a-z]*\s*\n/i, '').replace(/\n```\s*$/, '');
    if (!md) { Kit.toast('Paste the resume Markdown from the LLM first.', 'err'); return; }
    var prefs = Kit.load(DRESSER, {}) || {};
    var j = current();
    prefs.md = md;
    if (j && j.title) { prefs.role = j.title; prefs.filenameEdited = false; }
    Kit.save(DRESSER, prefs);
    location.href = 'index.html';
  });

  /* ----------------------------------------------------------------- start */

  if (!current() && state.items.length) state.current = state.items[0].id;
  render();
  Promise.all([Kit.getDoc('instructions'), Kit.getDoc('repository')]).then(function (found) {
    docs.instructions = found[0];
    docs.repository = found[1];
    renderPackage();
  });
})();
