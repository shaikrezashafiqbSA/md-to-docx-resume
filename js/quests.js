/* quests.js - the portal checklist. A static page cannot read other sites,
 * so this does the part it can: holds the list, remembers which portals are
 * ticked and when each was last opened, and walks through them one click at
 * a time. */
(function () {
  'use strict';

  var Kit = window.Kit;
  var KEY = 'kit.quests';
  var MINE = 'My portals';

  var $ = function (id) { return document.getElementById(id); };
  var el = { groups: $('groups'), keywords: $('keywords'), progress: $('progress'),
             next: $('next'), none: $('none'), add: $('add'),
             addName: $('add-name'), addUrl: $('add-url') };

  var state = Kit.load(KEY, null) || {};
  state.ticked = state.ticked || {};     // url -> true
  state.seen = state.seen || {};         // url -> 'YYYY-MM-DD'
  state.custom = state.custom || [];     // [{ name, url }]
  state.keywords = state.keywords || '';

  function today() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function groups() {
    var all = window.KitPortals.slice();
    if (state.custom.length) all.push({ group: MINE, items: state.custom, custom: true });
    return all;
  }

  function flat() {
    var out = [];
    groups().forEach(function (g) { g.items.forEach(function (p) { out.push(p); }); });
    return out;
  }

  function keywords() {
    return state.keywords.split(',').map(function (k) { return k.trim(); }).filter(Boolean);
  }

  function seenText(url) {
    var d = state.seen[url];
    if (!d) return 'not opened yet';
    if (d === today()) return 'checked today';
    var days = Math.round((new Date(today()) - new Date(d)) / 86400000);
    return days === 1 ? 'yesterday' : days + ' days ago';
  }

  function rowHtml(p, custom) {
    var kws = p.search ? keywords() : [];
    var isToday = state.seen[p.url] === today();
    return '<div class="row' + (isToday ? ' done' : '') + '" data-url="' + Kit.esc(p.url) + '">' +
      '<input type="checkbox"' + (state.ticked[p.url] ? ' checked' : '') + ' aria-label="Tick ' + Kit.esc(p.name) + '">' +
      '<div class="main"><div class="name">' + Kit.esc(p.name) + '</div>' +
      (p.note ? '<div class="note">' + Kit.esc(p.note) + '</div>' : '') +
      '<div class="url">' + Kit.esc(p.url) + '</div>' +
      (kws.length ? '<div class="kw">' + kws.map(function (k) {
        return '<a target="_blank" rel="noopener" data-open href="' +
               Kit.esc(p.search.replace('{q}', encodeURIComponent(k))) + '">Search: ' + Kit.esc(k) + '</a>';
      }).join('') + '</div>' : '') +
      '</div>' +
      '<span class="seen' + (isToday ? ' today' : '') + '">' + seenText(p.url) + '</span>' +
      '<a class="btn go" target="_blank" rel="noopener" data-open href="' + Kit.esc(p.url) + '">Open</a>' +
      (custom ? '<button class="x" data-remove title="Remove this portal">✕</button>' : '') +
      '</div>';
  }

  function render() {
    el.groups.innerHTML = groups().map(function (g, gi) {
      var ticked = g.items.filter(function (p) { return state.ticked[p.url]; }).length;
      return '<section class="group" data-g="' + gi + '"><div class="group-head"><h2>' + Kit.esc(g.group) +
             '</h2><span class="n">' + ticked + ' of ' + g.items.length + ' ticked</span>' +
             '<button data-all>' + (ticked === g.items.length ? 'Untick group' : 'Tick group') + '</button></div>' +
             g.items.map(function (p) { return rowHtml(p, g.custom); }).join('') + '</section>';
    }).join('');
    var all = flat();
    var ticked = all.filter(function (p) { return state.ticked[p.url]; });
    var done = ticked.filter(function (p) { return state.seen[p.url] === today(); }).length;
    el.progress.textContent = ticked.length
      ? done + ' of ' + ticked.length + ' ticked portals checked today'
      : 'Nothing ticked';
    el.next.disabled = !ticked.length || done === ticked.length;
  }

  function persist() { Kit.save(KEY, state); render(); }

  function stamp(url) { state.seen[url] = today(); persist(); }

  el.groups.addEventListener('click', function (e) {
    var row = e.target.closest('.row');
    var url = row ? row.getAttribute('data-url') : '';
    if (e.target.closest('[data-all]')) {
      var g = groups()[+e.target.closest('.group').getAttribute('data-g')];
      var allOn = g.items.every(function (p) { return state.ticked[p.url]; });
      g.items.forEach(function (p) { if (allOn) delete state.ticked[p.url]; else state.ticked[p.url] = true; });
      persist();
      return;
    }
    if (!row) return;
    if (e.target.closest('[data-open]')) { setTimeout(function () { stamp(url); }, 0); return; }
    if (e.target.closest('[data-remove]')) {
      state.custom = state.custom.filter(function (p) { return p.url !== url; });
      delete state.ticked[url];
      persist();
      return;
    }
    if (e.target.matches('input[type="checkbox"]') || e.target.closest('.name')) {
      if (state.ticked[url]) delete state.ticked[url]; else state.ticked[url] = true;
      persist();
    }
  });

  /* One portal per click: a page may open one tab per user action, so a
   * single "open all" would be stopped by the pop-up blocker. */
  el.next.addEventListener('click', function () {
    var p = flat().filter(function (x) {
      return state.ticked[x.url] && state.seen[x.url] !== today();
    })[0];
    if (!p) return;
    window.open(p.url, '_blank', 'noopener');
    stamp(p.url);
  });

  el.none.addEventListener('click', function () { state.ticked = {}; persist(); });

  el.keywords.addEventListener('input', function () {
    state.keywords = el.keywords.value;
    persist();
  });

  el.add.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = el.addName.value.trim(), url = el.addUrl.value.trim();
    if (!name || !url) return;
    if (flat().some(function (p) { return p.url === url; })) {
      Kit.toast('That address is already in the list.', 'err');
      return;
    }
    state.custom.push({ name: name, url: url });
    state.ticked[url] = true;
    el.addName.value = ''; el.addUrl.value = '';
    persist();
    Kit.toast('Added ' + name);
  });

  el.keywords.value = state.keywords;
  render();
})();
