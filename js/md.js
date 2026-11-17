/* md.js - two small things the document pages need:
 *
 *   chunks(md)  split a Markdown file at every heading into ordered chunks,
 *               losslessly: joining the chunks' raw text gives the file back.
 *   html(raw)   render one chunk for reading. Headings, lists, tables,
 *               paragraphs and the inline marks; nothing more exotic.
 */
(function (global) {
  'use strict';

  var HEAD_RE = /^(#{1,6})\s+(.*)$/;
  var ESC_RE = /\\([\\*_{}\[\]()#+\-.!~|>&$@%^=?/"':;,`])/g;

  function plain(s) {
    return s.replace(ESC_RE, '$1').replace(/\*+/g, '').replace(/`/g, '').trim();
  }

  /* -> [{ level, title, raw }]. level 0 is text before the first heading. */
  function chunks(md) {
    var lines = String(md || '').replace(/\r\n?/g, '\n').split('\n');
    var out = [], cur = null, fence = false;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/^\s*```/.test(line)) fence = !fence;
      var m = fence ? null : HEAD_RE.exec(line);
      if (m) {
        cur = { level: m[1].length, title: plain(m[2]), lines: [line] };
        out.push(cur);
      } else {
        if (!cur) { cur = { level: 0, title: '', lines: [] }; out.push(cur); }
        cur.lines.push(line);
      }
    }
    out.forEach(function (c) { c.raw = c.lines.join('\n'); delete c.lines; });
    if (out.length && out[0].level === 0 && !out[0].raw.trim()) out.shift();
    return out;
  }

  function join(list) {
    return list.map(function (c) { return c.raw; }).join('\n');
  }

  /* ---------------------------------------------------------------- inline */

  function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
  }

  function inline(text) {
    /* Park backslash-escaped characters so they cannot open a mark. */
    var s = text.replace(ESC_RE, function (m, c) { return '\u0001' + c.charCodeAt(0) + '\u0002'; });
    s = escHtml(s);
    /* Park code spans too: what is inside one is shown as typed, marks and all. */
    var codes = [];
    s = s.replace(/`([^`]+)`/g, function (m, c) {
      codes.push(c);
      return '\u0003' + (codes.length - 1) + '\u0004';
    });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*\s][^*]*)\*/g, '<em>$1</em>');
    s = s.replace(/\u0003(\d+)\u0004/g, function (m, n) { return '<code>' + codes[+n] + '</code>'; });
    return s.replace(/\u0001(\d+)\u0002/g, function (m, n) {
      return escHtml(String.fromCharCode(+n));
    });
  }

  /* A list item that opens "Label: value" is a field; mark the label so a
   * page of evidence units can be scanned down its left edge. */
  function item(text) {
    var t = text.replace(/^\*\*([^*]+?):?\*\*:?\s*/, '$1: ');   // "**Label:** x" -> "Label: x"
    var m = /^([A-Z][A-Za-z ()\/-]{1,28}):\s+(.*)$/.exec(t);
    if (!m) return inline(text);
    if (/^tags$/i.test(m[1]) && /^[A-Z0-9-]{2,8}(\s*,\s*[A-Z0-9-]{2,8})*\s*$/.test(m[2])) {
      return '<span class="k">Tags</span>' + m[2].split(',').map(function (t) {
        return t.trim() ? '<span class="tag">' + escHtml(t.trim()) + '</span>' : '';
      }).join('');
    }
    return '<span class="k">' + escHtml(m[1]) + '</span>' + inline(m[2]);
  }

  function cells(line) {
    return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split(/(?<!\\)\|/)
      .map(function (c) { return c.trim(); });
  }

  /* ---------------------------------------------------------------- blocks */

  function html(raw) {
    var lines = String(raw || '').split('\n');
    var out = [], para = [], i = 0;

    function flush() {
      if (para.length) out.push('<p>' + para.join(' ') + '</p>');
      para = [];
    }

    while (i < lines.length) {
      var line = lines[i], m;

      if (/^\s*```/.test(line)) {
        flush();
        var code = [];
        for (i++; i < lines.length && !/^\s*```/.test(lines[i]); i++) code.push(lines[i]);
        i++;
        out.push('<pre>' + escHtml(code.join('\n')) + '</pre>');
        continue;
      }
      if (!line.trim()) { flush(); i++; continue; }
      if (/^ {0,3}([-*_])[ \t]*(?:\1[ \t]*){2,}$/.test(line)) { flush(); out.push('<hr>'); i++; continue; }

      m = HEAD_RE.exec(line);
      if (m) {
        flush();
        out.push('<h' + m[1].length + '>' + inline(m[2].replace(/^\*\*(.*)\*\*$/, '$1')) + '</h' + m[1].length + '>');
        i++; continue;
      }

      if (/^\s*\|/.test(line)) {
        flush();
        var rows = [];
        for (; i < lines.length && /^\s*\|/.test(lines[i]); i++) rows.push(lines[i]);
        var hasHead = rows.length > 1 && /^\s*\|[\s:|-]+\|\s*$/.test(rows[1]);
        var t = '<table>';
        rows.forEach(function (r, n) {
          if (hasHead && n === 1) return;
          var tag = hasHead && n === 0 ? 'th' : 'td';
          t += '<tr>' + cells(r).map(function (c) {
            return '<' + tag + '>' + inline(c) + '</' + tag + '>';
          }).join('') + '</tr>';
        });
        out.push(t + '</table>');
        continue;
      }

      m = /^(\s*)(?:[*+-]|\d+[.)])\s+(.*)$/.exec(line);
      if (m) {
        flush();
        var list = '<ul>';
        while (i < lines.length) {
          var lm = /^(\s*)(?:[*+-]|\d+[.)])\s+(.*)$/.exec(lines[i]);
          if (lm) {
            list += '<li' + (lm[1].length >= 2 ? ' class="sub"' : '') + '>' + item(lm[2].trim()) + '</li>';
            i++;
          } else if (lines[i].trim() && /^\s{2,}/.test(lines[i])) {
            /* indented continuation of the item above */
            list = list.replace(/<\/li>$/, ' ' + inline(lines[i].trim()) + '</li>');
            i++;
          } else break;
        }
        out.push(list + '</ul>');
        continue;
      }

      para.push(inline(line.trim()) + (/ {2,}$/.test(line) ? '<br>' : ''));
      i++;
    }
    flush();
    return out.join('');
  }

  global.KitMd = { chunks: chunks, join: join, html: html, plain: plain };
})(window);
