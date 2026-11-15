const targets = [
  '#result',
  '.result-figure .preview-frame',
  '.result-figure figcaption',
  '.result-summary',
];
const timing = { duration: 180, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' };

function visiblePanelBounds(panel: HTMLElement) {
  const bounds = panel.getBoundingClientRect();
  const inset = getComputedStyle(panel).clipPath.match(/^inset\(([^)]+)\)$/);
  if (!inset) return bounds;
  const edges = inset[1].trim().split(/\s+/).map(Number.parseFloat);
  const top = edges[0] || 0;
  const bottom = edges[2] ?? top;
  return new DOMRect(
    bounds.x,
    bounds.y + top,
    bounds.width,
    Math.max(0, bounds.height - top - bottom),
  );
}

export function captureMobileLayout(root: HTMLElement, leaving: boolean) {
  const items = targets.flatMap((selector) => {
    const bounds = root.querySelector<HTMLElement>(selector)?.getBoundingClientRect();
    return bounds?.width && bounds.height ? [{ selector, bounds }] : [];
  });
  const panel = root.querySelector<HTMLElement>('.mobile-panel');
  const panelBounds = panel ? visiblePanelBounds(panel) : undefined;
  const ghost = leaving && panel ? (panel.cloneNode(true) as HTMLElement) : undefined;
  if (ghost) {
    ghost.inert = true;
    ghost.setAttribute('aria-hidden', 'true');
    ghost.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
  }
  const panelScroll = panel?.querySelector('.panel-body')?.scrollTop ?? 0;
  return { items, panelBounds, ghost, panelScroll };
}

/** FLIP the preview; reveal a fixed control layout within its final layout slot. */
export function animateMobileLayout(
  root: HTMLElement,
  before: ReturnType<typeof captureMobileLayout>,
) {
  const animations: Animation[] = [];
  const restorations: (() => void)[] = [];
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    animations.forEach((animation) => animation.cancel());
    restorations.forEach((restore) => restore());
  };
  const freezeBody = (panel: HTMLElement) => {
    const body = panel.querySelector<HTMLElement>('.panel-body');
    if (!body) return;
    const style = body.getAttribute('style');
    // Keep the final viewport size; don't reflow masked control artwork during motion.
    const width = body.getBoundingClientRect().width - (body.offsetWidth - body.clientWidth);
    const height = body.getBoundingClientRect().height - (body.offsetHeight - body.clientHeight);
    Object.assign(body.style, {
      width: `${width}px`,
      height: `${height}px`,
      flex: 'none',
      overflow: 'hidden',
    });
    restorations.push(() => {
      if (style === null) body.removeAttribute('style');
      else body.setAttribute('style', style);
    });
  };
  const wrap = root.querySelector<HTMLElement>('.result-figure .canvas-wrap');
  if (wrap) {
    const overflow = wrap.style.overflow;
    wrap.style.overflow = 'visible';
    restorations.push(() => {
      wrap.style.overflow = overflow;
    });
  }
  for (const { selector, bounds: previous } of before.items) {
    const element = root.querySelector<HTMLElement>(selector);
    if (!element) continue;
    const next = element.getBoundingClientRect();
    if (!next.width || !next.height) continue;
    const scale = selector === '#result' || selector.includes('preview-frame');
    const transform = `translate(${previous.x - next.x}px, ${previous.y - next.y}px) scale(${scale ? previous.width / next.width : 1}, ${scale ? previous.height / next.height : 1})`;
    animations.push(
      element.animate(
        [
          { transformOrigin: '0 0', transform },
          { transformOrigin: '0 0', transform: 'none' },
        ],
        timing,
      ),
    );
  }
  const panel = root.querySelector<HTMLElement>('.mobile-panel');
  const current = panel?.getBoundingClientRect();
  if (panel && current) {
    const fromHeight = before.panelBounds?.height ?? 0;
    const extent = Math.max(fromHeight, current.height);
    freezeBody(panel);
    const slot = document.createElement('div');
    slot.setAttribute('aria-hidden', 'true');
    Object.assign(slot.style, {
      flex: '0 0 auto',
      width: `${current.width}px`,
      height: `${current.height}px`,
    });
    const style = panel.getAttribute('style');
    panel.before(slot);
    Object.assign(panel.style, {
      position: 'fixed',
      left: `${current.x}px`,
      top: `${current.y}px`,
      bottom: 'auto',
      width: `${current.width}px`,
      height: `${extent}px`,
      maxHeight: 'none',
      overflow: 'hidden',
      zIndex: '11',
    });
    restorations.push(() => {
      slot.remove();
      if (style === null) panel.removeAttribute('style');
      else panel.setAttribute('style', style);
    });
    animations.push(
      panel.animate(
        [
          {
            transform: `translateY(${current.height - fromHeight}px)`,
            clipPath: `inset(0px 0px ${extent - fromHeight}px 0px)`,
          },
          {
            transform: 'translateY(0px)',
            clipPath: `inset(0px 0px ${extent - current.height}px 0px)`,
          },
        ],
        { ...timing, fill: 'forwards' },
      ),
    );
  } else if (before.ghost && before.panelBounds?.height) {
    const ghost = before.ghost;
    const bounds = before.panelBounds;
    Object.assign(ghost.style, {
      position: 'fixed',
      left: `${bounds.x}px`,
      top: 'auto',
      bottom: `${innerHeight - bounds.bottom}px`,
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
      maxHeight: 'none',
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: '11',
    });
    root.append(ghost);
    freezeBody(ghost);
    const body = ghost.querySelector('.panel-body');
    if (body) body.scrollTop = before.panelScroll;
    restorations.push(() => ghost.remove());
    animations.push(
      ghost.animate(
        [
          { height: `${bounds.height}px`, opacity: 1 },
          { height: '0px', opacity: 0 },
        ],
        { ...timing, duration: 150, fill: 'forwards' },
      ),
    );
  }
  void Promise.all(animations.map((animation) => animation.finished.catch(() => undefined))).then(
    cleanup,
  );
  return cleanup;
}
