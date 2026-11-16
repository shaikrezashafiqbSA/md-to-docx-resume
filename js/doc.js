/* doc.js - Instructions and Repository: one Markdown file shown as blocks.
 *
 * The file is split at every heading. The outline on the left is those
 * headings; picking one shows just that section, the way a tab would. Each
 * block reads as rendered Markdown and edits as raw Markdown, so nothing the
 * page does not understand is ever lost. The Markdown is the only state.
 */
(function () {
  'use strict';

  var Kit = window.Kit, Md = window.KitMd;
  var kind = document.body.getAttribute('data-page') === 'repository' ? 'repository' : 'instructions';
  var cfg = Kit.DOCS[kind];
  var EU_RE = /^EU-([A-Z0-9]+)-(\d+)/;

  var $ = function (id) { return document.getElementById(id); };
  var el = { title: $('title'), search: $('search'), count: $('count'), state: $('state'),
             wholeBtn: $('whole-btn'), open: $('open'), reset: $('reset'), copy: $('copy'),
             save: $('save'), file: $('file'), outline: $('outline'), where: $('where'),
             body: $('body'), cards: $('cards'), whole: $('whole') };

  var rec = { md: '', name: cfg.file, dirty: false };
  var list = [];          // chunks
  var view = -1;          // index of the section on show, -1 for everything
  var query = '';
  var editing = -1;
  var handle = null;      // File System Access handle, when the browser has it
  var whole = false;

  /* ------------------------------------------------------------ structure */

  function sectionEnd(i) {
    if (list[i].level === 0) return i + 1;
    for (var j = i + 1; j < list.length; j++) {
      if (list[j].level > 0 && list[j].level <= list[i].level) return j;
    }
    return list.length;
  }

  function parents(i) {
    var out = [], lvl = list[i].level || 7;
    for (var j = i - 1; j >= 0 && lvl > 1; j--) {
      if (list[j].level > 0 && list[j].level < lvl) { out.unshift(list[j].title); lvl = list[j].level; }
    }
    return out;
  }

  /* The outline entry a block belongs under: itself, or its nearest heading
   * of level 3 or shallower. */
  function anchor(i) {
    for (var j = i; j >= 0; j--) if (list[j].level <= 3) return j;
    return -1;
  }

  function label(c) { return c.level === 0 ? 'Opening text' : (c.title || 'Untitled'); }

  function setMd(md, keepView) {
    rec.md = md;
    list = Md.chunks(md);
    if (!keepView || view >= list.length) view = -1;
    editing = -1;
  }

  function persist() {
    rec.md = Md.join(list);
    rec.dirty = true;
    Kit.save(cfg.key, rec);
  }

  /* -------------------------------------------------------------- outline */

  function renderOutline() {
    var html = '<li class="all"><a data-i="-1"' + (view < 0 && !query ? ' class="on"' : '') +
               '>All sections<span class="n">' + list.length + '</span></a></li>';
    var openFrom = view >= 0 ? view : -1, openTo = view >= 0 ? sectionEnd(view) : -1;
    list.forEach(function (c, i) {
      var deep = c.level > 3;
      if (deep && !(i > openFrom && i < openTo)) return;
      var kids = sectionEnd(i) - i - 1;
      html += '<li class="l' + c.level + '"><a data-i="' + i + '"' +
              (i === view && !query ? ' class="on"' : '') + '>' + Kit.esc(label(c)) +
              (kids && !deep ? '<span class="n">' + kids + '</span>' : '') + '</a></li>';
    });
    el.outline.innerHTML = html;
  }

  /* ---------------------------------------------------------------- cards */

  function terms() {
    return query.toLowerCase().split(/\s+/).filter(Boolean);
  }

  function shown() {
    var out = [], i;
    if (query) {
      var t = terms();
      for (i = 0; i < list.length; i++) {
        var hay = list[i].raw.toLowerCase();
        if (t.every(function (w) { return hay.indexOf(w) !== -1; })) out.push(i);
      }
      return out;
    }
    var from = view < 0 ? 0 : view, to = view < 0 ? list.length : sectionEnd(view);
    for (i = from; i < to; i++) out.push(i);
    return out;
  }

  function cardHtml(i) {
    var c = list[i];
    var acts = '<button data-act="add" title="Add a block after this one">Add below</button>';
    if (kind === 'repository' && c.level === 3) {
      acts = '<button data-act="unit" title="Add an evidence unit at the end of this stack">Add unit</button>' + acts;
    }
    acts += '<button data-act="copy" title="Copy this block">Copy</button>' +
            '<button data-act="del" class="danger" title="Delete this block">Delete</button>';
    var crumb = query ? parents(i).join('  ›  ') : '';
    return '<div class="card l' + c.level + '" data-i="' + i + '">' +
           (crumb ? '<div class="crumb">' + Kit.esc(crumb) + '</div>' : '') +
           '<div class="acts">' + acts + '</div>' +
           '<div class="view">' + Md.html(c.raw) + '</div></div>';
  }

  function highlight(root) {
    var t = terms();
    if (!t.length) return;
    var re = new RegExp('(' + t.map(function (w) {
      return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('|') + ')', 'gi');
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (node) {
      if (!re.test(node.nodeValue)) return;
      re.lastIndex = 0;
      var span = document.createElement('span');
      span.innerHTML = Kit.esc(node.nodeValue).replace(re, '<mark>$1</mark>');
      node.parentNode.replaceChild(span, node);
    });
  }

  function renderCards() {
    var ids = shown();
    if (!list.length) {
      el.cards.innerHTML = '<div class="empty"><b>Nothing loaded yet.</b><br>' +
        (kind === 'repository'
          ? 'Already have a repository file? Press <b>Open</b> and pick it, or press <b>Whole file</b> ' +
            'and paste it in. It is kept in this browser only and is never uploaded.<br><br>' +
            '<b>Starting from scratch?</b> All you need is your current resume. A starter prompt has ' +
            'any LLM turn it into a repository of evidence units, and recall rounds enrich it after that.' +
            '<br><button class="primary start-btn" data-start>Start from your resume</button>'
          : 'Press <b>Open</b> to load your instruction file, or <b>Whole file</b> to paste it in.') +
        '</div>';
    } else if (!ids.length) {
      el.cards.innerHTML = '<div class="empty">No block contains <b>' + Kit.esc(query) + '</b>.</div>';
    } else {
      el.cards.innerHTML = ids.map(cardHtml).join('');
      if (query) highlight(el.cards);
    }
    el.where.textContent = query ? 'Search results'
      : view < 0 ? 'All sections' : label(list[view]);
    renderMeta(ids.length);
  }

  function renderMeta(n) {
    var units = list.filter(function (c) { return EU_RE.test(c.title); }).length;
    el.count.textContent = query
      ? n + ' of ' + list.length + ' blocks'
      : list.length + ' blocks' + (units ? ' · ' + units + ' units' : '') + ' · ' + Kit.size(rec.md.length);
    el.state.textContent = !list.length ? ''
      : rec.dirty ? 'Changes kept in this browser, not yet in a file' : 'In step with ' + rec.name;
    el.state.className = 'meta' + (rec.dirty ? ' warn' : '');
  }

  function render() {
    renderOutline();
    renderCards();
  }

  function scrollToCard(i) {
    var card = el.cards.querySelector('.card[data-i="' + i + '"]');
    if (card) el.body.scrollTop = card.offsetTop - 10;
    return card;
  }

  /* -------------------------------------------------------------- editing */

  function startEdit(i) {
    if (editing === i) return;
    if (editing >= 0) commitEdit();
    var card = el.cards.querySelector('.card[data-i="' + i + '"]');
    if (!card) return;
    editing = i;
    card.classList.add('editing');
    var viewEl = card.querySelector('.view');
    var ta = document.createElement('textarea');
    ta.spellcheck = false;
    ta.value = list[i].raw.replace(/\s+$/, '');
    var hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = 'Markdown. A line starting with # starts a new block.';
    viewEl.replaceWith(ta);
    card.appendChild(hint);
    var fit = function () { ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 4) + 'px'; };
    ta.addEventListener('input', fit);
    ta.addEventListener('blur', function () { if (editing === i) commitEdit(); });
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); editing = -1; render(); }
      else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); commitEdit(); }
    });
    fit();
    ta.focus();
  }

  function commitEdit() {
    var i = editing;
    if (i < 0) return;
    editing = -1;
    var ta = el.cards.querySelector('.card[data-i="' + i + '"] textarea');
    if (!ta) return;
    var text = ta.value.replace(/\s+$/, '');
    if (text === list[i].raw.replace(/\s+$/, '')) { render(); return; }
    var top = el.body.scrollTop;
    if (text) list[i].raw = text + '\n'; else list.splice(i, 1);
    persist();
    setMd(rec.md, true);       // an edit may have added or removed headings
    render();
    el.body.scrollTop = top;
  }

  function nextUnitId(prefix) {
    var max = 0;
    list.forEach(function (c) {
      var m = EU_RE.exec(c.title);
      if (m && m[1] === prefix) max = Math.max(max, +m[2]);
    });
    var n = String(max + 1);
    return 'EU-' + prefix + '-' + (n.length < 2 ? '0' + n : n);
  }

  function unitText(prefix, level) {
    return new Array(level + 1).join('#') + ' **' + nextUnitId(prefix) + ' · Title**\n\n' +
           '* Tags: \n* Canonical: \n* Notes: \n';
  }

  function insertAt(pos, raw) {
    if (pos > 0 && !/\n\s*\n$/.test(list[pos - 1].raw + '\n')) list[pos - 1].raw += '\n';
    list.splice(pos, 0, { level: 0, title: '', raw: raw });
    persist();
    query = ''; el.search.value = '';
    setMd(rec.md, true);
    render();
    scrollToCard(pos);
    startEdit(pos);
  }

  function addBelow(i) {
    var c = list[i], m = EU_RE.exec(c.title);
    var level = c.level || 2;
    var raw = m ? unitText(m[1], level)
      : new Array(level + 1).join('#') + (/^#+\s+\*\*/.test(c.raw) ? ' **New section**' : ' New section') + '\n\nText.\n';
    insertAt(sectionEnd(i), raw);
  }

  function addUnit(i) {
    var end = sectionEnd(i), prefix = '';
    for (var j = i + 1; j < end && !prefix; j++) {
      var m = EU_RE.exec(list[j].title);
      if (m) prefix = m[1];
    }
    if (!prefix) {
      var t = /\b([A-Z]{2,6})-\d+\b/.exec(list[i].title);
      prefix = t ? t[1] : 'NEW';
    }
    insertAt(end, unitText(prefix, 4));
  }

  function removeBlock(i) {
    var end = sectionEnd(i), n = end - i;
    var msg = n > 1
      ? 'Delete "' + label(list[i]) + '" and the ' + (n - 1) + ' blocks under it?'
      : 'Delete "' + label(list[i]) + '"?';
    if (!window.confirm(msg)) return;
    list.splice(i, n);
    persist();
    setMd(rec.md, true);
    render();
  }

  /* ----------------------------------------------------------------- file */

  function loaded(md, name) {
    rec = { md: md, name: name || cfg.file, dirty: false };
    Kit.save(cfg.key, rec);
    query = ''; el.search.value = '';
    setMd(md, false);
    if (whole) el.whole.value = md;
    render();
  }

  function openFile() {
    if (!window.showOpenFilePicker) { el.file.click(); return; }
    window.showOpenFilePicker({
      types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md', '.markdown', '.txt'] } }]
    }).then(function (picked) {
      handle = picked[0];
      return handle.getFile();
    }).then(function (f) {
      return f.text().then(function (text) { loaded(text, f.name); });
    }).catch(function (e) {
      if (e && e.name !== 'AbortError') Kit.toast('Could not open that file.', 'err');
    });
  }

  function saveFile() {
    if (editing >= 0) commitEdit();
    var done = function (how) {
      rec.dirty = false;
      Kit.save(cfg.key, rec);
      renderMeta(shown().length);
      Kit.toast(how);
    };
    var write = function (h) {
      return h.createWritable().then(function (w) {
        return w.write(rec.md).then(function () { return w.close(); });
      }).then(function () { handle = h; rec.name = h.name; done('Saved to ' + h.name); });
    };
    var fallback = function () { Kit.download(rec.name || cfg.file, rec.md); done('Downloaded ' + (rec.name || cfg.file)); };
    if (handle) { write(handle).catch(fallback); return; }
    if (!window.showSaveFilePicker) { fallback(); return; }
    window.showSaveFilePicker({ suggestedName: rec.name || cfg.file,
      types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }]
    }).then(write).catch(function (e) { if (e && e.name !== 'AbortError') fallback(); });
  }

  function setWhole(on) {
    if (editing >= 0) commitEdit();
    whole = on;
    el.wholeBtn.setAttribute('aria-pressed', String(on));
    el.wholeBtn.textContent = on ? 'Back to blocks' : 'Whole file';
    el.whole.hidden = !on;
    el.body.hidden = on;
    el.search.disabled = on;
    if (on) { el.whole.value = rec.md; el.whole.focus(); }
    else render();
  }

  /* ----------------------------------------------------------------- wire */

  el.outline.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-i]');
    if (!a) return;
    if (whole) setWhole(false);
    if (editing >= 0) commitEdit();
    var i = +a.getAttribute('data-i');
    query = ''; el.search.value = '';
    if (i >= 0 && list[i].level > 3) {
      view = anchor(i);
      render();
      scrollToCard(i);
      return;
    }
    view = i;
    render();
    el.body.scrollTop = 0;
  });

  el.cards.addEventListener('mousedown', function (e) {
    /* Keep the textarea focused so the action runs on a settled block. */
    if (e.target.closest('.acts')) e.preventDefault();
  });

  el.cards.addEventListener('click', function (e) {
    var card = e.target.closest('.card');
    if (!card) return;
    var i = +card.getAttribute('data-i');
    var act = e.target.closest('[data-act]');
    if (act) {
      if (editing >= 0) { commitEdit(); if (i >= list.length) return; }
      var what = act.getAttribute('data-act');
      if (what === 'add') addBelow(i);
      else if (what === 'unit') addUnit(i);
      else if (what === 'del') removeBlock(i);
      else if (what === 'copy') {
        Kit.copy(Md.join(list.slice(i, sectionEnd(i)))).then(function () { Kit.toast('Copied "' + label(list[i]) + '"'); });
      }
      return;
    }
    if (e.target.closest('a') || e.target.closest('textarea')) return;
    if (window.getSelection && String(window.getSelection())) return;   // selecting text, not editing
    if (e.target.closest('.view')) startEdit(i);
  });

  var searchTimer = null;
  el.search.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      if (editing >= 0) commitEdit();
      query = el.search.value.trim();
      render();
      el.body.scrollTop = 0;
    }, 120);
  });

  var wholeTimer = null;
  el.whole.addEventListener('input', function () {
    clearTimeout(wholeTimer);
    wholeTimer = setTimeout(function () {
      rec.md = el.whole.value;
      rec.dirty = true;
      Kit.save(cfg.key, rec);
      setMd(rec.md, false);
      renderOutline();
      renderMeta(list.length);
    }, 250);
  });

  el.wholeBtn.addEventListener('click', function () { setWhole(!whole); });
  el.open.addEventListener('click', openFile);
  el.file.addEventListener('change', function () {
    var f = el.file.files[0];
    el.file.value = '';
    if (!f) return;
    handle = null;
    f.text().then(function (text) { loaded(text, f.name); });
  });
  el.save.addEventListener('click', saveFile);
  el.copy.addEventListener('click', function () {
    if (editing >= 0) commitEdit();
    Kit.copy(rec.md).then(function () { Kit.toast('Copied the whole document (' + Kit.size(rec.md.length) + ')'); });
  });
  el.reset.addEventListener('click', function () {
    if (!window.confirm('Replace the copy in this browser with the shipped ' + cfg.file + '? Your edits here are lost unless you saved them to a file.')) return;
    Kit.fetchSeed(kind).then(function (md) { handle = null; loaded(md, cfg.file); Kit.toast('Reloaded ' + cfg.file); })
      .catch(function () { Kit.toast('There is no shipped copy to reload.', 'err'); });
  });

  window.addEventListener('beforeunload', function () { if (editing >= 0) commitEdit(); });

  /* ------------------------------------------------- build and enrich
   * The page calls no model. It copies a prompt for whichever LLM is in use
   * and takes that LLM's answer back as pasted text. */

  var dlgStart = $('dlg-start'), dlgRecall = $('dlg-recall');

  function fetchText(path) {
    return fetch(path, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    });
  }

  /* An LLM wraps the file in a code fence and often adds a sentence before
   * and after. Take the fenced part where there is one. */
  function unfence(text) {
    var m = /(`{3,})[a-z]*[ \t]*\n([\s\S]*?)\n\1/i.exec(text);
    return (m ? m[2] : text).trim();
  }

  function copyWith(promptPath, tag, body, what) {
    fetchText(promptPath).then(function (prompt) {
      var text = prompt.trim() + '\n\n<' + tag + '>\n' + body.trim() + '\n</' + tag + '>\n';
      return Kit.copy(text).then(function () {
        Kit.toast('Copied ' + what + ' (' + Kit.size(text.length) + '). Paste it into your LLM.');
      });
    }).catch(function () {
      Kit.toast('Could not load or copy the prompt. Serve the site over HTTP and try again.', 'err');
    });
  }

  function indexOfUnit(id) {
    for (var i = 0; i < list.length; i++) {
      var m = EU_RE.exec(list[i].title);
      if (m && m[0] === id) return i;
    }
    return -1;
  }

  /* Units from a recall round: replace by ID, else file under the stack the
   * LLM wrote them beneath, else after the last unit of the same role. */
  function mergeUnits(text) {
    var incoming = Md.chunks(unfence(text));
    var stack = '', updated = 0, added = 0, loose = [];
    incoming.forEach(function (c) {
      var m = EU_RE.exec(c.title);
      if (!m) {
        var s = /^Stack\s+([A-Z0-9]+-\d+)/.exec(c.title);
        if (c.level > 0 && c.level <= 3) stack = s ? s[1] : '';
        return;
      }
      var raw = c.raw.replace(/\s+$/, '').replace(/^#+/, '####') + '\n';
      var at = indexOfUnit(m[0]);
      if (at >= 0) { list[at].raw = raw; list[at].title = c.title; updated++; return; }

      var pos = -1, i;
      if (stack) {
        var re = new RegExp('^Stack\\s+' + stack + '(?![0-9])');
        for (i = 0; i < list.length; i++) {
          if (list[i].level === 3 && re.test(list[i].title)) { pos = sectionEnd(i); break; }
        }
      }
      if (pos < 0) {
        for (i = list.length - 1; i >= 0; i--) {
          var e = EU_RE.exec(list[i].title);
          if (e && e[1] === m[1]) { pos = i + 1; break; }
        }
      }
      if (pos < 0) { pos = list.length; loose.push(m[0]); }
      if (pos > 0 && !/\n$/.test(list[pos - 1].raw)) list[pos - 1].raw += '\n';
      list.splice(pos, 0, { level: 4, title: c.title, raw: raw });
      added++;
    });
    if (!updated && !added) return null;
    persist();
    setMd(rec.md, true);
    render();
    return { updated: updated, added: added, loose: loose };
  }

  if (kind === 'repository') {
    $('start-btn').hidden = false;
    $('recall-btn').hidden = false;
    $('build-sep').hidden = false;

    $('start-btn').addEventListener('click', function () { dlgStart.showModal(); });
    $('recall-btn').addEventListener('click', function () {
      if (!list.length) { dlgStart.showModal(); return; }
      if (editing >= 0) commitEdit();
      dlgRecall.showModal();
    });
    el.cards.addEventListener('click', function (e) {
      if (e.target.closest('[data-start]')) dlgStart.showModal();
    });
    [dlgStart, dlgRecall].forEach(function (d) {
      d.addEventListener('click', function (e) {
        if (e.target.closest('[data-close]') || e.target === d) d.close();
      });
    });

    $('st-copy').addEventListener('click', function () {
      var resume = $('st-resume').value;
      if (!resume.trim()) { Kit.toast('Paste your resume first.', 'err'); return; }
      copyWith('content/repository_starter_prompt.md', 'resume', resume, 'the starter prompt and your resume');
    });

    $('st-load').addEventListener('click', function () {
      var md = unfence($('st-result').value);
      if (!md) { Kit.toast('Paste the repository the LLM returned first.', 'err'); return; }
      if (!Md.chunks(md).some(function (c) { return EU_RE.test(c.title); })) {
        Kit.toast('That text has no evidence units (headings like "EU-ABC-01"). Check you copied the whole block.', 'err');
        return;
      }
      if (list.length && !window.confirm('Replace the repository now in this browser with the pasted one?')) return;
      handle = null;
      loaded(md, cfg.file);
      rec.dirty = true;                 // it exists only in the browser so far
      Kit.save(cfg.key, rec);
      render();
      $('st-result').value = '';
      dlgStart.close();
      Kit.toast('Repository loaded. Press Save .md to keep a copy on your computer.');
    });

    $('rc-copy').addEventListener('click', function () {
      copyWith('content/repository_recall_prompt.md', 'master_resume_repository', rec.md,
               'the recall prompt and your repository');
    });

    $('rc-merge').addEventListener('click', function () {
      var text = $('rc-result').value;
      if (!text.trim()) { Kit.toast('Paste the units the LLM returned first.', 'err'); return; }
      var done = mergeUnits(text);
      if (!done) {
        Kit.toast('No evidence units found in that text (headings like "#### **EU-ABC-01 · Title**").', 'err');
        return;
      }
      $('rc-result').value = '';
      dlgRecall.close();
      Kit.toast(done.updated + ' updated, ' + done.added + ' added' +
        (done.loose.length ? '. Placed at the end, move by hand: ' + done.loose.join(', ') : '') + '.');
    });
  }

  /* ---------------------------------------------------------------- start */

  el.title.textContent = cfg.title;
  document.title = cfg.title + ' - Resume Render';
  el.search.placeholder = kind === 'repository' ? 'Search units, tags, employers…' : 'Search the instructions…';
  el.reset.hidden = kind !== 'instructions';

  Kit.getDoc(kind).then(function (found) {
    if (found) rec = found;
    setMd(rec.md || '', false);
    render();
    /* The sprout and the Enrich node in the workflow strip land here. */
    var want = new URLSearchParams(location.search).get('do');
    if (kind !== 'repository' || !want) return;
    if (want === 'enrich' && list.length) dlgRecall.showModal();
    else dlgStart.showModal();
  });
})();
