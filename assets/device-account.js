export async function initializeDeviceAccount(db) {
const $ = id => document.getElementById(id);
const say = text => { $('deviceMessage').textContent = text; };
const labels = { no_access: 'Доступ к моду пока не выдан. Обратитесь к владельцу RIMVISUALS.', expired: 'Код истёк или уже использован. Получите новый код в моде.', rate_limited: 'Слишком много попыток. Подождите минуту.', already_approved: 'Этот код уже подтверждён. Вернитесь в мод.' };
let currentUser, code = '';
const pending = new URL(location.href).searchParams.get('device');
try { if (pending && /^[a-f0-9]{8}$/i.test(pending)) sessionStorage.setItem('rim-device-code', pending.toUpperCase()); } catch {}
try { $('deviceCode').value = sessionStorage.getItem('rim-device-code') || ''; } catch {}

async function rpc(name, args) {
  const { data, error } = await db.rpc(name, args);
  if (error) throw new Error(error.message);
  return data;
}
async function refresh() {
  const { data: { user }, error } = await db.auth.getUser();
  currentUser = user;
  $('deviceSignedOut').classList.toggle('hidden', !!user);
  $('deviceControls').classList.toggle('hidden', !user);
  $('modSessions').replaceChildren();
  if (!user || error) return;
  const result = await db.from('mod_sessions').select('id,device_name,created_at,last_seen,expires_at').eq('user_id', user.id).gt('expires_at', new Date().toISOString());
  if (result.error) throw new Error('Не удалось загрузить сеансы мода. Попробуйте обновить страницу.');
  if (!result.data.length) { $('modSessions').textContent = 'Нет подключённых устройств.'; return; }
  for (const session of result.data) {
    const row = document.createElement('div'); row.className = 'session-row';
    const text = document.createElement('span');
    text.textContent = `${session.device_name} · Последняя проверка: ${new Date(session.last_seen).toLocaleString()}`;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'btn secondary'; button.textContent = 'Отключить';
    button.onclick = async () => {
      button.disabled = true;
      try { await rpc('mod_session_revoke', { p_id: session.id }); say('Сеанс отключён. Мод заблокирует функции не позднее чем через 75 секунд.'); await refresh(); }
      catch (e) { say(e.message); button.disabled = false; }
    };
    row.append(text, button); $('modSessions').append(row);
  }
}
$('deviceCode').addEventListener('input', () => {
  code = ''; $('approveDevice').classList.add('hidden');
  try { sessionStorage.setItem('rim-device-code', $('deviceCode').value.trim().toUpperCase()); } catch {}
});
$('lookupDevice').onclick = async () => {
  const button = $('lookupDevice'); button.disabled = true;
  $('approveDevice').classList.add('hidden'); code = '';
  try {
    if (!currentUser) throw new Error('Сначала войдите в аккаунт.');
    const value = $('deviceCode').value.replace(/[-\s]/g, '').toUpperCase();
    if (!/^[A-F0-9]{8}$/.test(value)) throw new Error('Введите 8 символов кода из окна мода.');
    const result = await rpc('mod_device_info', { p_code: value });
    if (result.status !== 'pending') throw new Error(labels[result.status] || 'Не удалось проверить код.');
    if (!result.has_access) throw new Error(labels.no_access);
    code = value;
    say(`Устройство: ${result.device_name}. Сравните код ${code.slice(0,4)}-${code.slice(4)} с кодом в вашем моде. ` + (result.replaces_session ? 'Подтверждение отключит предыдущий сеанс.' : 'Подтверждайте только свой запуск мода.'));
    $('approveDevice').classList.remove('hidden');
  } catch (e) { say(e.message); } finally { button.disabled = false; }
};
$('approveDevice').onclick = async () => {
  const button = $('approveDevice'); if (button.disabled || !code) return; button.disabled = true;
  try {
    const result = await rpc('mod_device_approve', { p_code: code });
    if (result.status !== 'approved') throw new Error(labels[result.status] || 'Не удалось подтвердить вход.');
    say('Вход подтверждён. Вернитесь в Minecraft — мод подключится автоматически.');
    code = ''; button.classList.add('hidden');
    try { sessionStorage.removeItem('rim-device-code'); } catch {}
  } catch (e) { say(e.message); } finally { button.disabled = false; }
};
$('refreshDevices').onclick = () => refresh().catch(e => say(e.message));
try {
  db.auth.onAuthStateChange(() => { setTimeout(() => refresh().catch(e => say(e.message)), 0); });
  await refresh();
} catch (e) { say(e.message); $('lookupDevice').disabled = true; }

}
