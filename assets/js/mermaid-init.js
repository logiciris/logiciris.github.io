(function () {
  var blocks = document.querySelectorAll('div.language-mermaid, pre > code.language-mermaid');
  blocks.forEach(function (el) {
    var src = el.textContent;
    var pre = document.createElement('pre');
    pre.className = 'mermaid';
    pre.textContent = src;
    var target = el.tagName === 'CODE' ? el.parentNode : el;
    target.parentNode.replaceChild(pre, target);
  });
  if (!window.mermaid) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'strict',
    themeVariables: {
      background: '#0d0d10', primaryColor: '#17171a', primaryTextColor: '#f2f2ef',
      primaryBorderColor: '#7fd1c7', lineColor: '#a4a49f', secondaryColor: '#0c0c0e',
      tertiaryColor: '#0c0c0e', fontFamily: 'Pretendard Variable, Pretendard, system-ui, sans-serif'
    },
    flowchart: { useMaxWidth: true, htmlLabels: true },
    sequence: { useMaxWidth: true }
  });
  mermaid.run({ querySelector: 'pre.mermaid' });
})();
