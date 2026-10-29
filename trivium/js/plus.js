/* + menu for the Preface to the Trivium: Dark mode, then Language (English / Español).
   On Spanish pages also binds "Show English". No font menu (Timothy's rule). */
(function () {
  "use strict";
  var LANG_KEY = "studium-trivium-lang";
  var SHOW_KEY = "studium-trivium-show-en";
  var es = (document.documentElement.lang || "").toLowerCase().indexOf("es") === 0;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var file = (location.pathname.split("/").pop() || "index.html");
  if (!/\.html$/.test(file)) file = "index.html";
  var enHref = es ? "../" + file : file;
  var esHref = es ? file : "es/" + file;
  var T = es
    ? { btn: "Modo oscuro e idioma", dark: "Modo oscuro", lang: "Idioma", saved: "" }
    : { btn: "Dark mode and language", dark: "Dark mode", lang: "Language", saved: "Saved choice: Español" };

  var host = document.getElementById("top-right-controls");
  var dark = document.getElementById("dark-toggle");
  if (host && dark) {
    var savedEs = !es && get(LANG_KEY) === "es";
    var wrap = document.createElement("div");
    wrap.id = "plus-wrap";
    wrap.innerHTML =
      '<button type="button" id="plus-btn" title="' + T.btn + '" aria-label="' + T.btn + '" aria-haspopup="true" aria-expanded="false" aria-controls="plus-menu"><span aria-hidden="true">+</span></button>' +
      '<div id="plus-menu" role="menu" aria-label="' + T.btn + '" hidden>' +
      '<button type="button" role="menuitemcheckbox" id="plus-dark" aria-checked="false"><span class="plus-check" aria-hidden="true"></span><span>' + T.dark + "</span></button>" +
      '<div class="plus-sep" role="separator"></div>' +
      '<div class="plus-head" id="plus-lang-head">' + T.lang + "</div>" +
      '<a class="plus-item" role="menuitemradio" lang="en" hreflang="en" href="' + enHref + '" data-lang="en" aria-current="' + (!es) + '" aria-checked="' + (!es) + '"><span class="plus-check" aria-hidden="true"></span><span>English</span></a>' +
      '<a class="plus-item" role="menuitemradio" lang="es" hreflang="es" href="' + esHref + '" data-lang="es" aria-current="' + es + '" aria-checked="' + es + '"><span class="plus-check" aria-hidden="true"></span><span>Español</span></a>' +
      (savedEs ? '<div class="plus-saved">' + T.saved + "</div>" : "") +
      "</div>";
    host.appendChild(wrap);
    dark.hidden = true;
    var btn = document.getElementById("plus-btn"), menu = document.getElementById("plus-menu"), dk = document.getElementById("plus-dark");
    var sync = function () { dk.setAttribute("aria-checked", String(document.body.classList.contains("dark"))); };
    var items = function () { return [].slice.call(menu.querySelectorAll("button, a.plus-item")); };
    var close = function (f) { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); if (f) btn.focus(); };
    var open = function () { sync(); menu.hidden = false; btn.setAttribute("aria-expanded", "true"); dk.focus(); };
    btn.addEventListener("click", function (e) { e.stopPropagation(); if (menu.hidden) open(); else close(); });
    dk.addEventListener("click", function (e) { e.stopPropagation(); dark.click(); sync(); });
    [].forEach.call(menu.querySelectorAll("a.plus-item"), function (a) {
      a.addEventListener("click", function (e) {
        var want = a.getAttribute("data-lang");
        set(LANG_KEY, want);
        if ((want === "es") === es) { e.preventDefault(); close(true); }
      });
    });
    new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ["class"] });
    menu.addEventListener("keydown", function (e) {
      var it = items(), i = it.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); it[(i + 1) % it.length].focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); it[(i - 1 + it.length) % it.length].focus(); }
      else if (e.key === "Tab") { close(); }
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { e.stopPropagation(); close(true); } }, true);
    document.addEventListener("click", function (e) { if (!menu.hidden && !wrap.contains(e.target)) close(); });
    sync();
  }

  /* "View this page in English" link records the choice too. */
  var viewEn = document.getElementById("view-en");
  if (viewEn) viewEn.addEventListener("click", function () { set(LANG_KEY, "en"); });

  /* Show English (Spanish pages only). Without JS the button stays hidden and English stays hidden. */
  var show = document.getElementById("show-en");
  if (show) {
    var apply = function (on) {
      document.body.classList.toggle("show-en", on);
      show.setAttribute("aria-pressed", String(on));
      show.textContent = on ? "Hide English" : "Show English";
    };
    apply(get(SHOW_KEY) === "1");
    show.hidden = false;
    show.addEventListener("click", function () {
      var on = !document.body.classList.contains("show-en");
      set(SHOW_KEY, on ? "1" : "0");
      apply(on);
    });
  }
})();
