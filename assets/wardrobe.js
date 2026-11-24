const gestures = new Map([['', 'Пусто'], ['wave', 'Приветствие'], ['nod', 'Кивок']]);

export function bindWardrobe() {
  const root = document.getElementById('wardrobe');
  const find = selector => root.querySelector(selector);
  const gesture = find('#gesture');
  const hat = find('#hat');
  const status = find('#wardrobeStatus');
  const save = find('#saveWardrobe');
  let slots = [];
  let active = 0;
  let owner;
  let client;
  let busy = false;
  for (const [value, label] of gestures) gesture.add(new Option(label, value));
  function render() {
    for (const [index, button] of [...find('#slots').children].entries()) {
      button.textContent = (index + 1) + ' · ' + gestures.get(slots[index]);
      button.setAttribute('aria-pressed', String(index === active));
    }
    gesture.value = slots[active];
  }
  for (let i = 0; i < 8; i++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.onclick = () => { active = i; render(); };
    find('#slots').append(button);
  }
  function selectView(name) {
    for (const panel of root.querySelectorAll('[data-page]')) panel.hidden = panel.dataset.page !== name;
    for (const tab of root.querySelectorAll('[data-view]')) tab.setAttribute('aria-pressed', String(tab.dataset.view === name));
  }
  root.querySelectorAll('[data-view]').forEach(tab => tab.onclick = () => selectView(tab.dataset.view));
  selectView('cosmetics');
  gesture.onchange = () => { slots[active] = gesture.value; render(); status.textContent = 'Есть несохранённые изменения'; };
  hat.onchange = () => { status.textContent = 'Есть несохранённые изменения'; };
  save.onclick = async () => {
    if (busy || !owner) return;
    const expected = owner;
    busy = true;
    save.disabled = true;
    const selection = { hat: hat.value, slots: [...slots] };
    try {
      const {data, error} = await client.auth.getUser();
      if (error || data.user?.id !== expected || owner !== expected) throw new Error();
      const result = await client.auth.updateUser({data: {rim_wardrobe: selection}});
      if (result.error) throw result.error;
      if (owner === expected) status.textContent = 'Выбор сохранён в профиле';
    } catch {
      if (owner === expected) status.textContent = 'Сохранение не удалось. Проверьте соединение и повторите.';
    } finally { busy = false; save.disabled = false; }
  };
  return {load(sb, user) {
    client = sb;
    if (owner === user?.id) return;
    owner = user?.id;
    const selection = user?.user_metadata?.rim_wardrobe || {};
    hat.value = selection.hat === 'china-hat' ? selection.hat : '';
    slots = Array.from({length: 8}, (_, i) => gestures.has(selection.slots?.[i]) ? selection.slots[i] : '');
    active = 0;
    status.textContent = '';
    render();
  }};
}
