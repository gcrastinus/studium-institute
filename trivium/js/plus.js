/* Plus menu for the Preface: dark mode first, then how to translate the page. */
(function(){
  var host = document.getElementById('top-right-controls'), dark = document.getElementById('dark-toggle');
  if(!host || !dark) return;
  var wrap = document.createElement('div'); wrap.id = 'plus-wrap';
  wrap.innerHTML = '<button type="button" id="plus-btn" title="Dark mode and translation" aria-label="Dark mode and translation" aria-haspopup="true" aria-expanded="false" aria-controls="plus-menu"><span aria-hidden="true">+</span></button>'
    + '<div id="plus-menu" role="menu" aria-label="Page settings" hidden>'
    + '<button type="button" role="menuitemcheckbox" id="plus-dark" aria-checked="false"><span class="plus-check" aria-hidden="true"></span><span>Dark mode</span></button>'
    + '<div class="plus-sep" role="separator"></div>'
    + '<button type="button" role="menuitem" id="plus-tr" aria-expanded="false" aria-controls="plus-help"><span class="plus-check" aria-hidden="true"></span><span>Translate this page</span><span class="plus-arrow" aria-hidden="true">▾</span></button>'
    + '<div class="plus-help" id="plus-help" hidden>'
    + '<p>Your browser can translate this page into your language, and it can show the original English again.</p>'
    + '<p><b>Chrome and Edge:</b> right-click the page and choose &ldquo;Translate to&hellip;&rdquo; (on a phone, open the browser menu and choose &ldquo;Translate&rdquo;). To return, choose &ldquo;Show original&rdquo; in the bar at the top.</p>'
    + '<p><b>Safari:</b> choose the translate icon in the address bar, then your language. To return, choose &ldquo;View Original&rdquo; from the same icon.</p>'
    + '<p><b>Firefox:</b> choose the translate icon in the address bar. To return, choose &ldquo;Show original.&rdquo;</p>'
    + '<p>If your browser has no translate icon, try opening this page in Chrome, Edge, or Safari.</p>'
    + '</div></div>';
  host.appendChild(wrap);
  dark.hidden = true;
  var btn = document.getElementById('plus-btn'), menu = document.getElementById('plus-menu'),
      dk = document.getElementById('plus-dark'), tr = document.getElementById('plus-tr'), help = document.getElementById('plus-help');
  function sync(){ dk.setAttribute('aria-checked', String(document.body.classList.contains('dark'))); }
  function items(){ return [].slice.call(menu.querySelectorAll('button')); }
  function close(f){ menu.hidden = true; btn.setAttribute('aria-expanded','false'); if(f) btn.focus(); }
  function open(){ sync(); menu.hidden = false; btn.setAttribute('aria-expanded','true'); dk.focus(); }
  btn.onclick = function(e){ e.stopPropagation(); if(menu.hidden) open(); else close(); };
  dk.onclick = function(e){ e.stopPropagation(); dark.click(); sync(); };
  tr.onclick = function(e){ e.stopPropagation(); var o = help.hidden; help.hidden = !o; tr.setAttribute('aria-expanded', String(o)); };
  new MutationObserver(sync).observe(document.body, {attributes:true, attributeFilter:['class']});
  menu.addEventListener('keydown', function(e){
    var it = items(), i = it.indexOf(document.activeElement);
    if(e.key==='ArrowDown'){ e.preventDefault(); it[(i+1)%it.length].focus(); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); it[(i-1+it.length)%it.length].focus(); }
    else if(e.key==='Tab'){ close(); }
  });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape' && !menu.hidden){ e.stopPropagation(); close(true); } }, true);
  document.addEventListener('click', function(e){ if(!menu.hidden && !wrap.contains(e.target)) close(); });
  sync();
})();
