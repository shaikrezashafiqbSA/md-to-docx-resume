/* parse.js - resume Markdown -> ordered section/block structure.
 *
 * The dialect here is what Google Docs and LLM output actually produce, not
 * clean CommonMark: bold lines standing in for headings, "* " bullets, and
 * backslash-escaped punctuation. Clean ATX markdown is accepted too, so
 * hand-written files work.
 *
 * Section headings are kept verbatim and in source order. The .md already
 * carries the exact heading text wanted in the document (for example
 * "## WHO I AM & THE VALUE I BRING TO MEDIACORP"), so nothing here renames,
 * reorders or canonicalises them.
 *
 * Two-column tables are flattened into "Label: items" paragraphs rather than
 * emitted as tables. A table keeps its text out of the linear stream, and the
 * document is one linear column by design.
 */
(function (global) {
  'use strict';

  var ESCAPE_RE   = /\\([\\*_{}\[\]()#+\-.!~|>&$@%^=?/"':;,`])/g;
  var LINK_RE     = /\[([^\]]+)\]\(([^)]+)\)/g;
  var ROW_RE      = /^\|(.+)\|\s*$/;
  var SEP_RE      = /^\|[\s:|\-]+\|\s*$/;
  /* Markdown thematic break: 3+ of -, * or _, optionally space-separated.
   * Resumes carry these as visual dividers; they have no place in the .docx. */
  var HRULE_RE    = /^ {0,3}([-*_])[ \t]*(?:\1[ \t]*){2,}$/;
  var BULLET_RE   = /^[*+\-]\s+(.*)$/;
  var ATX_RE      = /^(#{1,6})\s+(.*)$/;
  var TRIBOLD_RE  = /^\*\*\*(.+?)\*\*\*$/;
  var FULLBOLD_RE = /^\*\*(.+?)\*\*$/;
  var FULLITAL_RE = /^\*(?!\*)([^*]+)\*$/;
  var BOLDITAL_RE = /^\*\*(.+?)\*\*\s+\*(?!\*)([^*]+)\*\s*$/;
  var EDU_RE      = /^\*\*(.+?)\*\*\s*[–—-]\s*(.+?)\s*\*(?!\*)([^*]+)\*\s*$/;
  var LABEL_RE    = /^\*\*(.+?)\*\*:?\s*(.*)$/;
  /* "**Category** - items" written as a plain line rather than a table row.
   * Only trusted inside a skills section, where a bold lead-in is always a
   * category label and never a job title. */
  var SKILLROW_RE = /^\*\*(.+?)\*\*\s*[:–—-]\s*(.+)$/;
  /* A short italic line straight after a role heading is its date range, not a
   * scope note: it names a year, or "Present" / "Ongoing", and little else. */
  var DATE_RE     = /\b(19|20)\d{2}\b|\bpresent\b|\bongoing\b/i;

  function unescapeMd(s) { return s.replace(ESCAPE_RE, '$1'); }

  function stripEmph(s) {
    s = s.trim();
    for (var n = 3; n >= 1; n--) {
      var mark = new Array(n + 1).join('*');
      if (s.length > 2 * n && s.slice(0, n) === mark && s.slice(-n) === mark) {
        return s.slice(n, -n).trim();
      }
    }
    return s;
  }

  /* A fully-bold line whose letters are all uppercase is a section heading. */
  function isSectionHeading(text) {
    var letters = text.replace(/[^A-Za-z]/g, '');
    return letters.length >= 3 && letters === letters.toUpperCase();
  }

  function isSkillsHeading(name) {
    return /\bskills?\b|\bcompetenc/i.test(name);
  }

  function splitRole(bold) {
    var parts = bold.split('|').map(function (p) { return p.trim(); });
    if (parts.length >= 2) return [parts[0], parts.slice(1).join(' | ')];
    return [bold.trim(), ''];
  }

  function Parser() {
    this.header = { name: '', contactText: '', contactLinks: [],
                    headline: '', subline: '' };
    this.sections = [];
    this.current = null;
    this.table = null;
    this.stage = 0;           // 0 name, 1 contact, 2 headline, 3 subline, 4 body
    this.inEducation = false;
    this.inSkills = false;
    this.pendingRole = null;  // a role block still waiting for its date line
  }

  Parser.prototype.push = function (block) {
    if (!this.current) {
      /* Content before any heading: a nameless leading section. It renders
       * straight after the identity block with no heading of its own. */
      this.current = { name: '', blocks: [] };
      this.sections.push(this.current);
    }
    this.current.blocks.push(block);
    if (block.t !== 'role') this.pendingRole = null;
  };

  Parser.prototype.addSection = function (name) {
    name = name.trim();
    this.inEducation = /\beducation\b|\bacademic\b/i.test(name);
    this.inSkills = isSkillsHeading(name);
    this.pendingRole = null;
    /* A repeated heading reopens the section already carrying that text, so a
     * resume split across two "EXPERIENCE" blocks does not render twice. */
    for (var i = 0; i < this.sections.length; i++) {
      if (this.sections[i].name.toUpperCase() === name.toUpperCase() && name) {
        this.current = this.sections[i];
        return;
      }
    }
    this.current = { name: name, blocks: [] };
    this.sections.push(this.current);
  };

  Parser.prototype.flushTable = function () {
    if (!this.table) { this.table = null; return; }
    for (var i = 0; i < this.table.length; i++) {
      var label = stripEmph(this.table[i][0]);
      var text = this.table[i][1] || '';
      if (label || text) this.push({ t: 'skill', label: label, text: text });
    }
    this.table = null;
  };

  Parser.prototype.addBullet = function (body) {
    var m = LABEL_RE.exec(body);
    if (m && m[2]) {
      this.push({ t: 'bullet', label: m[1].replace(/:$/, '').trim(),
                  text: m[2].trim() });
    } else {
      this.push({ t: 'bullet', text: body });
    }
  };

  Parser.prototype.addRole = function (role, org, dates) {
    var block = { t: 'role', role: role, org: org, dates: dates || '' };
    this.push(block);
    this.pendingRole = block;   // set after push, which would otherwise clear it
  };

  /* Absorb the first four meaningful lines as the identity block. */
  Parser.prototype.consumeHeader = function (line) {
    var m;
    if (this.stage === 0) {
      m = FULLBOLD_RE.exec(line) || ATX_RE.exec(line);
      if (!m) return false;
      this.header.name = stripEmph(m[m.length - 1]).trim();
      this.stage = 1;
      return true;
    }
    if (this.stage === 1) {
      var links = [], lm;
      LINK_RE.lastIndex = 0;
      while ((lm = LINK_RE.exec(line)) !== null) {
        links.push({ label: lm[1].trim(), url: lm[2] });
      }
      this.header.contactLinks = links;
      this.header.contactText = line.replace(LINK_RE, '')
        .replace(/(\s*\|\s*){2,}/g, '  |  ')
        .replace(/(\s*\|\s*)+$/, '')
        .replace(/^(\s*\|\s*)+/, '')
        .trim();
      this.stage = 2;
      return true;
    }
    if (this.stage === 2) {
      m = FULLBOLD_RE.exec(line);
      if (m && !isSectionHeading(m[1])) {
        this.header.headline = m[1].trim();
        this.stage = 3;
        return true;
      }
      this.stage = 4;
      return false;
    }
    if (this.stage === 3) {
      if (!/^[#*|]/.test(line)) {
        this.header.subline = line;
        this.stage = 4;
        return true;
      }
      this.stage = 4;
      return false;
    }
    return false;
  };

  Parser.prototype.parse = function (md) {
    var lines = md.split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = unescapeMd(lines[i].trim());
      if (!line) { this.flushTable(); continue; }
      if (HRULE_RE.test(line)) { this.flushTable(); continue; }

      if (ROW_RE.test(line)) {
        if (SEP_RE.test(line)) continue;
        var cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|')
          .map(function (c) { return c.trim(); });
        if (!cells.some(Boolean)) continue;
        if (this.table === null) this.table = [];
        this.table.push(cells.length >= 2 ? cells.slice(0, 2) : [cells[0], '']);
        continue;
      }
      this.flushTable();

      if (this.stage < 4 && this.consumeHeader(line)) continue;

      var m = ATX_RE.exec(line);
      if (m) {
        var depth = m[1].length, text = stripEmph(m[2]);
        if (depth <= 2) {
          this.addSection(text);
        } else if (depth === 3) {
          var rs = splitRole(text);
          this.addRole(rs[0], rs[1], '');
        } else {
          this.push({ t: 'subhead', text: text });
        }
        continue;
      }

      m = BULLET_RE.exec(line);
      if (m) { this.addBullet(m[1].trim()); continue; }

      m = TRIBOLD_RE.exec(line);
      if (m) {
        var tri = m[1].trim();
        this.push(/^guiding principle/i.test(tri)
          ? { t: 'callout', text: tri }
          : { t: 'subhead', text: tri });
        continue;
      }

      if (this.inEducation) {
        m = EDU_RE.exec(line);
        if (m) {
          this.push({ t: 'edu', degree: m[1].trim(), school: m[2].trim(),
                      year: m[3].trim() });
          continue;
        }
      }

      if (this.inSkills) {
        m = SKILLROW_RE.exec(line);
        if (m) {
          this.push({ t: 'skill', label: m[1].trim(), text: m[2].trim() });
          continue;
        }
      }

      m = BOLDITAL_RE.exec(line);
      if (m) {
        var r = splitRole(m[1]);
        this.addRole(r[0], r[1], m[2].trim());
        continue;
      }

      m = FULLBOLD_RE.exec(line);
      if (m) {
        var bold = m[1].trim();
        if (isSectionHeading(bold)) {
          this.addSection(bold);
        } else if (bold.indexOf('|') !== -1) {
          var r2 = splitRole(bold);
          this.addRole(r2[0], r2[1], '');
        } else {
          this.push({ t: 'para', text: line });
        }
        continue;
      }

      m = FULLITAL_RE.exec(line);
      if (m) {
        var it = m[1].trim();
        /* Fold a short date-shaped italic line into the role above it. */
        if (this.pendingRole && it.length <= 60 && DATE_RE.test(it)) {
          this.pendingRole.dates = it;
          this.pendingRole = null;
          continue;
        }
        this.push(/^guiding principle/i.test(it)
          ? { t: 'callout', text: it }
          : { t: 'context', text: it });
        continue;
      }

      /* A plain line straight after a degree is its coursework note. Folding
       * it into the degree keeps it tight instead of floating as a paragraph. */
      var blocks = this.current ? this.current.blocks : null;
      var last = blocks && blocks.length ? blocks[blocks.length - 1] : null;
      if (this.inEducation && last && last.t === 'edu' && !last.note) {
        last.note = line;
        continue;
      }

      this.push({ t: 'para', text: line });
    }
    this.flushTable();
    return { header: this.header, sections: this.sections };
  };

  global.ResumeParse = {
    parse: function (md) { return new Parser().parse(md); }
  };
})(window);
