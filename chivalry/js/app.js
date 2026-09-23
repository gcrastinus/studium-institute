(function () {
  "use strict";

  var THEME_KEY = "studium-chivalry-theme";
  var $view = document.getElementById("view");
  var $nav = document.getElementById("nav");
  var $toggle = document.getElementById("nav-toggle");
  var $dark = document.getElementById("dark-toggle");

  var cache = { manifest: null, images: null, commentaries: null, knight: null, chapters: {} };

  function $(sel, root) { return (root || document).querySelector(sel); }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fetchJson(path) {
    return fetch(path, { credentials: "same-origin" }).then(function (r) {
      if (!r.ok) throw new Error("Missing " + path);
      return r.json();
    });
  }

  function loadCore() {
    return Promise.all([
      cache.manifest ? Promise.resolve(cache.manifest) : fetchJson("./data/manifest.json"),
      cache.images ? Promise.resolve(cache.images) : fetchJson("./data/images.json"),
      cache.commentaries ? Promise.resolve(cache.commentaries) : fetchJson("./data/commentaries.json"),
      cache.knight ? Promise.resolve(cache.knight) : fetchJson("./data/knight.json")
    ]).then(function (arr) {
      cache.manifest = arr[0];
      cache.images = arr[1];
      cache.commentaries = arr[2];
      cache.knight = arr[3];
      return cache;
    });
  }

  function loadChapter(id) {
    if (cache.chapters[id]) return Promise.resolve(cache.chapters[id]);
    return fetchJson("./data/chapters/" + encodeURIComponent(id) + ".json").then(function (ch) {
      cache.chapters[id] = ch;
      return ch;
    });
  }

  function applyTheme(on) {
    document.documentElement.classList.toggle("dark", on);
    $dark.textContent = on ? "☀" : "☾";
    $dark.setAttribute("aria-label", on ? "Switch to light mode" : "Switch to dark mode");
  }

  applyTheme(localStorage.getItem(THEME_KEY) === "dark");
  $dark.addEventListener("click", function () {
    var on = !document.documentElement.classList.contains("dark");
    localStorage.setItem(THEME_KEY, on ? "dark" : "light");
    applyTheme(on);
  });

  $toggle.addEventListener("click", function () {
    var open = !$nav.classList.contains("open");
    $nav.classList.toggle("open", open);
    $toggle.setAttribute("aria-expanded", open ? "true" : "false");
    $toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });

  function route() {
    var raw = (location.hash || "#/").replace(/^#/, "");
    if (!raw || raw === "/") return { name: "home" };
    var parts = raw.replace(/^\/+|\/+$/g, "").split("/");
    if (parts[0] === "knight") return { name: "knight" };
    if (parts[0] === "contents") return { name: "contents" };
    if (parts[0] === "search") return { name: "search", q: decodeURIComponent(parts[1] || "") };
    if (parts[0] === "about") return { name: "about" };
    if (parts[0] === "read" && parts[1]) return { name: "read", id: decodeURIComponent(parts[1]) };
    return { name: "home" };
  }

  function setNav(name) {
    $nav.querySelectorAll("a").forEach(function (a) {
      var href = a.getAttribute("href");
      var current =
        (name === "home" && href === "#/") ||
        (name === "knight" && href === "#/knight") ||
        (name === "contents" && href === "#/contents") ||
        (name === "search" && href === "#/search") ||
        (name === "about" && href === "#/about");
      if (current) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    $nav.classList.remove("open");
    $toggle.setAttribute("aria-expanded", "false");
  }

  function imgMeta(key) {
    var map = cache.images && cache.images.mapping || {};
    var file = map[key];
    if (!file) return null;
    var item = (cache.images.items || []).find(function (it) { return it.file === file && it.ok; });
    if (!item) return null;
    return item;
  }

  function figureHtml(key, alt, cls) {
    var item = imgMeta(key);
    if (!item) return "";
    return (
      '<figure class="' + (cls || "hero-fig") + '">' +
        '<img src="./images/' + esc(item.file) + '" alt="' + esc(alt) + '">' +
        '<figcaption class="credit">' + esc(item.credit) +
          (item.commonsUrl ? ' <a href="' + esc(item.commonsUrl) + '">Wikimedia Commons</a>' : "") +
        "</figcaption></figure>"
    );
  }

  function chapterById(id) {
    return cache.manifest.chapters.find(function (c) { return c.id === id; });
  }

  function neighbors(id) {
    var list = cache.manifest.chapters;
    var i = list.findIndex(function (c) { return c.id === id; });
    return {
      prev: i > 0 ? list[i - 1] : null,
      next: i >= 0 && i < list.length - 1 ? list[i + 1] : null
    };
  }

  function pagerHtml(id) {
    var n = neighbors(id);
    return (
      '<nav class="pager">' +
        (n.prev
          ? '<a href="#/read/' + n.prev.id + '"><span class="dir">Previous</span>' + esc(n.prev.title) + "</a>"
          : "<span></span>") +
        (n.next
          ? '<a class="next" href="#/read/' + n.next.id + '"><span class="dir">Next</span>' + esc(n.next.title) + "</a>"
          : "<span></span>") +
      "</nav>"
    );
  }

  function poemLinesHtml(lines) {
    return '<div class="poem-lines">' + lines.map(function (ln) {
      var t = ln.replace(/^["“]+/, "").replace(/["”]+$/, "");
      return "<p>" + esc(t) + "</p>";
    }).join("") + "</div>";
  }

  function wordsIn(text, dict) {
    var found = [];
    Object.keys(dict).forEach(function (term) {
      var re = new RegExp("\\b" + term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
      if (re.test(text) && found.length < 8) found.push(term);
    });
    return found;
  }

  function poemPanel(chapterId, block) {
    var key = chapterId + ":" + block.n;
    var spec = (cache.commentaries.poems || {})[key] || {};
    var dict = cache.commentaries.hardWords || {};
    var blob = (block.lines || []).join(" ");
    var terms = wordsIn(blob + " " + (spec.note || ""), dict);
    var wordHtml = terms.map(function (t) {
      return '<div><span class="term">' + esc(t) + "</span><span>" + esc(dict[t]) + "</span></div>";
    }).join("");
    var allusions = (spec.allusions || []).map(function (a) {
      return "<li><strong>" + esc(a.ref) + "</strong> — " + esc(a.note) + "</li>";
    }).join("");
    var note = spec.note ||
      "Read the verse slowly, then again aloud. Bulfinch inserts poems so a story will stick, and so you will recognize the same names when they return in later English literature.";
    return (
      '<section class="poem-panel" aria-label="Poem">' +
        '<div class="poem-label">Poem' + (spec.source ? " · " + esc(spec.source) : "") + "</div>" +
        poemLinesHtml(block.lines || []) +
        '<div class="commentary">' +
          "<h3>Student commentary</h3>" +
          "<p>" + esc(note) + "</p>" +
          (wordHtml ? '<div class="words">' + wordHtml + "</div>" : "") +
          (allusions ? "<p><strong>Allusions</strong></p><ul>" + allusions + "</ul>" : "") +
        "</div></section>"
    );
  }

  function blocksHtml(ch) {
    var html = "";
    var firstP = true;
    (ch.blocks || []).forEach(function (b) {
      if (b.type === "h") html += "<h2>" + esc(b.text) + "</h2>";
      else if (b.type === "note") html += "<p class=\"status\">" + esc(b.text) + "</p>";
      else if (b.type === "poem") html += poemPanel(ch.id, b);
      else if (b.type === "p") {
        html += '<p class="' + (firstP ? "drop-cap" : "") + '">' + esc(b.text) + "</p>";
        firstP = false;
      }
    });
    return html;
  }

  function renderHome() {
    document.title = "The Age of Chivalry — Studium Institute";
    $view.innerHTML =
      figureHtml("home", "King Arthur sees the Questing Beast", "hero-fig hero-fig--home") +
      '<p class="kicker">Thomas Bulfinch · 1858</p>' +
      "<h1>The Age of Chivalry</h1>" +
      '<div class="rule">❧</div>' +
      '<p class="lede">Two doors into the same book. One teaches the order of knighthood from Bulfinch’s opening chapter. The other opens the stories themselves: Arthur’s court, then the Welsh Mabinogeon, then a handful of British hero-myths.</p>' +
      '<div class="doors">' +
        '<a class="door door-knight" href="#/knight">' +
          '<span class="kicker">First door</span>' +
          "<h2>Enter through knighthood</h2>" +
          "<p>Page, esquire, accolade, tournament, and mail—what Bulfinch thought a knight was, and where the historical record answers him back.</p>" +
          '<span class="btn btn-primary">Enter through knighthood</span>' +
        "</a>" +
        '<a class="door" href="#/contents">' +
          '<span class="kicker">Second door</span>' +
          "<h2>Enter the story map</h2>" +
          "<p>King Arthur I–XXIII, the Mabinogeon, and the hero myths, each on its own screen, with the poems set apart for study.</p>" +
          '<span class="btn btn-ghost">Open the map</span>' +
        "</a>" +
      "</div>" +
      '<p class="designer-credit">These sets of exercises were designed by Timothy Kearns, PhD, created and maintained with the assistance of AI, and are extensively revised for clarity and precision.</p>';
  }

  function renderKnight() {
    var k = cache.knight;
    document.title = "Becoming a knight — Age of Chivalry";
    $view.innerHTML =
      figureHtml("knight", "The accolade: a knight is made", "hero-fig") +
      '<p class="kicker">Knight hub · from Bulfinch, Chapter I</p>' +
      "<h1>" + esc(k.title) + "</h1>" +
      '<div class="rule">❧</div>' +
      '<p class="lede">' + esc(k.lede) + "</p>" +
      "<h2>The ideal</h2>" +
      '<blockquote class="bulfinch">' + esc(k.quoteIdeal) + " <cite>— Bulfinch, ch. I</cite></blockquote>" +
      '<aside class="beyond"><strong>Beyond Bulfinch</strong>' +
        "<p>Bulfinch already admits the ideal was “never met with in real life.” Knighthood was also a legal rank, a way of holding land, and a style of war. A poor bachelor knight, a banneret who led other knights, a Templar bound by a rule, and a late-medieval courtier in plate armor were not the same creature. Romance remembers the errant champion; records remember fees, ransoms, and retinues.</p>" +
      "</aside>" +
      "<h2>The making of a knight</h2>" +
      '<div class="timeline">' + k.timeline.map(function (s) {
        return '<article class="step"><div class="age">' + esc(s.age) + "</div><h3>" + esc(s.name) +
          "</h3><p class=\"status\">" + esc(s.also) + "</p><p>" + esc(s.text) + "</p></article>";
      }).join("") + "</div>" +
      '<aside class="beyond"><strong>Beyond Bulfinch</strong>' +
        "<p>Seven / fourteen / twenty-one is a tidy scheme from later handbooks. Boys did enter service young, but dubbing could happen on a battlefield at fifteen, or be delayed for lack of money to maintain the rank. Not every “knight” in a chronicle had kept vigil in white; some were made between two armies, with a hasty blow and a need for another lance.</p>" +
      "</aside>" +
      "<h2>The accolade</h2>" +
      "<ol>" + k.ceremony.map(function (step) { return "<li>" + esc(step) + "</li>"; }).join("") + "</ol>" +
      '<aside class="beyond"><strong>Beyond Bulfinch</strong>' +
        "<p>The formula naming St. Michael and St. George is English-flavored and late. Dubbing customs differed in France, the Empire, and Iberia. Women of rank sometimes gave arms or hosted the feast; they were not ordinarily knights. Joan of Arc is the famous exception that proves how unusual a female warrior looked to the order itself.</p>" +
      "</aside>" +
      "<h2>Tournaments and jousts</h2>" +
      figureHtml("knight-tournament", "A medieval joust", "chapter-hero") +
      "<p>" + esc(k.tournament) + "</p>" +
      '<aside class="beyond"><strong>Beyond Bulfinch</strong>' +
        "<p>The Church’s bans were real—and often ignored. Tournaments trained cavalry, displayed wealth, and settled scores under a thin law of courtesy. By the later Middle Ages they could be expensive theatre: crests, painted shields, and carefully blunted weapons. Field war, meanwhile, was increasingly decided by infantry, longbow, and at last gunpowder. The romance knight outlived the battlefield knight.</p>" +
      "</aside>" +
      "<h2>Mail, helm, and shield</h2>" +
      '<div class="grid-2">' +
        figureHtml("knight-mail", "A mail hauberk", "") +
        figureHtml("knight-helm", "A great helm", "") +
      "</div>" +
      '<dl class="glossary">' + k.armor.map(function (a) {
        return "<dt>" + esc(a.term) + "</dt><dd>" + esc(a.text) + "</dd>";
      }).join("") + "</dl>" +
      '<aside class="beyond"><strong>Beyond Bulfinch</strong>' +
        "<p>Bulfinch’s sequence—mail, then plate after about 1300—is broadly right for western Europe, but mixed harness (mail with plates at knees, elbows, chest) filled a long middle period. A twelfth-century hauberk and a fifteenth-century Gothic harness belong to different wars. Treat his glossary as a reading key for the romances, not as a single snapshot of “the Middle Ages.”</p>" +
      "</aside>" +
      "<h2>The rest of the world around the knight</h2>" +
      '<div class="grid-2">' + k.classes.map(function (c) {
        return '<article class="card"><h3>' + esc(c.name) + "</h3><p>" + esc(c.text) + "</p></article>";
      }).join("") + "</div>" +
      '<aside class="beyond"><strong>Beyond Bulfinch</strong>' +
        "<p>His picture of serfs and villeins is a gentleman’s summary, colored by nineteenth-century comparisons (he likens villeins to Russian peasants). Real tenure varied by region and century: some peasants held by custom with real rights; some clerks were powerful prelates, others half-literate parish men. The romances barely see this majority. When you meet a “villain” in later English, remember that Bulfinch still uses the older social sense.</p>" +
      "</aside>" +
      '<p><a class="btn btn-primary" href="#/read/arthur-i">Read Bulfinch’s Chapter I in full</a> ' +
      '<a class="btn btn-ghost" href="#/contents">Or go to the story map</a></p>';
  }

  function tocCards(ids, figure) {
    return ids.map(function (id) {
      var c = chapterById(id);
      if (!c) return "";
      if (figure && c.figures.indexOf(figure) < 0) return "";
      var poems = c.poemCount ? '<span class="status"> · ' + c.poemCount + " poem" + (c.poemCount > 1 ? "s" : "") + "</span>" : "";
      return (
        '<a class="card" href="#/read/' + c.id + '">' +
          '<div class="num">' + esc(c.kicker) + (c.num ? " · " + esc(c.num) : "") + "</div>" +
          "<h3>" + esc(c.title) + "</h3>" +
          "<p>" + esc(c.excerpt.slice(0, 180)) + "…</p>" + poems +
        "</a>"
      );
    }).join("");
  }

  function renderContents(figure) {
    document.title = "Story map — Age of Chivalry";
    var figures = cache.manifest.figures || [];
    var chips = '<button type="button" data-fig="" aria-pressed="' + (!figure ? "true" : "false") + '">All</button>' +
      figures.map(function (f) {
        return '<button type="button" data-fig="' + esc(f) + '" aria-pressed="' + (figure === f ? "true" : "false") + '">' + esc(f) + "</button>";
      }).join("");
    $view.innerHTML =
      '<p class="kicker">Story map</p>' +
      "<h1>Contents</h1>" +
      '<div class="rule">✦</div>' +
      '<p class="lede">Filter by a figure if you are following one knight through the book. Every King Arthur chapter and every Mabinogeon section has its own screen.</p>' +
      '<div class="filters" id="fig-filters">' + chips + "</div>" +
      cache.manifest.parts.map(function (part) {
        return '<h2 class="toc-part">' + esc(part.title) + "</h2><div class=\"toc-list\">" +
          tocCards(part.chapters, figure) + "</div>";
      }).join("");
    $("#fig-filters").addEventListener("click", function (ev) {
      var btn = ev.target.closest("button");
      if (!btn) return;
      renderContents(btn.getAttribute("data-fig") || "");
    });
  }

  function renderRead(id) {
    loadChapter(id).then(function (ch) {
      document.title = ch.title + " — Age of Chivalry";
      var meta = chapterById(id) || ch;
      $view.innerHTML =
        '<p class="kicker">' + esc(ch.kicker) + (ch.num ? " · Chapter " + esc(ch.num) : "") + "</p>" +
        "<h1>" + esc(ch.title) + "</h1>" +
        '<div class="rule">❧</div>' +
        figureHtml(ch.id, ch.title, "chapter-hero") +
        (meta.figures && meta.figures.length
          ? "<p class=\"status\">Figures in this chapter: " + meta.figures.map(esc).join(" · ") + "</p>"
          : "") +
        '<article class="prose">' + blocksHtml(ch) + "</article>" +
        pagerHtml(id);
      $view.focus();
    }).catch(function () {
      $view.innerHTML = "<h1>Not found</h1><p>That chapter is missing. Return to the <a href=\"#/contents\">story map</a>.</p>";
    });
  }

  function renderSearch(preset) {
    document.title = "Search — Age of Chivalry";
    $view.innerHTML =
      '<p class="kicker">Search</p><h1>Find a name or a line</h1><div class="rule">✦</div>' +
      '<p class="lede">Search titles, figures, and the opening of each chapter. Hash links keep you inside <code>/chivalry/</code>.</p>' +
      '<input class="search-box" id="q" type="search" placeholder="Launcelot, Grail, Taliesin…" value="' + esc(preset || "") + '">' +
      '<div class="results" id="results"></div>';
    var input = $("#q");
    var box = $("#results");
    function run(q) {
      q = (q || "").trim().toLowerCase();
      if (q.length < 2) { box.innerHTML = "<p class=\"status\">Type at least two letters.</p>"; return; }
      var hits = cache.manifest.chapters.filter(function (c) {
        var blob = (c.title + " " + c.kicker + " " + (c.figures || []).join(" ") + " " + (c.searchText || c.excerpt || "")).toLowerCase();
        return blob.indexOf(q) >= 0;
      });
      if (!hits.length) { box.innerHTML = "<p class=\"status\">No matches.</p>"; return; }
      box.innerHTML = hits.map(function (c) {
        var ex = esc((c.excerpt || "").slice(0, 220));
        return '<a class="card" href="#/read/' + c.id + '"><div class="num">' + esc(c.kicker) +
          (c.num ? " · " + esc(c.num) : "") + "</div><h3>" + esc(c.title) + "</h3><p>" + ex + "…</p></a>";
      }).join("");
    }
    input.addEventListener("input", function () { run(input.value); });
    if (preset) run(preset);
    input.focus();
  }

  function renderAbout() {
    document.title = "About — Age of Chivalry";
    var pref = (cache.manifest.preface || []).filter(function (b) { return b.type === "p"; }).slice(0, 3);
    $view.innerHTML =
      '<p class="kicker">About this explorer</p>' +
      "<h1>Sources and method</h1>" +
      '<div class="rule">❧</div>' +
      "<p>The text is Thomas Bulfinch, <cite>The Age of Chivalry</cite> (first published 1858), taken from <a href=\"https://www.gutenberg.org/ebooks/4926\">Project Gutenberg eBook #4926</a>. Gutenberg’s license remains attached to that file; this site is a reading environment, not a substitute for the eBook.</p>" +
      "<p>Screens follow Bulfinch’s own division: King Arthur and His Knights, chapters I–XXIII; the Mabinogeon, including the introductory note; then the short “Hero Myths of the British Race.” Chapter I is also rebuilt as the knight hub, with historical asides labeled <strong>Beyond Bulfinch</strong> so they are never mistaken for his voice.</p>" +
      "<p>Poems are set in their own panels with student commentaries: hard words, and the allusions Bulfinch expected a young reader of English literature to catch. Illustrations are public-domain paintings, manuscript pages, and edition plates (Beardsley, Waterhouse, Pyle, Burne-Jones, Watts, and others). None are AI-generated. Each image is credited beneath the plate; see also <a href=\"./README.md\">the folder README</a>.</p>" +
      "<h2>From the author’s preface</h2>" +
      pref.map(function (p) { return "<p>" + esc(p.text) + "</p>"; }).join("") +
      "<p><a href=\"https://studiuminstitute.org\">Studium Institute</a> · <a href=\"#/\">Return home</a></p>";
  }

  function paint() {
    var r = route();
    setNav(r.name);
    loadCore().then(function () {
      if (r.name === "knight") renderKnight();
      else if (r.name === "contents") renderContents("");
      else if (r.name === "read") renderRead(r.id);
      else if (r.name === "search") renderSearch(r.q);
      else if (r.name === "about") renderAbout();
      else renderHome();
      window.scrollTo(0, 0);
    }).catch(function (err) {
      $view.innerHTML = "<h1>Could not load the explorer</h1><p>" + esc(err.message) + "</p>";
    });
  }

  window.addEventListener("hashchange", paint);
  paint();
})();
