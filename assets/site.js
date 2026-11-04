(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const stage = $('previewStage');
  const widgets = [...stage.querySelectorAll('[data-draggable]')];
  const fog = $('previewFog');
  const tabs = [...document.querySelectorAll('[data-preview-tab]')];
  const names = { visuals: 'Visuals / World', hud: 'HUD / Layout', interface: 'Interface / Appearance' };
  const selectPreview = tab => {
    tabs.forEach(button => { const active = button === tab; button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1; });
    document.querySelectorAll('[data-preview-panel]').forEach(panel => { panel.hidden = panel.dataset.previewPanel !== tab.dataset.previewTab; });
    $('previewTitle').textContent = names[tab.dataset.previewTab];
  };
  tabs.forEach((tab, i) => {
    tab.onclick = () => selectPreview(tab);
    tab.onkeydown = e => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      selectPreview(tabs[next]); tabs[next].focus();
    };
  });
  selectPreview(tabs[0]);
  const updateFog = () => { $('fogState').textContent=$('fogToggle').getAttribute('aria-pressed')==='true'?'ON':'OFF'; fog.style.opacity = $('fogToggle').getAttribute('aria-pressed') === 'true' ? Number($('fogRange').value) / 100 : '0'; };
  $('fogToggle').onclick = () => { $('fogToggle').setAttribute('aria-pressed', String($('fogToggle').getAttribute('aria-pressed') !== 'true')); updateFog(); };
  $('fogRange').oninput = updateFog; updateFog();
  $('previewAccent').oninput = e => { stage.style.setProperty('--preview-accent', e.target.value); };
  $('hudToggle').onclick = () => {
    const visible = $('hudToggle').getAttribute('aria-pressed') !== 'true';
    $('hudToggle').setAttribute('aria-pressed', String(visible)); widgets.forEach(widget => { widget.hidden = !visible; });
  };
  const constrain = (widget, left, top) => {
    const rect = widget.getBoundingClientRect();
    widget.style.left = Math.max(0, Math.min(left, stage.clientWidth - rect.width)) + 'px';
    widget.style.top = Math.max(0, Math.min(top, stage.clientHeight - rect.height)) + 'px';
    widget.style.right = 'auto'; widget.style.bottom = 'auto';
  };
  widgets.forEach(widget => {
    let drag = null;
    widget.onpointerdown = e => {
      if (e.button !== 0) return;
      e.preventDefault(); widget.focus();
      drag = { x: e.clientX, y: e.clientY, left: widget.offsetLeft, top: widget.offsetTop };
      widget.setPointerCapture(e.pointerId);
    };
    widget.onpointermove = e => { if (drag) constrain(widget, drag.left + e.clientX - drag.x, drag.top + e.clientY - drag.y); };
    widget.onpointerup = widget.onpointercancel = widget.onlostpointercapture = () => { drag = null; };
    widget.onkeydown = e => {
      const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (!moves[e.key]) return;
      e.preventDefault(); const amount = e.shiftKey ? 16 : 4;
      constrain(widget, widget.offsetLeft + moves[e.key][0] * amount, widget.offsetTop + moves[e.key][1] * amount);
    };
  });
  $('hudSize').oninput = e => {
    $('hudSizeLabel').textContent = e.target.value + '%';
    widgets.forEach(widget => { widget.style.transformOrigin = 'top left'; widget.style.transform = `scale(${Number(e.target.value) / 100})`; constrain(widget, widget.offsetLeft, widget.offsetTop); });
  };
  $('resetHud').onclick = () => { widgets.forEach(widget => { for (const prop of ['left', 'top', 'right', 'bottom']) widget.style.removeProperty(prop); }); };
  $('panelOpacity').oninput = e => { widgets.forEach(widget => { widget.style.backgroundColor = `rgba(17,16,21,${Number(e.target.value) / 100})`; }); };
  new ResizeObserver(() => widgets.forEach(widget => { if (!widget.hidden) constrain(widget, widget.offsetLeft, widget.offsetTop); })).observe(stage);

  const groups = [...document.querySelectorAll('#gl .gsec')];
  const labels = ['Новое меню', 'Редактор HUD', 'Небо и туман', 'China Hat', 'Предметы'];
  const galleryButtons = groups.map((group, i) => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = labels[i]; button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', group.id);
    group.setAttribute('role', 'tabpanel'); button.id = 'gallery-tab-' + i; group.setAttribute('aria-labelledby', button.id);
    button.onclick = () => {
      groups.forEach((item, j) => { item.hidden = i !== j; galleryButtons[j].setAttribute('aria-selected', String(i === j)); galleryButtons[j].tabIndex = i === j ? 0 : -1; });
    };
    button.onkeydown = e => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const target = e.key === 'Home' ? 0 : e.key === 'End' ? groups.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + groups.length) % groups.length;
      galleryButtons[target].click(); galleryButtons[target].focus();
    };
    $('galleryTabs').append(button); return button;
  });
  galleryButtons[0]?.click();
  const reveal = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); reveal.unobserve(entry.target); } }), { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(element => reveal.observe(element));
})();