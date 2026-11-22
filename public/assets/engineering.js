const diagrams = [...document.querySelectorAll('.engineering-diagram')];
const dialog = document.querySelector('.diagram-dialog');
const dialogContent = dialog.querySelector('.diagram-dialog-content');
dialog.querySelector('[data-close-diagram]').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => dialogContent.replaceChildren());

async function renderDiagrams() {
  if (!window.mermaid) return; // Original Mermaid remains readable if loading fails.
  await document.fonts.ready;
  const color = getComputedStyle(document.querySelector('.engineering-page')).getPropertyValue('--domain-color').trim();
  window.mermaid.initialize({ startOnLoad:false, securityLevel:'strict', theme:'base',
    themeVariables:{ primaryColor:'#e8f3f0', primaryTextColor:'#201e1a', primaryBorderColor:color, lineColor:'#68655f', fontFamily:'Microsoft JhengHei, PingFang TC, sans-serif', fontSize:'17px' },
    flowchart:{ htmlLabels:false, useMaxWidth:false, nodeSpacing:28, rankSpacing:40 } });
  for (const [index, figure] of diagrams.entries()) {
    const source = figure.querySelector('.language-mermaid').textContent;
    try {
      const { svg } = await window.mermaid.render(`engineering-diagram-${index}`, source);
      const canvas = figure.querySelector('.diagram-canvas');
      canvas.innerHTML = svg;
      const graphic = canvas.querySelector('svg');
      graphic.setAttribute('role', 'img');
      graphic.setAttribute('aria-label', '工程流程圖，完整定義可查看下方流程圖原始碼');
      figure.querySelector('.diagram-source').open = false;
      const button = figure.querySelector('[data-enlarge-diagram]');
      button.hidden = false;
      button.addEventListener('click', () => {
        const copy = graphic.cloneNode(true);
        // Prefix cloned SVG IDs/references so the dialog never creates duplicate IDs.
        const ids = [...copy.querySelectorAll('[id]')].map(e => e.id);
        if (copy.id) ids.push(copy.id);
        let markup = copy.outerHTML;
        for (const id of ids.sort((a,b) => b.length-a.length)) markup = markup.replaceAll(id, `zoom-${id}`);
        dialogContent.innerHTML = markup;
        dialog.showModal();
      });
    } catch (error) {
      figure.querySelector('.diagram-source').open = true;
      console.error('Engineering diagram could not render; original source retained.', error);
    }
  }
  // Rendering changes document height; resolve a deep link after diagrams settle.
  if (location.hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
  window.dispatchEvent(new Event('resize'));
}
if (document.readyState === 'complete') renderDiagrams();
else window.addEventListener('load', renderDiagrams, { once:true });
