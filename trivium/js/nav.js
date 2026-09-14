(function () {
  "use strict";

  var STORAGE = "studium-trivium-v1";
  var THEME = "studium-trivium-theme";

  /* Keep SPINE in step with SPINE_ORDER in _build_pages.py, which emits the
     same pager into the HTML so the walk-through navigates without JS. */
  var SPINE = [
    { id: "index", href: "index.html", title: "Welcome", short: "Welcome" },
    { id: "modern-starts", href: "modern-starts.html", title: "Modern starting-points", short: "Starting-points" },
    { id: "why-words", href: "why-words.html", title: "Why we begin with words", short: "Why words" },
    { id: "why-words-2", href: "why-words-2.html", title: "What language is for", short: "What language is for" },
    { id: "why-words-3", href: "why-words-3.html", title: "Discourse and the three arts", short: "Discourse, three arts" },
    { id: "words-things", href: "words-things.html", title: "Words, concepts, and things", short: "Words and things" },
    { id: "words-things-2", href: "words-things-2.html", title: "What kind of sign a word is", short: "What a word is" },
    { id: "words-things-3", href: "words-things-3.html", title: "One name, many things", short: "One name, many things" },
    { id: "grammar", href: "grammar.html", title: "Grammar", short: "Grammar" },
    { id: "to-grammatica", href: "to-grammatica.html", title: "Into Ars Grammatica", short: "Ars Grammatica" },
    { id: "logic", href: "logic.html", title: "Logic", short: "Logic" },
    { id: "to-syllogistica", href: "to-syllogistica.html", title: "Into Ars Syllogistica", short: "Ars Syllogistica" },
    { id: "rhetoric", href: "rhetoric.html", title: "Rhetoric", short: "Rhetoric" },
    { id: "to-rhetorica", href: "to-rhetorica.html", title: "Into Ars Rhetorica", short: "Ars Rhetorica" },
    { id: "three-arts", href: "three-arts.html", title: "The three arts together", short: "Three arts" },
    { id: "quadrivium", href: "quadrivium.html", title: "The quadrivium (later)", short: "Quadrivium" },
    { id: "sources", href: "sources.html", title: "Sources", short: "Sources" }
  ];

  var PATHS = {
    science: {
      label: "Science and data",
      pages: [
        { id: "path-science", href: "path-science.html", title: "What is true in starting from science" },
        { id: "path-science-2", href: "path-science-2.html", title: "What science still needs from words" },
        { id: "path-science-3", href: "path-science-3.html", title: "Why the arts of speech come first" }
      ]
    },
    thinking: {
      label: "Critical thinking",
      pages: [
        { id: "path-thinking", href: "path-thinking.html", title: "What is true in wanting to think critically" },
        { id: "path-thinking-2", href: "path-thinking-2.html", title: "What puzzles leave untaught" },
        { id: "path-thinking-3", href: "path-thinking-3.html", title: "From inference back to speech" }
      ]
    },
    voice: {
      label: "Voice and self-expression",
      pages: [
        { id: "path-voice", href: "path-voice.html", title: "What is true in wanting a voice" },
        { id: "path-voice-2", href: "path-voice-2.html", title: "When expression is not yet speech" },
        { id: "path-voice-3", href: "path-voice-3.html", title: "Why training the tongue is not later" }
      ]
    },
    labels: {
      label: "Words as mere labels",
      pages: [
        { id: "path-labels", href: "path-labels.html", title: "What is true in caring for things" },
        { id: "path-labels-2", href: "path-labels-2.html", title: "What a name is asked to do" },
        { id: "path-labels-3", href: "path-labels-3.html", title: "Why labels cannot be second" }
      ]
    },
    ai: {
      label: "Machines that write",
      pages: [
        { id: "path-ai", href: "path-ai.html", title: "What is true in machine fluency" },
        { id: "path-ai-2", href: "path-ai-2.html", title: "What a speaker still has to be" },
        { id: "path-ai-3", href: "path-ai-3.html", title: "Why the arts remain yours" }
      ]
    }
  };

  /* The cycle: doctrine, then practice in the matching application, then
     return. Order matters — it is the order the course recommends. */
  var ARTS = [
    { key: "grammar", label: "Grammar", doctrine: "grammar.html", bridge: "to-grammatica.html", app: "Ars Grammatica" },
    { key: "logic", label: "Logic", doctrine: "logic.html", bridge: "to-syllogistica.html", app: "Ars Syllogistica" },
    { key: "rhetoric", label: "Rhetoric", doctrine: "rhetoric.html", bridge: "to-rhetorica.html", app: "Ars Rhetorica" }
  ];

  function artByKey(key) {
    for (var i = 0; i < ARTS.length; i++) if (ARTS[i].key === key) return ARTS[i];
    return null;
  }

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function saveState(next) {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(next));
    } catch (e) {
      /* Private browsing, or storage disabled. The walk-through still reads;
         it simply will not remember. Never let this break a click handler. */
    }
  }

  function pageId() {
    return document.body.getAttribute("data-page") || "";
  }

  function pathIdOf(id) {
    var key;
    for (key in PATHS) {
      if (PATHS[key].pages.some(function (p) { return p.id === id; })) return key;
    }
    return null;
  }

  function findSpine(id) {
    for (var i = 0; i < SPINE.length; i++) if (SPINE[i].id === id) return i;
    return -1;
  }

  function markVisited(id) {
    var state = loadState();
    state.visited = state.visited || [];
    if (state.visited.indexOf(id) === -1) state.visited.push(id);
    var path = document.body.getAttribute("data-path") || pathIdOf(id);
    if (path) state.path = path;
    saveState(state);
  }

  function choosePath(id) {
    var state = loadState();
    state.path = id;
    saveState(state);
  }

  function clearPath() {
    var state = loadState();
    delete state.path;
    saveState(state);
    renderToc();
  }

  /* ---- the cycle ------------------------------------------------------ */

  function cycleOf(state) {
    return (state && state.cycle) || {};
  }

  function cycleStatus(key) {
    var c = cycleOf(loadState());
    return c[key] || "";           /* "" | "sent" | "done" */
  }

  function setCycle(key, value, force) {
    var state = loadState();
    state.cycle = state.cycle || {};
    if (value) {
      /* Re-opening the app must not demote a finished art. An explicit
         "not yet after all" passes force and is allowed through. */
      if (!force && value === "sent" && state.cycle[key] === "done") return;
      state.cycle[key] = value;
      if (value === "done") {
        state.cycleDates = state.cycleDates || {};
        state.cycleDates[key] = new Date().toISOString().slice(0, 10);
      }
    } else {
      delete state.cycle[key];
      if (state.cycleDates) delete state.cycleDates[key];
    }
    saveState(state);
  }

  function statusWords(status) {
    if (status === "done") return "first pass done";
    if (status === "sent") return "in practice";
    return "not yet";
  }

  function renderCycle() {
    var state = loadState();
    var visited = state.visited || [];
    var any = false;
    var i;
    for (i = 0; i < ARTS.length; i++) {
      if (cycleStatus(ARTS[i].key) || visited.indexOf(ARTS[i].key) !== -1) any = true;
    }
    if (!any) return "";
    var html = '<div class="toc-group">The cycle</div><div class="cycle">';
    for (i = 0; i < ARTS.length; i++) {
      var art = ARTS[i];
      var status = cycleStatus(art.key);
      var cls = "cycle-item" + (status ? " is-" + status : "");
      html += '<a class="' + cls + '" href="' + art.doctrine + '">' +
        '<span class="cycle-art">' + art.label + "</span>" +
        '<span class="cycle-state">' + statusWords(status) + "</span></a>";
    }
    html += "</div>";
    return html;
  }

  function renderReturn() {
    var section = document.querySelector("section.return[data-art]");
    if (!section) return;
    var key = section.getAttribute("data-art");
    var art = artByKey(key);
    if (!art) return;
    var controls = section.querySelector('[data-role="controls"]');
    var welcome = section.querySelector('[data-role="welcome"]');
    var status = cycleStatus(key);

    function draw() {
      status = cycleStatus(key);
      if (!controls) return;
      if (status === "done") {
        var state = loadState();
        var when = (state.cycleDates && state.cycleDates[key]) || "";
        controls.innerHTML = '<p class="marked">Marked as a first pass' +
          (when ? " on " + when : "") + '. <button type="button" data-role="undo">Not yet after all</button></p>';
        if (welcome) welcome.hidden = false;
      } else {
        controls.innerHTML = '<button type="button" class="mark" data-role="mark">' +
          "I have made a first pass in " + art.app + "</button>" +
          '<p class="marked-note">This is remembered in this browser only. Nothing is sent anywhere, and the course never checks your work — the judgement is yours.</p>';
        if (welcome) welcome.hidden = true;
      }
      var mark = controls.querySelector('[data-role="mark"]');
      if (mark) mark.addEventListener("click", function () {
        setCycle(key, "done");
        draw();
        renderToc();
        if (welcome && welcome.scrollIntoView) welcome.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      var undo = controls.querySelector('[data-role="undo"]');
      if (undo) undo.addEventListener("click", function () {
        setCycle(key, "sent", true);
        draw();
        renderToc();
      });
    }
    draw();
  }

  function bindAppLinks() {
    var links = document.querySelectorAll("[data-app]");
    Array.prototype.forEach.call(links, function (a) {
      a.addEventListener("click", function () {
        setCycle(a.getAttribute("data-app"), "sent");
      });
    });
  }

  /* ---- rendering ------------------------------------------------------ */

  function renderToc() {
    var nav = document.getElementById("toc");
    if (!nav) return;
    var state = loadState();
    var current = pageId();
    var html = "";
    html += '<a class="toc-brand" href="https://studiuminstitute.org">Studium Institute</a>';
    html += '<p class="toc-title">Introduction to the Trivium</p>';
    html += '<div class="toc-group">Course</div>';
    SPINE.forEach(function (item) {
      var cls = "item";
      var aria = "";
      if (item.id === current) { cls += " current"; aria = ' aria-current="page"'; }
      if (state.visited && state.visited.indexOf(item.id) !== -1) cls += " done";
      html += '<a class="' + cls + '" href="' + item.href + '"' + aria + ">" + item.short + "</a>";
    });
    if (state.path && PATHS[state.path]) {
      html += '<div class="path-chip"><strong>Your starting-point</strong>' +
        PATHS[state.path].label +
        '<br><button type="button" id="clear-path">Clear</button></div>';
      html += '<div class="toc-group">That path</div>';
      PATHS[state.path].pages.forEach(function (item) {
        var cls = "item";
        var aria = "";
        if (item.id === current) { cls += " current"; aria = ' aria-current="page"'; }
        if (state.visited && state.visited.indexOf(item.id) !== -1) cls += " done";
        html += '<a class="' + cls + '" href="' + item.href + '"' + aria + ">" + item.title + "</a>";
      });
    }
    html += renderCycle();
    nav.innerHTML = html;
    var clear = document.getElementById("clear-path");
    if (clear) {
      clear.addEventListener("click", function () {
        clearPath();
        document.body.classList.remove("toc-open");
      });
    }
  }

  function pagerLink(dir, item) {
    if (!item) return "";
    return '<a class="' + dir + '" href="' + item.href + '"><span class="dir">' +
      (dir === "prev" ? "Previous" : "Next") + "</span>" + item.title + "</a>";
  }

  function renderPager() {
    var el = document.getElementById("pager");
    if (!el) return;
    var id = pageId();
    var pathKey = document.body.getAttribute("data-path") || pathIdOf(id);
    var seq, i, prev, next;
    if (pathKey && PATHS[pathKey]) {
      seq = PATHS[pathKey].pages.slice();
      i = -1;
      seq.forEach(function (p, idx) { if (p.id === id) i = idx; });
      prev = i > 0 ? seq[i - 1] : { href: "modern-starts.html", title: "Modern starting-points" };
      next = i >= 0 && i < seq.length - 1
        ? seq[i + 1]
        : { href: "why-words.html", title: "Why we begin with words" };
    } else {
      i = findSpine(id);
      if (i < 0) return;              /* leave the server-rendered pager alone */
      prev = i > 0 ? SPINE[i - 1] : null;
      next = i < SPINE.length - 1 ? SPINE[i + 1] : null;
    }
    el.innerHTML = pagerLink("prev", prev) + pagerLink("next", next);
  }

  function bindPathChoices() {
    document.querySelectorAll("[data-choose-path]").forEach(function (a) {
      a.addEventListener("click", function () {
        choosePath(a.getAttribute("data-choose-path"));
      });
    });
  }

  var RATE_KEY = "studium-trivium-speak-rate";
  var RATES = [1, 1.5, 2, 2.5, 3];

  function rateLabel(r) {
    return String(r) + "×";
  }

  function rateWidgetHTML(current) {
    var html = '<button type="button" class="speak-rate-btn" aria-haspopup="listbox" aria-expanded="false" title="Reading speed" aria-label="Reading speed">' + rateLabel(current) + "</button>";
    html += '<ul class="speak-rate-menu" role="listbox" hidden>';
    RATES.forEach(function (r) {
      html += '<li role="option" data-rate="' + r + '" aria-selected="' + (r === current ? "true" : "false") + '">' + rateLabel(r) + "</li>";
    });
    html += "</ul>";
    return html;
  }

  function bindSpeak() {
    var btn = document.getElementById("speak-toggle");
    var rateEl = document.getElementById("speak-rate");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.id = "speak-toggle";
      btn.title = "Read this screen aloud";
      btn.setAttribute("aria-label", "Read this screen aloud");
      btn.textContent = "🔊";
      document.body.appendChild(btn);
    }

    var rate = 1;
    try {
      rate = parseFloat(localStorage.getItem(RATE_KEY) || "1") || 1;
    } catch (e) { rate = 1; }
    if (RATES.indexOf(rate) < 0) rate = 1;

    if (!rateEl || rateEl.tagName === "SELECT") {
      var wrap = document.createElement("div");
      wrap.id = "speak-rate";
      wrap.className = "speak-rate";
      wrap.innerHTML = rateWidgetHTML(rate);
      if (rateEl && rateEl.parentNode) rateEl.parentNode.replaceChild(wrap, rateEl);
      else document.body.appendChild(wrap);
      rateEl = wrap;
    } else {
      rateEl.classList.add("speak-rate");
      if (!rateEl.querySelector(".speak-rate-btn")) rateEl.innerHTML = rateWidgetHTML(rate);
    }

    var darkBtn = document.getElementById("dark-toggle");
    var cluster = document.getElementById("top-right-controls");
    if (!cluster) {
      cluster = document.createElement("div");
      cluster.id = "top-right-controls";
      cluster.className = "top-right-controls";
      document.body.appendChild(cluster);
    }
    var unit = document.getElementById("speak-unit");
    if (!unit) {
      unit = document.createElement("div");
      unit.id = "speak-unit";
      unit.className = "speak-unit";
    }
    unit.appendChild(btn);
    unit.appendChild(rateEl);
    if (darkBtn) cluster.appendChild(darkBtn);
    cluster.appendChild(unit);

    var rateBtn = rateEl.querySelector(".speak-rate-btn");
    var rateMenu = rateEl.querySelector(".speak-rate-menu");

    function setRateUI(r) {
      rate = r;
      if (rateBtn) rateBtn.textContent = rateLabel(r);
      if (rateMenu) {
        rateMenu.querySelectorAll("[data-rate]").forEach(function (li) {
          li.setAttribute("aria-selected", parseFloat(li.getAttribute("data-rate")) === r ? "true" : "false");
        });
      }
    }
    setRateUI(rate);

    function closeRateMenu() {
      rateEl.classList.remove("open");
      if (rateBtn) rateBtn.setAttribute("aria-expanded", "false");
      if (rateMenu) rateMenu.hidden = true;
    }
    function openRateMenu() {
      rateEl.classList.add("open");
      if (rateBtn) rateBtn.setAttribute("aria-expanded", "true");
      if (rateMenu) rateMenu.hidden = false;
    }

    var supported = !!(window.speechSynthesis && window.SpeechSynthesisUtterance);
    if (!supported) {
      btn.title = "Speech is not available in this browser";
      btn.setAttribute("aria-disabled", "true");
      btn.style.opacity = ".45";
      btn.style.cursor = "default";
      if (unit) unit.style.opacity = ".45";
      rateEl.style.opacity = ".45";
      if (rateBtn) {
        rateBtn.disabled = true;
        rateBtn.style.cursor = "default";
      }
      return;
    }

    if (rateBtn) {
      rateBtn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        if (rateMenu && rateMenu.hidden) openRateMenu();
        else closeRateMenu();
      });
    }
    if (rateMenu) {
      rateMenu.addEventListener("click", function (ev) {
        var li = ev.target.closest("[data-rate]");
        if (!li) return;
        var r = parseFloat(li.getAttribute("data-rate")) || 1;
        if (RATES.indexOf(r) < 0) r = 1;
        setRateUI(r);
        try { localStorage.setItem(RATE_KEY, String(rate)); } catch (e2) {}
        closeRateMenu();
      });
    }
    document.addEventListener("click", function (ev) {
      if (!rateEl.contains(ev.target)) closeRateMenu();
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") closeRateMenu();
    });

    var speaking = false;
    var queue = [];
    var keepAlive = null;

    function clearKeepAlive() {
      if (keepAlive) {
        clearInterval(keepAlive);
        keepAlive = null;
      }
    }

    function setSpeakingUI(on) {
      speaking = on;
      btn.classList.toggle("speaking", on);
      btn.textContent = on ? "⏹" : "🔊";
      btn.title = on ? "Stop reading" : "Read this screen aloud";
      btn.setAttribute("aria-label", btn.title);
    }

    function stopSpeak() {
      clearKeepAlive();
      queue = [];
      setSpeakingUI(false);
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }

    function normalizeText(s) {
      return String(s || "")
        .replace(/\u00a0/g, " ")
        .replace(/[❧❦☰☾☀🔊⏹]/g, " ")
        .replace(/[·•]/g, ", ")
        .replace(/\s+/g, " ")
        .replace(/\s+([,.;:!?])/g, "$1")
        .trim();
    }

    function collectSpeakText() {
      var parts = [];
      function add(t) {
        t = normalizeText(t);
        if (t) parts.push(t);
      }
      var kicker = document.querySelector(".page-head .kicker");
      var h1 = document.querySelector(".page-head h1");
      if (kicker) add(kicker.textContent);
      if (h1) add(h1.textContent);
      var article = document.querySelector("article.prose");
      if (article) add(article.innerText);
      var out = [];
      parts.forEach(function (p) { if (out[out.length - 1] !== p) out.push(p); });
      return out.join(". ").replace(/\.\s*\./g, ".").replace(/\s+/g, " ").trim();
    }

    function pickVoice() {
      try {
        var voices = window.speechSynthesis.getVoices() || [];
        var en = voices.filter(function (v) { return /^en(-|_)/i.test(v.lang); });
        return en.filter(function (v) { return v.localService && /samantha|daniel|karen|moira|alex|serena|rishi|siri/i.test(v.name); })[0]
          || en.filter(function (v) { return v.localService; })[0]
          || en[0]
          || null;
      } catch (e) { return null; }
    }

    function chunkText(text) {
      var max = 280;
      var sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
      var chunks = [];
      var buf = "";
      sentences.forEach(function (s) {
        s = s.trim();
        if (!s) return;
        if ((buf + " " + s).length > max && buf) {
          chunks.push(buf.trim());
          buf = s;
        } else buf = buf ? buf + " " + s : s;
      });
      if (buf.trim()) chunks.push(buf.trim());
      return chunks.length ? chunks : [text];
    }

    function kickSynth() {
      try {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      } catch (e) {}
    }

    function speakChunks(chunks) {
      queue = chunks.slice();
      setSpeakingUI(true);
      var voice = pickVoice();

      function next() {
        if (!speaking) return;
        if (!queue.length) {
          clearKeepAlive();
          setSpeakingUI(false);
          return;
        }
        var u = new SpeechSynthesisUtterance(queue.shift());
        u.lang = "en-US";
        if (voice) u.voice = voice;
        u.rate = rate;
        u.pitch = 1;
        u.volume = 1;
        u.onend = function () { next(); };
        u.onerror = function (ev) {
          var err = ev && ev.error;
          if (err === "canceled" || err === "interrupted") return;
          clearKeepAlive();
          setSpeakingUI(false);
        };
        try {
          window.speechSynthesis.speak(u);
          kickSynth();
        } catch (e) {
          clearKeepAlive();
          setSpeakingUI(false);
        }
      }

      /* Speak the first chunk inside the click. Chrome drops speech if
         cancel() is followed by speak() on a timeout (lost user gesture). */
      try {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
      } catch (e) {}

      clearKeepAlive();
      keepAlive = setInterval(function () {
        if (!speaking) { clearKeepAlive(); return; }
        kickSynth();
      }, 12000);

      next();
    }

    btn.addEventListener("click", function () {
      if (speaking) stopSpeak();
      else {
        var text = collectSpeakText();
        speakChunks(chunkText(text || "There is nothing to read on this screen."));
      }
    });

    window.addEventListener("pagehide", stopSpeak);
    try {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener("voiceschanged", function () {});
    } catch (e) {}
  }

  function bindTheme() {
    var btn = document.getElementById("dark-toggle");
    var saved = null;
    try { saved = localStorage.getItem(THEME); } catch (e) { saved = null; }
    if (saved === "dark") document.body.classList.add("dark");
    if (btn) {
      btn.textContent = document.body.classList.contains("dark") ? "☀" : "☾";
      btn.addEventListener("click", function () {
        document.body.classList.toggle("dark");
        var dark = document.body.classList.contains("dark");
        try { localStorage.setItem(THEME, dark ? "dark" : "light"); } catch (e) {}
        btn.textContent = dark ? "☀" : "☾";
      });
    }
  }

  function bindMobileNav() {
    var btn = document.getElementById("nav-toggle");
    var toc = document.getElementById("toc");
    var scrim = document.createElement("div");
    scrim.className = "toc-scrim";
    document.body.appendChild(scrim);
    function sync() {
      if (btn) btn.setAttribute("aria-expanded", document.body.classList.contains("toc-open") ? "true" : "false");
    }
    function close() { document.body.classList.remove("toc-open"); sync(); }
    function toggle() { document.body.classList.toggle("toc-open"); sync(); }
    if (btn) { btn.setAttribute("aria-expanded", "false"); btn.addEventListener("click", toggle); }
    scrim.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
    if (toc) toc.addEventListener("click", function (e) {
      if (e.target.closest("a.item") || e.target.closest("a.cycle-item") || e.target.closest("a.toc-brand")) close();
    });
  }

  markVisited(pageId());
  renderToc();
  renderPager();
  renderReturn();
  bindAppLinks();
  bindPathChoices();
  bindTheme();
  bindSpeak();
  bindMobileNav();
})();
