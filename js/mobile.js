// The phone layout. Built only the first time the mobile breakpoint
// (MOBILE_LAYOUT_QUERY, script.js) matches, into its own root (.m-root) -
// the desktop tree is never touched, only hidden by CSS while this shows.
//
// Same data, media and helpers as the desktop - nothing here is a copy:
//   PANELS / TAB_ACCENT_COLORS          tab titles and colors
//   ABOUT_BODY_PARAGRAPHS / ABOUT_SKILLS About Me's text and ribbon
//   PROJECTS_BY_PANEL                   each tab's projects (same order)
//   PERSONAL_PHOTOS_BY_PANEL            each tab's gallery (same shuffle)
//   personalPhotoLayout                 the galleries' random empty cells
//   createProjectImage                  every photo/GIF/video element
//   buildContactContent                 Contact's MAIL/TEL/INSTAGRAM block
//   drawerTextFor / appendDrawerWords   a project's text (the desktop
//                                       viewer's), rendered inline here
//   allCells/totalWidth/totalHeight     the landing glyph composition
// Only the spatial layout and the touch interactions differ (see the
// MOBILE LAYOUT section of style.css).
(function () {
  const LANDING_PHOTO_SRC = 'images/media/login.png';
  const TAGLINE_LINES = ['Multidisciplinary designer_', '&_', 'Photographer_'];

  let root = null;
  let landingEl = null;
  let taglineEl = null;
  let contactEl = null;
  let full = null;
  let stripEl = null;
  const tabs = [];
  let openIndex = -1;

  const NOTICE_TEXT = 'For a better experience and more information about the projects, viewing the portfolio on a computer is recommended.';
  // Shown once per browser session (sessionStorage), never again after it's
  // closed - not on opening tabs, projects or media.
  const NOTICE_SEEN_KEY = 'portfolio:mobileNoticeSeen';
  // How far a pointer may travel and still be a tap, not a swipe.
  const TAP_SLOP_PX = 10;
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

  function el(tag, className, parent) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (parent) parent.appendChild(node);
    return node;
  }

  // RASTERIZED MOTION - the one movement every mobile transition uses: the
  // tabs opening/closing, the notice leaving, fullscreen media entering,
  // leaving and changing. It IS the desktop tabs' own clock -
  // runSteppedAnimation (tabs.js), called as-is: the tabs' duration and
  // ease, time advancing only every --tabs-step-interval, and (grid: true)
  // the distance travelled snapped to --tabs-grid-step - so a move reads as
  // POSITION 1 -> 2 -> 3 -> ... -> END in visible jumps. One move per owner
  // at a time (a new one cancels the last); done() runs once it lands.
  // With prefers-reduced-motion it lands at once (zero duration) - the
  // interaction itself is unchanged.
  function rasterMove(owner, from, to, apply, options) {
    const opts = options || {};
    const duration = REDUCED_MOTION.matches ? 0 : TABS_DURATION_MS;
    runSteppedAnimation(owner, '_mRasterFrame', from, to, duration, apply, {
      snapToGrid: !!opts.grid,
      onFrame: () => {
        if (owner._mRasterFrame === null && opts.done) opts.done();
      }
    });
  }

  function stopRasterMove(owner) {
    if (owner._mRasterFrame) cancelAnimationFrame(owner._mRasterFrame);
    owner._mRasterFrame = null;
  }

  // An element's horizontal position, on the compositor only (no layout).
  function setX(node, x) {
    node.style.transform = x ? `translate3d(${x}px, 0, 0)` : '';
  }

  // Wires "tap here closes" onto a backdrop: only a tap whose target is the
  // backdrop itself (never something inside it - the event's target, not
  // its currentTarget), and only a real tap - a pointer that moved past the
  // slop was a swipe, wherever it ended.
  function onBackdropTap(backdrop, isInside, action) {
    let downX = 0;
    let downY = 0;
    backdrop.addEventListener('pointerdown', e => {
      downX = e.clientX;
      downY = e.clientY;
    });
    backdrop.addEventListener('click', e => {
      if (isInside(e.target)) return;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > TAP_SLOP_PX) return;
      action();
    });
  }

  // Text laid out one character per cell (the desktop's grid-char), words
  // kept whole so a long title wraps between words, never inside one.
  function appendGridText(parent, text, wrapWords) {
    const words = wrapWords ? text.split(' ') : [text];
    words.forEach((word, wi) => {
      const holder = wrapWords ? el('span', 'm-word', parent) : parent;
      word.split('').forEach(ch => {
        el('span', 'm-grid-char', holder).textContent = ch;
      });
      if (wrapWords && wi < words.length - 1) {
        el('span', 'm-grid-char', parent).textContent = ' ';
        parent.appendChild(document.createTextNode('​'));
      }
    });
  }

  function buildTitle(text) {
    const title = el('h2', 'm-title');
    text.split('').forEach(ch => {
      el('span', 'm-title-char', title).textContent = ch;
    });
    return title;
  }

  // Makes an element act as a button: tap/click and Enter/Space.
  function asButton(node, label, action) {
    if (node.tagName !== 'BUTTON') {
      node.setAttribute('role', 'button');
      node.setAttribute('tabindex', '0');
    }
    node.setAttribute('aria-label', label);
    node.addEventListener('click', e => {
      e.stopPropagation();
      action();
    });
    node.addEventListener('keydown', e => {
      if (e.target !== node || node.tagName === 'BUTTON') return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        action();
      }
    });
  }

  // The orange square control: "+"/"−" next to a project title (opens /
  // closes its info) and "−" in fullscreen (closes the media). Same
  // element, two classes for their two colors - see .m-square in CSS.
  function squareButton(className, symbol, label, action) {
    const btn = el('button', 'm-square ' + className);
    btn.type = 'button';
    btn.textContent = symbol;
    asButton(btn, label, action);
    return btn;
  }

  // --- Contact -------------------------------------------------------------

  function buildContact() {
    contactEl = el('div', 'm-contact', root);
    contactEl.setAttribute('aria-expanded', 'false');
    // The desktop's own info block (copy buttons, "*copied", the link) -
    // its clicks already stop at itself, so they never toggle the strip.
    contactEl.appendChild(buildContactContent());
    const handle = el('div', 'm-band m-contact-handle', contactEl);
    handle.appendChild(buildTitle('contact'));
    asButton(contactEl, 'contact', () => setContactOpen(!contactEl.classList.contains('is-open')));
  }

  function setContactOpen(open) {
    contactEl.classList.toggle('is-open', open);
    contactEl.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  // --- Landing -------------------------------------------------------------
  // A FIXED visual layer: its box is the room between Contact and the
  // closed tabs, and never changes - opening a tab doesn't resize, scale or
  // move it; the tabs slide over it and cover it, all but the strip under
  // Contact (--m-strip-h, see glyphs.layout).

  function buildLanding() {
    landingEl = el('div', 'm-landing', root);
    const photo = el('img', 'm-landing-photo', landingEl);
    photo.src = LANDING_PHOTO_SRC;
    photo.alt = '';
    photo.draggable = false;
    // Over the photo, one column: GLYPH AREA (the canvas is exactly this
    // box - the glyphs can never leave it - with FEDERICO OSATNIK resting
    // on its bottom edge), then a small fixed gap, then the tagline - so the
    // text always starts right under the name - then the rest of the room.
    // The area and the room below share the free height, so the name and
    // the text sit together around the landing's middle.
    const stack = el('div', 'm-landing-stack', landingEl);
    const glyphArea = el('div', 'm-glyph-area', stack);
    const canvas = el('canvas', 'm-glyphs', glyphArea);
    taglineEl = el('p', 'm-tagline', stack);
    el('div', 'm-landing-rest', stack);
    TAGLINE_LINES.forEach(line => {
      appendGridText(el('span', 'm-tagline-line', taglineEl), line, false);
    });
    root.style.setProperty('--m-tagline-chars', Math.max(...TAGLINE_LINES.map(l => l.length)));
    // Like the desktop: a tap on the landing opens About; a tap on the
    // strip left visible (the OSATNIK name) goes back to the landing.
    landingEl.addEventListener('click', () => setOpenTab(openIndex < 0 ? 0 : -1));
    glyphs.init(canvas);
  }

  // --- Landing glyphs ------------------------------------------------------
  // The desktop composition (script.js's allCells - FEDERICO / OSATNIK),
  // drawn the same way (one canvas, the same '#' glyph and color, blended).
  // Two modes:
  //   'land' - every tab closed. With no hover to react to, every glyph
  //            hops on its own: at its own random interval it jumps a whole
  //            number of cells - to a random cell around its home, or back
  //            home - through the desktop's stepped hop (CELL_HOP_MS on the
  //            TRANSITION_STEP_MS clock, snapped to the cell lattice),
  //            never leaving the landing box.
  //   'name' - a tab open. The glyphs gather into FEDERICO OSATNIK inside
  //            the strip that stays visible under Contact, and rest there.
  // The switch between them is the desktop's own stepped transition
  // (TRANSITION_MS on the same clock). Both modes share one cell, so the
  // glyphs never change scale. Canvas only: no DOM element moves, so there
  // is no layout or reflow, and a frame is only redrawn when some glyph
  // actually moved a step. The loop exists only while something can move -
  // see glyphs.sync().
  const glyphs = (function () {
    const HOP_MS = typeof CELL_HOP_MS === 'number' ? CELL_HOP_MS : 140;
    const STEP_MS = typeof TRANSITION_STEP_MS === 'number' ? TRANSITION_STEP_MS : 45;
    const MODE_MS = typeof TRANSITION_MS === 'number' ? TRANSITION_MS : 350;
    // How long a glyph rests before its next hop, and the delay before the
    // first ones (so the name shows assembled first).
    const REST_MIN_MS = 700;
    const REST_SPREAD_MS = 2600;
    const FIRST_HOP_MIN_MS = 900;
    const FIRST_HOP_SPREAD_MS = 3500;
    // Chance that a displaced glyph's next hop takes it back home.
    const RETURN_CHANCE = 0.6;
    // Reach of a hop around home, as a share of the area's smaller side.
    const REACH = 0.2;
    // The strip: the name's width is the screen less the side margins; it
    // never takes more than this share of the landing's height.
    const STRIP_MAX_SHARE = 0.3;

    let canvas = null;
    let ctx = null;
    let width = 0;
    let height = 0;
    let cell = 0;
    let particles = [];
    let mode = 'land';
    let modeStart = null;
    let raf = null;
    let dirty = true;
    // Held: the landing's random motion hasn't started yet - the glyphs
    // show, assembled and still, while the entry notice is up (see
    // buildNotice). Released once, when the notice has fully left.
    let held = false;

    function init(c) {
      canvas = c;
      ctx = canvas.getContext('2d');
      new ResizeObserver(() => {
        layout();
        sync();
      }).observe(canvas);
      document.addEventListener('visibilitychange', sync);
      // The tagline's height (so the glyph area's) depends on its font.
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layout(); sync(); });
    }

    function snapToCell(v) {
      return Math.round(v / cell) * cell;
    }

    // Both compositions on one cell, sized from the landing box (fixed),
    // never from the glyph area (which the composition itself sizes): the
    // landing's composition rests on the glyph area's bottom edge - its
    // height published as --m-comp-h, the area's least height, so the
    // tagline starts right under it - and the strip's is centered in the
    // strip, whose height (--m-strip-h, read by the CSS column) is set here
    // from that same cell.
    function layout() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const landH = landingEl.getBoundingClientRect().height;
      if (width < 4 || landH < 4) return;

      // The side margin, as laid out (the tagline's left edge).
      const side = taglineEl
        ? taglineEl.getBoundingClientRect().left - canvas.getBoundingClientRect().left
        : 12;
      const stripMax = landH * STRIP_MAX_SHARE;
      cell = Math.max(2, Math.min(
        (width - 2 * side) / totalWidth,
        (landH * 0.4) / totalHeight,
        (stripMax - 2 * side) / totalHeight
      ));
      const compW = totalWidth * cell;
      const compH = totalHeight * cell;
      const stripH = Math.round(compH + 2 * side);
      root.style.setProperty('--m-strip-h', stripH + 'px');
      root.style.setProperty('--m-comp-h', Math.ceil(compH) + 'px');
      if (height < 4) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const landX = (width - compW) / 2;
      const landY = Math.max(0, height - compH);
      const nameX = (width - compW) / 2;
      const nameY = (stripH - compH) / 2;
      const now = performance.now();
      particles = allCells.map(c => {
        const p = {
          homeX: landX + c.col * cell,
          homeY: landY + c.row * cell,
          nameX: nameX + c.col * cell,
          nameY: nameY + c.row * cell,
          // Current offset from home, in whole cells, and the hop under way.
          dc: 0, dr: 0,
          fromDc: 0, fromDr: 0,
          hopStart: null,
          nextAt: now + FIRST_HOP_MIN_MS + Math.random() * FIRST_HOP_SPREAD_MS
        };
        p.drawX = mode === 'name' ? p.nameX : p.homeX;
        p.drawY = mode === 'name' ? p.nameY : p.homeY;
        return p;
      });
      modeStart = null;
      // Painted right away - even before (or without) the loop.
      draw();
    }

    // Cell offsets that keep a glyph wholly inside the area.
    function clampOffset(p, dc, dr) {
      const minDc = Math.ceil(-p.homeX / cell);
      const maxDc = Math.floor((width - cell - p.homeX) / cell);
      const minDr = Math.ceil(-p.homeY / cell);
      const maxDr = Math.floor((height - cell - p.homeY) / cell);
      return [
        Math.max(minDc, Math.min(maxDc, dc)),
        Math.max(minDr, Math.min(maxDr, dr))
      ];
    }

    function startHop(p, now) {
      let dc = 0;
      let dr = 0;
      const away = p.dc !== 0 || p.dr !== 0;
      if (!away || Math.random() > RETURN_CHANCE) {
        const reach = Math.max(2, Math.round(Math.min(width, height) / cell * REACH));
        dc = Math.round((Math.random() * 2 - 1) * reach);
        dr = Math.round((Math.random() * 2 - 1) * reach);
        [dc, dr] = clampOffset(p, dc, dr);
      }
      p.fromDc = p.dc;
      p.fromDr = p.dr;
      p.dc = dc;
      p.dr = dr;
      p.hopStart = now;
      p.nextAt = now + HOP_MS + REST_MIN_MS + Math.random() * REST_SPREAD_MS;
    }

    // Where a glyph rests in the landing's random motion right now.
    function landPosition(p, now) {
      if (now >= p.nextAt) startHop(p, now);
      let dc = p.dc;
      let dr = p.dr;
      if (p.hopStart !== null) {
        const stepped = Math.floor((now - p.hopStart) / STEP_MS) * STEP_MS;
        const t = Math.min(1, stepped / HOP_MS);
        if (t < 1) {
          dc = Math.round(p.fromDc + (p.dc - p.fromDc) * t);
          dr = Math.round(p.fromDr + (p.dr - p.fromDr) * t);
        } else {
          p.hopStart = null;
        }
      }
      return [p.homeX + dc * cell, p.homeY + dr * cell];
    }

    // 'name' when a tab is open, 'land' when none is: every glyph travels
    // from wherever it is now to the other composition.
    function setMode(next) {
      if (next === mode) return;
      mode = next;
      modeStart = performance.now();
      particles.forEach(p => {
        p.fromX = p.drawX;
        p.fromY = p.drawY;
        if (mode === 'land') {
          // Back home, assembled, then the random hops resume.
          p.dc = p.dr = 0;
          p.hopStart = null;
          p.nextAt = modeStart + MODE_MS + FIRST_HOP_MIN_MS + Math.random() * FIRST_HOP_SPREAD_MS;
        }
      });
      sync();
    }

    function frame(now) {
      raf = null;
      if (!shouldRun()) return;
      let t = 1;
      if (modeStart !== null) {
        const stepped = Math.floor((now - modeStart) / STEP_MS) * STEP_MS;
        t = Math.min(1, stepped / MODE_MS);
        if (t >= 1) modeStart = null;
      }
      for (const p of particles) {
        let x;
        let y;
        if (t < 1) {
          const toX = mode === 'name' ? p.nameX : p.homeX;
          const toY = mode === 'name' ? p.nameY : p.homeY;
          x = snapToCell(p.fromX + (toX - p.fromX) * t);
          y = snapToCell(p.fromY + (toY - p.fromY) * t);
        } else if (mode === 'name') {
          x = p.nameX;
          y = p.nameY;
        } else {
          [x, y] = landPosition(p, now);
        }
        if (x !== p.drawX || y !== p.drawY) {
          p.drawX = x;
          p.drawY = y;
          dirty = true;
        }
      }
      if (dirty) draw();
      raf = requestAnimationFrame(frame);
    }

    function draw() {
      dirty = false;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgb(229, 229, 229)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${Math.max(cell * 0.9, 7)}px 'Courier New', monospace`;
      for (const p of particles) {
        ctx.fillText('#', p.drawX + cell / 2, p.drawY + cell / 2);
      }
    }

    // Moving: the landing's hops (once released), or a switch between the
    // two modes.
    function shouldRun() {
      return !!canvas && isMobileLayout() && !document.hidden &&
        width >= 4 && height >= 4 && particles.length > 0 &&
        ((mode === 'land' && !held) || modeStart !== null);
    }

    function hold() {
      held = true;
      sync();
    }

    // The first start: every glyph's first hop is timed from now (not from
    // the page load), so they begin one by one rather than all at once.
    function release() {
      if (!held) return;
      held = false;
      const now = performance.now();
      particles.forEach(p => {
        p.nextAt = now + FIRST_HOP_MIN_MS + Math.random() * FIRST_HOP_SPREAD_MS;
      });
      sync();
    }

    // Starts the loop when it should run, stops it (no frame left behind)
    // whenever it shouldn't: the desktop layout, a hidden page, the name
    // resting in its strip.
    function sync() {
      if (shouldRun()) {
        if (!raf) raf = requestAnimationFrame(frame);
      } else if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    }

    return { init, sync, layout, setMode, hold, release };
  })();

  // --- Bottom tabs -----------------------------------------------------------
  // Each tab is its colored band (the handle) with its content BELOW it.
  // Closed, the content has no height; open, the tab takes the room the
  // landing had - so its band slides up and the content unrolls under it.

  function buildTabs(column) {
    root.style.setProperty('--m-title-chars', Math.max(...PANELS.map(p => p.title.length)));
    PANELS.forEach((panel, i) => {
      const tab = el('section', 'm-tab', column);
      tab.dataset.panel = panel.id;
      tab.style.flexGrow = '0';
      const colors = TAB_ACCENT_COLORS[panel.id];
      if (colors) {
        tab.style.setProperty('--m-band-color', colors.rect);
        tab.style.setProperty('--m-title-color', colors.title);
      }
      const handle = el('div', 'm-band m-tab-handle', tab);
      handle.appendChild(buildTitle(panel.title));
      handle.setAttribute('aria-expanded', 'false');
      asButton(handle, panel.title.toLowerCase(), () => setOpenTab(openIndex === i ? -1 : i));
      const content = el('div', 'm-tab-content', tab);

      if (panel.body) buildAbout(content, panel);
      if (PROJECTS_BY_PANEL[panel.id] || PERSONAL_PHOTOS_BY_PANEL[panel.id]) {
        buildProjects(content, panel.id);
      }
      tabs.push({ el: tab, handle, content });
    });
  }

  // Opens tab i, or -1 to close back to the landing. The room moves between
  // the strip (the landing's free room) and the tabs by their flex-grow -
  // always summing to 1, so nothing else in the column jumps - on the
  // shared rasterized clock (rasterMove).
  const tabMotion = {};
  function setOpenTab(i) {
    openIndex = i;
    root.classList.toggle('has-open-tab', i >= 0);
    tabs.forEach((tab, j) => {
      tab.el.classList.toggle('is-open', j === i);
      tab.handle.setAttribute('aria-expanded', j === i ? 'true' : 'false');
    });
    glyphs.setMode(i >= 0 ? 'name' : 'land');
    const items = [stripEl, ...tabs.map(t => t.el)];
    const from = items.map(node => parseFloat(node.style.flexGrow) || 0);
    const to = items.map((node, k) => (k === 0 ? (i < 0 ? 1 : 0) : (k - 1 === i ? 1 : 0)));
    rasterMove(tabMotion, 0, 1, p => {
      items.forEach((node, k) => { node.style.flexGrow = from[k] + (to[k] - from[k]) * p; });
    });
  }

  function buildAbout(content, panel) {
    const about = el('div', 'm-about', content);
    panel.body.forEach(text => appendWithNameSpan(el('p', '', about), text));
    if (panel.list) {
      const marquee = el('div', 'm-marquee', about);
      const track = el('div', 'm-marquee-track', marquee);
      const loopText = panel.list.join(' - ') + ' - ';
      appendGridText(track, loopText + loopText, false);
    }
  }

  // A project's (or gallery's) title band.
  function buildCaption(parent, title) {
    const caption = el('div', 'm-caption', parent);
    appendGridText(el('span', 'm-project-title', caption), title, true);
    return caption;
  }

  // The project's own text - exactly what the desktop's open view shows
  // (drawerTextFor and the same word/link helpers): its credit, year and
  // location, format, and description with its inline links.
  function buildProjectInfo(project) {
    const text = drawerTextFor(project, 0);
    const lines = [
      ['m-info-credit', project.credit],
      ['m-info-location', text.locationLine],
      ['m-info-format', project.format]
    ].filter(([, value]) => value);
    if (!lines.length && !text.description) return null;
    const inner = el('div', 'm-info-inner');
    lines.forEach(([className, value]) => { el('div', className, inner).textContent = value; });
    if (text.description) {
      const description = el('div', 'm-info-description', inner);
      appendDrawerWords(description, [
        ...drawerHeadingWords(text.heading),
        ...drawerDescriptionWords(text.description, text.inlineLinks || [])
      ]);
      if (text.link) description.appendChild(buildDrawerLinkLine(text.link, false));
    }
    return inner;
  }

  function buildProjects(content, panelId) {
    const list = el('div', 'm-projects', content);
    // Each project, top to bottom: its media, its title, the row of tags
    // with the year and the info control at its right end, then the info.
    (PROJECTS_BY_PANEL[panelId] || []).forEach(project => {
      const block = el('div', 'm-project', list);
      const images = project.images || [];
      // The photos: the carousel's media, in order, on a natively
      // swipeable row (only the row scrolls sideways - see .m-carousel). A
      // tap opens that same array in fullscreen, at the tapped one.
      const carousel = el('div', 'm-carousel', block);
      images.forEach((image, i) => {
        const item = el('div', 'm-carousel-item', carousel);
        item.style.aspectRatio = `${image.w} / ${image.h}`;
        item.appendChild(createProjectImage(image, project.title));
        item.addEventListener('click', () => openFullscreen(images, i, project.title));
      });
      buildCaption(block, project.title);

      const meta = el('div', 'm-meta', block);
      const tags = el('div', 'm-tags', meta);
      (project.tags || []).forEach(tag => { el('span', '', tags).textContent = tag; });
      // YEAR [+]: one unit on the row's right end.
      const end = el('div', 'm-meta-end', meta);
      if (project.year) el('span', 'm-year', end).textContent = project.year;

      // The info: inline, in the project's own flow - its height is real,
      // so opening it pushes every project below down (keeping the gap).
      const inner = buildProjectInfo(project);
      if (inner) {
        const infoWrap = el('div', 'm-info', block);
        el('div', 'm-info-clip', infoWrap).appendChild(inner);
        const toggle = squareButton('m-info-toggle', '+', 'Show project information', () => {
          const open = !block.classList.contains('is-expanded');
          block.classList.toggle('is-expanded', open);
          toggle.textContent = open ? '−' : '+';
          toggle.setAttribute('aria-label', open ? 'Hide project information' : 'Show project information');
          toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        toggle.setAttribute('aria-expanded', 'false');
        end.appendChild(toggle);
      }
      if (!end.children.length) end.remove();
    });
    const collection = PERSONAL_PHOTOS_BY_PANEL[panelId];
    if (collection) buildGallery(list, collection);
  }

  // The gallery (Explorations & Other Works / Archive): the desktop's
  // 4-column grid, its empty cells drawn by the desktop's own
  // personalPhotoLayout - once per filter per page load, never again on a
  // resize - with its filters (the same tests) narrowing it, in order.
  function buildGallery(parent, collection) {
    const section = el('div', 'm-gallery', parent);
    buildCaption(section, collection.title);
    const filters = collection.filters || [{ test: () => true }];
    const grid = el('div', 'm-gallery-grid');
    const cells = [];
    const layouts = [];
    // The items the grid shows now, in its reading order (this load's
    // shuffle, narrowed by the filter) - what fullscreen swipes through.
    let shownImages = [];
    function cellFor(i) {
      if (cells[i]) return cells[i];
      const cell = el('div', 'm-gallery-cell');
      const image = collection.images[i];
      cell.appendChild(createProjectImage(image, collection.title));
      cell.addEventListener('click', () => openFullscreen(shownImages, shownImages.indexOf(image), collection.title));
      cells[i] = cell;
      return cell;
    }
    function render(filterIndex) {
      const shown = collection.images.map((_, i) => i)
        .filter(i => filters[filterIndex].test(collection.images[i]));
      shownImages = shown.map(i => collection.images[i]);
      if (!layouts[filterIndex]) layouts[filterIndex] = personalPhotoLayout(shown.length, collection.layoutSeed);
      grid.textContent = '';
      layouts[filterIndex].forEach(slot => {
        if (slot < 0) {
          el('div', 'm-gallery-empty', grid).setAttribute('aria-hidden', 'true');
        } else {
          grid.appendChild(cellFor(shown[slot]));
        }
      });
    }
    if (collection.filters) {
      const row = el('div', 'm-tags m-filters', section);
      const filterEls = collection.filters.map((filter, i) => {
        const f = el('span', 'm-filter', row);
        f.textContent = filter.label;
        asButton(f, filter.label, () => {
          if (f.classList.contains('is-active')) return;
          filterEls.forEach(other => other.classList.toggle('is-active', other === f));
          render(i);
        });
        return f;
      });
      filterEls[0].classList.add('is-active');
    }
    section.appendChild(grid);
    render(0);
  }

  // --- Fullscreen media --------------------------------------------------------
  // A project's (or a gallery's) media over the whole screen, opened at the
  // one tapped, swiping through the very same array its inline carousel (or
  // grid) shows, in the same order. Each item is whole and centered
  // (contain), as large as its slide allows, already at that size while it
  // moves - nothing scales or fades.
  //
  // Two parts. STATIC: the backdrop (the desktop's translucent white veil)
  // and the "−" - they appear in place on open, never move, and vanish at
  // once when the media has left. MOVING: only the media, always through
  // rasterMove, horizontally, the way a desktop tab travels - the tapped
  // item comes in from the right edge (like a tab opening leftward) and,
  // on close, leaves back past it (like a tab closing). Between items, the
  // row follows the finger while it drags; past the threshold (or on a
  // flick) the next/previous item completes the move on the same stepped
  // clock - left brings the next one in from the right.
  //
  // Closes with the "−" or a tap on the backdrop (anything that isn't the
  // media); a swipe never counts as that tap, a tap on the media does
  // nothing. A layer above the page: opening and closing it never touches
  // the page under it - its scroll, a carousel's position, an expanded
  // project, the galleries.

  // Share of the screen a drag must cover to change item, and the speed
  // (px/ms) that counts as a flick even below it.
  const SWIPE_THRESHOLD = 0.18;
  const SWIPE_FLICK_SPEED = 0.45;
  // How much of a drag past the first/last item still moves the row.
  const SWIPE_EDGE_RESISTANCE = 0.3;

  function buildFullscreen() {
    full = el('div', 'm-full', root);
    full.setAttribute('role', 'dialog');
    full.setAttribute('aria-modal', 'true');
    full.setAttribute('aria-hidden', 'true');
    const track = el('div', 'm-full-track', full);
    const row = el('div', 'm-full-row', track);
    full.appendChild(squareButton('m-full-close', '−', 'Close', closeFullscreen));
    Object.assign(full, { _track: track, _row: row, _slides: [], _index: 0, _offset: 0, _closing: false });
    // The row's move (swipes) and the active item's own (entry / exit),
    // both on rasterMove.
    full._rowMotion = {};
    full._itemMotion = {};

    onBackdropTap(full, target => !!target.closest('.m-full-media, .m-full-close'), closeFullscreen);

    // Dragging the row: it follows the finger 1:1 (on the compositor), and
    // on release settles on an item through rasterMove.
    let drag = null;
    track.addEventListener('pointerdown', e => {
      if (!e.isPrimary || full.classList.contains('is-moving')) return;
      stopRasterMove(full._rowMotion);
      drag = { id: e.pointerId, x0: e.clientX, t0: performance.now(), base: full._offset, active: false };
    });
    track.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      let dx = e.clientX - drag.x0;
      if (!drag.active) {
        if (Math.abs(dx) <= TAP_SLOP_PX) return;
        drag.active = true;
        track.setPointerCapture(drag.id);
      }
      const atStart = full._index === 0 && dx > 0;
      const atEnd = full._index === full._slides.length - 1 && dx < 0;
      if (atStart || atEnd) dx *= SWIPE_EDGE_RESISTANCE;
      full._offset = drag.base + dx;
      setX(row, full._offset);
    });
    const release = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const wasActive = drag.active;
      const dx = e.clientX - drag.x0;
      const speed = dx / Math.max(1, performance.now() - drag.t0);
      drag = null;
      if (!wasActive) return;
      const width = track.clientWidth;
      let target = full._index;
      if (dx < -width * SWIPE_THRESHOLD || speed < -SWIPE_FLICK_SPEED) target++;
      else if (dx > width * SWIPE_THRESHOLD || speed > SWIPE_FLICK_SPEED) target--;
      goToFullscreen(target);
    };
    track.addEventListener('pointerup', release);
    track.addEventListener('pointercancel', release);

    window.addEventListener('resize', () => {
      if (!full.classList.contains('is-open')) return;
      full._offset = -full._index * track.clientWidth;
      setX(row, full._offset);
    });
    window.addEventListener('keydown', e => {
      if (!full.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeFullscreen();
      else if (e.key === 'ArrowRight') goToFullscreen(full._index + 1);
      else if (e.key === 'ArrowLeft') goToFullscreen(full._index - 1);
    });
  }

  function openFullscreen(images, index, title) {
    if (!images.length || full._closing) return;
    stopRasterMove(full._itemMotion);
    clearFullscreen();
    // Fresh elements of the same media - a video keeps muted/loop/inline
    // and plays while it's the active one; a GIF keeps animating.
    full._slides = images.map(image => {
      const slide = el('div', 'm-full-slide', full._row);
      const media = el('div', 'm-full-media', slide);
      media.style.setProperty('--m-media-ratio', image.w / image.h);
      media.appendChild(createProjectImage(image, title));
      return slide;
    });
    full.classList.add('is-open', 'is-moving');
    full.setAttribute('aria-hidden', 'false');
    full._index = Math.max(0, Math.min(images.length - 1, index));
    full._offset = -full._index * full._track.clientWidth;
    setX(full._row, full._offset);
    playActiveVideo();
    // Backdrop and "−" are already in place; only the tapped item comes in
    // from the right edge, already at its full size.
    const slide = full._slides[full._index];
    const width = full._track.clientWidth;
    setX(slide, width);
    rasterMove(full._itemMotion, width, 0, x => setX(slide, x), {
      grid: true,
      done: () => full.classList.remove('is-moving')
    });
  }

  // Settles on item `index` (clamped), from wherever the row is now.
  function goToFullscreen(index) {
    const n = full._slides.length;
    if (!n) return;
    full._index = Math.max(0, Math.min(n - 1, index));
    playActiveVideo();
    const to = -full._index * full._track.clientWidth;
    rasterMove(full._rowMotion, full._offset, to, x => {
      full._offset = x;
      setX(full._row, x);
    }, { grid: true });
  }

  // Only the active item's video plays; every other one is paused at once
  // (the shared observer would also stop it once fully off-screen).
  function playActiveVideo() {
    full._slides.forEach((slide, i) => {
      const video = slide.querySelector('video');
      if (!video) return;
      if (i === full._index) video.play().catch(() => {});
      else video.pause();
    });
  }

  // The active item leaves past the right edge while backdrop and "−" stay
  // put; once it's fully out, the whole layer is gone at once - hidden,
  // emptied, no transform left. Taps are ignored while it moves
  // (is-moving), so it closes only once.
  function closeFullscreen() {
    if (!full.classList.contains('is-open') || full._closing) return;
    full._closing = true;
    full.classList.add('is-moving');
    stopRasterMove(full._rowMotion);
    stopRasterMove(full._itemMotion);
    const slide = full._slides[full._index];
    const finish = () => {
      full.classList.remove('is-open', 'is-moving');
      full.setAttribute('aria-hidden', 'true');
      clearFullscreen();
      full._closing = false;
    };
    if (!slide) {
      finish();
      return;
    }
    rasterMove(full._itemMotion, 0, full._track.clientWidth, x => setX(slide, x), {
      grid: true,
      done: finish
    });
  }

  function clearFullscreen() {
    full._row.querySelectorAll('video').forEach(v => {
      projectVideoObserver.unobserve(v);
      v.pause();
    });
    full._row.textContent = '';
    setX(full._row, 0);
    full._slides = [];
    full._index = 0;
    full._offset = 0;
  }

  // --- Notice ------------------------------------------------------------------
  // On entering on a phone, once per session: a large gray rectangle,
  // centered over everything, with part of the portfolio still showing
  // around it. Closes with its "−", a tap on the backdrop around it (not
  // inside it) or Escape - and then leaves sideways on the rasterized clock
  // (rasterMove), out past the right edge like a tab closing, the backdrop
  // clearing in the same steps; only then is it removed. The page behind
  // never moves.

  function noticeSeen() {
    try { return sessionStorage.getItem(NOTICE_SEEN_KEY) === '1'; } catch (e) { return false; }
  }

  function buildNotice() {
    // No notice this session: nothing to wait for - the glyphs start as
    // usual. With it, they stay visible and still until it has left.
    if (noticeSeen()) return;
    glyphs.hold();
    const backdrop = el('div', 'm-notice', root);
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    const box = el('div', 'm-notice-box', backdrop);
    el('p', 'm-notice-text', box).textContent = NOTICE_TEXT;
    let closing = false;
    const onKey = e => { if (e.key === 'Escape') close(); };
    function close() {
      if (closing) return;
      closing = true;
      backdrop.classList.add('is-leaving');
      window.removeEventListener('keydown', onKey);
      try { sessionStorage.setItem(NOTICE_SEEN_KEY, '1'); } catch (e) { /* private mode: shows again next load */ }
      const distance = window.innerWidth - box.getBoundingClientRect().left;
      rasterMove(box, 0, distance, x => {
        setX(box, x);
        backdrop.style.setProperty('--m-notice-veil', String(Math.max(0, 1 - x / distance)));
      }, {
        grid: true,
        // Only now - the notice fully out and removed - do the glyphs
        // start their random motion (the first start only).
        done: () => {
          backdrop.remove();
          glyphs.release();
        }
      });
    }
    box.appendChild(squareButton('m-notice-close', '−', 'Close', close));
    onBackdropTap(backdrop, target => !!target.closest('.m-notice-box'), close);
    window.addEventListener('keydown', onKey);
  }

  // --- Build / breakpoint ----------------------------------------------------

  function build() {
    root = el('div', 'm-root', document.body);
    buildLanding();
    const column = el('div', 'm-column', root);
    stripEl = el('div', 'm-strip', column);
    stripEl.style.flexGrow = '1';
    buildTabs(column);
    buildContact();
    buildFullscreen();
    buildNotice();
    glyphs.layout();
  }

  function onBreakpoint() {
    if (isMobileLayout() && !root) build();
    if (root) glyphs.sync();
  }

  MOBILE_LAYOUT_MQ.addEventListener('change', onBreakpoint);
  onBreakpoint();
})();
