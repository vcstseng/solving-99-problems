const toc = document.querySelector('.case-toc');
const shell = document.querySelector('.toc-shell');
const mobile = matchMedia('(max-width: 760px)');
const links = [...toc.querySelectorAll('a')];
const targets = links.map(link => document.getElementById(link.hash.slice(1))).filter(Boolean);
const groups = [...toc.querySelectorAll('[data-toc-group]')];
let currentId;
let framePending = false;

function updatePosition() {
  framePending = false;
  // Include both the document scroll padding and the heading scroll margin,
  // so anchor navigation highlights the destination rather than its predecessor.
  const threshold = (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0)
    + (parseFloat(getComputedStyle(targets[0]).scrollMarginTop) || 0) + 10;
  let current = targets[0];
  for (const target of targets) {
    if (target.getBoundingClientRect().top <= threshold) current = target;
    else break;
  }
  if (scrollY + innerHeight >= document.documentElement.scrollHeight - 2) current = targets.at(-1);
  if (!current || currentId === current.id) return;
  currentId = current.id;
  const section = current.closest('[data-case-section]')?.dataset.caseSection;
  for (const group of groups) group.classList.toggle('is-active', group.dataset.tocGroup === section);
  for (const item of toc.querySelectorAll('.is-current-branch')) item.classList.remove('is-current-branch');
  for (const link of links) {
    if (link.hash === '#' + currentId) {
      link.setAttribute('aria-current', 'location');
      let item = link.closest('li');
      while (item && toc.contains(item)) {
        item.classList.add('is-current-branch');
        item = item.parentElement.closest('li');
      }
      if (!mobile.matches) {
        const box = link.getBoundingClientRect();
        const viewport = toc.getBoundingClientRect();
        if (box.bottom > viewport.bottom) toc.scrollTop += box.bottom - viewport.bottom + 15;
        else if (box.top < viewport.top) toc.scrollTop -= viewport.top - box.top + 15;
      }
    } else link.removeAttribute('aria-current');
  }
}
function schedulePosition() {
  if (!framePending) { framePending = true; requestAnimationFrame(updatePosition); }
}
function setMode() {
  shell.open = !mobile.matches;
  currentId = undefined;
  schedulePosition();
}
shell.querySelector('summary').addEventListener('click', event => {
  if (!mobile.matches) event.preventDefault();
});
for (const link of links) link.addEventListener('click', () => {
  if (mobile.matches) shell.open = false;
});
window.addEventListener('scroll', schedulePosition, { passive:true });
window.addEventListener('resize', schedulePosition, { passive:true });
// Closing the mobile TOC changes document flow. Resolve a directly opened hash
// after that layout has settled, including back/forward-cache restoration.
function restoreHash() {
  requestAnimationFrame(() => {
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const target = document.getElementById(id);
  if (target && document.querySelector('.case-body').contains(target)) target.scrollIntoView({ block:'start', behavior:'instant' });
  schedulePosition();
  });
}
window.addEventListener('hashchange', restoreHash);
window.addEventListener('pageshow', restoreHash);
mobile.addEventListener('change', setMode);
setMode();
updatePosition();
toc.classList.add('toc-ready');
