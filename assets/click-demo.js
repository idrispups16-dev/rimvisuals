const dialog = document.querySelector('#clickDemo');
const search = dialog.querySelector('input[type=search]');
const switches = [...dialog.querySelectorAll('[data-control]')];

function refresh() {
  const query = search.value.trim().toLowerCase();
  let enabled = 0;
  let visible = 0;
  for (const input of switches) {
    const control = document.getElementById(input.dataset.control);
    input.checked = control.getAttribute('aria-pressed') === 'true';
    const label = input.closest('label');
    label.hidden = !label.textContent.toLowerCase().includes(query);
    if (input.checked) enabled++;
    if (!label.hidden) visible++;
  }
  dialog.querySelector('[role=status]').textContent = visible
    ? 'Включено в демо: ' + enabled + ' из ' + switches.length
    : 'Совпадений нет';
}

for (const input of switches) {
  input.addEventListener('change', () => {
    document.getElementById(input.dataset.control).click();
    refresh();
  });
}
search.addEventListener('input', refresh);
document.querySelector('#openClickDemo').addEventListener('click', () => {
  search.value = '';
  refresh();
  dialog.showModal();
  search.focus();
});
