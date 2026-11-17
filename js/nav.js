/* nav.js - the workflow strip, which is also the navigation, plus the few
 * helpers every page needs. Everything is static: state lives in this
 * browser's localStorage and nothing is sent anywhere. */
(function (global) {
  'use strict';

  var STAGES = [
    { id: 'instructions', name: 'Instructions', href: 'doc.html?d=instructions',
      line: 'The prompt that tells the LLM how to fit and write.', out: 'rules' },
    { id: 'repository', name: 'Repository', href: 'doc.html?d=repository',
      line: 'Your career evidence units, searchable.', out: 'evidence' },
    { id: 'quests', name: 'Quests', href: 'quests.html',
      line: 'The portals to check for postings.', out: 'JD' },
    { id: 'tailor', name: 'Tailor', href: 'tailor.html',
      line: 'Package instructions, evidence and JD for the LLM.', out: 'resume.md' },
    { id: 'dresser', name: 'Dresser', href: 'index.html',
      line: 'Fix the resume on the sheet, download the .docx.', out: '' }
  ];

  var FLOW_KEY = 'kit.flow';

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }

  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { toast('This browser refused to store the change (storage full or blocked).', 'err'); return false; }
  }

  var toastTimer = null;
  function toast(msg, kind) {
    var t = document.querySelector('.kit-toast');
    if (!t) t = document.createElement('p');
    /* An open dialog sits above the page, so the message has to live in it. */
    var host = document.querySelector('dialog[open]') || document.body;
    if (t.parentNode !== host) host.appendChild(t);
    t.className = 'kit-toast' + (kind === 'err' ? ' err' : '');
    t.textContent = msg;
    t.hidden = !msg;
    clearTimeout(toastTimer);
    if (msg) toastTimer = setTimeout(function () { t.hidden = true; }, kind === 'err' ? 7000 : 2600);
  }

  function copy(text) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      return ok ? Promise.resolve() : Promise.reject(new Error('copy blocked'));
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(fallback);
    }
    return fallback();
  }

  function download(name, text) {
    var url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function size(n) {
    return n < 1000 ? n + ' chars' : (n / 1000).toFixed(n < 10000 ? 1 : 0) + 'k chars';
  }

  function renderFlow() {
    var host = document.getElementById('flow');
    if (!host) return;
    var here = document.body.getAttribute('data-page') || '';
    /* Grid columns: a stage sits in column 2i+1, its connector in 2i+2. */
    var at = function (col, row) { return ' style="grid-column:' + col + ';grid-row:' + row + '"'; };
    var html = '<summary>Workflow<span>steps 0 to 4 in order. What you learn while tailoring ' +
               'loops back into the repository. Click a step to go there.</span></summary>' +
               '<div class="flow-grid">';

    /* Row 1: where a new user's repository starts, growing down into step 1. */
    html += '<div class="fl-sprout"' + at(3, 1) + '>' +
            '<a href="doc.html?d=repository&amp;do=start" title="Turn the resume you already have into your first repository">' +
            '<span aria-hidden="true">🌱</span>New here? Start from your resume</a>' +
            '<div class="fl-v"></div></div>';

    /* Row 2: the main line. */
    STAGES.forEach(function (s, i) {
      html += '<a class="fl-stage' + (s.id === here ? ' here' : '') + '" href="' + s.href + '"' +
              at(2 * i + 1, 2) + (s.id === here ? ' aria-current="page"' : '') + '>' +
              '<span class="fl-top"><span class="fl-num">' + i + '</span>' +
              '<span class="fl-name">' + esc(s.name) + '</span></span>' +
              '<p class="fl-line">' + esc(s.line) + '</p></a>';
      if (i < STAGES.length - 1) {
        html += '<div class="fl-link"' + at(2 * i + 2, 2) + '><span>' + esc(s.out) + '</span></div>';
      }
    });

    /* Row 3: the loop back. Tailor (col 7) -> Enrich (col 5) -> Repository (col 3). */
    html += '<div class="fl-elbow out"' + at('3 / 5', 3) + '><i></i><span>new units</span></div>' +
            '<a class="fl-stage sub" href="doc.html?d=repository&amp;do=enrich"' + at(5, 3) + '>' +
            '<span class="fl-top"><span class="fl-num">' + STAGES.length + '</span>' +
            '<span class="fl-name">Enrich repository</span></span>' +
            '<p class="fl-line">Recall answers from tailoring become new evidence units.</p></a>' +
            '<div class="fl-elbow in"' + at('6 / 8', 3) + '><i></i><span>recall answers</span></div>';

    host.innerHTML = html + '</div>';
    host.open = load(FLOW_KEY, true) !== false;
    host.addEventListener('toggle', function () { save(FLOW_KEY, host.open); });
  }

  /* The two working documents. Each lives in this browser once loaded. The
   * shipped copy is only a starting point; the repository is private and is
   * not shipped at all, so on the public site it starts empty. */
  var DOCS = {
    instructions: { title: 'Instructions', key: 'kit.doc.instructions',
                    seed: 'content/resume_prompt_instruction.md',
                    file: 'resume_prompt_instruction.md' },
    repository:   { title: 'Master resume repository', key: 'kit.doc.repository',
                    seed: 'content/master-resume-repository.md',
                    file: 'master-resume-repository.md' }
  };

  function fetchSeed(kind) {
    return fetch(DOCS[kind].seed, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    });
  }

  /* -> Promise<{ md, name, dirty, seed } | null>: the browser's copy, else the
   * seed. A copy that came from the shipped file and was never edited follows
   * the shipped file, so a change to the file shows up without a Reset. */
  function getDoc(kind) {
    var old = load(DOCS[kind].key, null);
    var has = !!(old && typeof old.md === 'string' && old.md.trim());
    if (has && !(old.seed && !old.dirty)) return Promise.resolve(old);
    return fetchSeed(kind).then(function (md) {
      var rec = { md: md, name: DOCS[kind].file, dirty: false, seed: true };
      save(DOCS[kind].key, rec);
      return rec;
    }).catch(function () { return has ? old : null; });
  }

  global.Kit = { DOCS: DOCS, getDoc: getDoc, fetchSeed: fetchSeed, esc: esc, load: load, save: save, toast: toast, copy: copy,
                 download: download, size: size, STAGES: STAGES };
  renderFlow();
})(window);
