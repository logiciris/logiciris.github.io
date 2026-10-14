(function () {
  'use strict';

  /* copy buttons */
  document.querySelectorAll('div.highlighter-rouge').forEach(function (box) {
    if (box.classList.contains('language-mermaid')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';
    btn.setAttribute('aria-label', '코드 복사');
    btn.addEventListener('click', function () {
      var code = box.querySelector('pre');
      var text = code ? code.innerText : '';
      var done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy'; }, 1500); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {});
      }
    });
    box.appendChild(btn);
  });

  /* TOC */
  var prose = document.querySelector('[data-prose]');
  var side = document.querySelector('[data-toc-side]');
  var inline = document.querySelector('[data-toc-inline]');
  if (prose && (side || inline)) {
    var heads = prose.querySelectorAll('h2[id], h3[id]');
    if (heads.length >= 2) {
      var build = function () {
        var ul = document.createElement('ul');
        ul.className = 'toc-list';
        heads.forEach(function (h) {
          var li = document.createElement('li');
          li.className = 'l' + h.tagName.charAt(1);
          var a = document.createElement('a');
          a.href = '#' + h.id;
          a.textContent = h.textContent;
          li.appendChild(a);
          ul.appendChild(li);
        });
        return ul;
      };
      [side, inline].forEach(function (box) {
        if (!box) return;
        box.querySelector('nav').appendChild(build());
        box.hidden = false;
      });
      if ('IntersectionObserver' in window && side) {
        var links = {};
        side.querySelectorAll('a').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              Object.keys(links).forEach(function (k) { links[k].classList.remove('active'); });
              if (links[e.target.id]) links[e.target.id].classList.add('active');
            }
          });
        }, { rootMargin: '-80px 0px -70% 0px' });
        heads.forEach(function (h) { io.observe(h); });
      }
    }
  }

  /* search */
  var root = document.querySelector('[data-search]');
  if (!root) return;
  var input = root.querySelector('.search-input');
  var list = root.querySelector('[data-search-results]');
  var indexUrl = document.currentScript ? document.currentScript.getAttribute('data-search-index') : '/search.json';
  var data = null, loading = false, sel = -1, items = [];

  function load() {
    if (data || loading) return;
    loading = true;
    fetch(indexUrl).then(function (r) { return r.json(); }).then(function (j) { data = j; render(); }).catch(function () { loading = false; });
  }
  function open() { root.hidden = false; load(); input.value = ''; render(); input.focus(); }
  function close() { root.hidden = true; }
  function render() {
    list.innerHTML = '';
    sel = -1;
    if (!data) return;
    var q = input.value.trim().toLowerCase();
    var terms = q.split(/\s+/).filter(Boolean);
    items = data.filter(function (d) {
      if (!terms.length) return true;
      var hay = (d.title + ' ' + d.tags.join(' ') + ' ' + d.category + ' ' + d.desc).toLowerCase();
      return terms.every(function (t) { return hay.indexOf(t) !== -1; });
    }).slice(0, 20);
    items.forEach(function (d) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = d.url;
      var t = document.createElement('span'); t.className = 'r-title'; t.textContent = d.title;
      var m = document.createElement('span'); m.className = 'r-meta'; m.textContent = d.kind + (d.category ? ' · ' + d.category : '');
      a.appendChild(t); a.appendChild(m); li.appendChild(a); list.appendChild(li);
    });
  }
  function move(n) {
    var as = list.querySelectorAll('a');
    if (!as.length) return;
    sel = (sel + n + as.length) % as.length;
    as.forEach(function (a, i) { a.setAttribute('aria-selected', i === sel ? 'true' : 'false'); });
    as[sel].scrollIntoView({ block: 'nearest' });
  }
  document.querySelectorAll('[data-search-open]').forEach(function (b) { b.addEventListener('click', open); });
  root.querySelectorAll('[data-search-close]').forEach(function (b) { b.addEventListener('click', close); });
  input.addEventListener('input', render);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') {
      var as = list.querySelectorAll('a');
      var t = as[sel >= 0 ? sel : 0];
      if (t) location.href = t.href;
    }
  });
  document.addEventListener('keydown', function (e) {
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    var typing = /INPUT|TEXTAREA|SELECT/.test(tag) || (document.activeElement && document.activeElement.isContentEditable);
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); root.hidden ? open() : close(); }
    else if (e.key === '/' && !typing && root.hidden) { e.preventDefault(); open(); }
    else if (e.key === 'Escape' && !root.hidden) { close(); }
  });
})();
