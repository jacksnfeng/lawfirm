// Lawfirm V0.01 前端逻辑（移动端 H5）
const $ = (id) => document.getElementById(id);
const messages = $('messages');

function appendBubble(text, who) {
  const div = document.createElement('div');
  div.className = 'bubble ' + who;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

async function send() {
  const text = $('msg').value.trim();
  const file = $('filePhoto').files[0] || $('fileDoc').files[0];
  if (!text && !file) return;

  appendBubble((text || '（附件）'), 'me');
  $('msg').value = '';
  $('filePhoto').value = '';
  $('fileDoc').value = '';

  const fd = new FormData();
  fd.append('message', text);
  if (file) fd.append('file', file);

  try {
    const r = await fetch('/api/chat', { method: 'POST', body: fd });
    const data = await r.json();
    appendBubble(data.reply, 'ai');
  } catch (e) {
    appendBubble('网络错误：' + e.message, 'sys');
  }
}

$('btnSend').addEventListener('click', send);
$('msg').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
});
$('btnPhoto').addEventListener('click', () => $('filePhoto').click());
$('btnFile').addEventListener('click', () => $('fileDoc').click());
