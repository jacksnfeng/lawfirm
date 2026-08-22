// Lawfirm V0.02 前端逻辑（移动端 H5）
const $ = (id) => document.getElementById(id);

// ===== 视图切换 =====
document.querySelectorAll('.tab').forEach((t) => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
    document.querySelectorAll('.view').forEach((x) => x.classList.remove('active'));
    t.classList.add('active');
    $(`view-${t.dataset.view}`).classList.add('active');
    if (t.dataset.view === 'kb') loadKbList();
  });
});

// ===== 咨询（chat） =====
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
  appendBubble(text || '（附件）', 'me');
  $('msg').value = '';
  $('filePhoto').value = '';
  $('fileDoc').value = '';
  const fd = new FormData();
  fd.append('message', text);
  if (file) fd.append('file', file);
  try {
    const r = await fetch('/api/chat', { method: 'POST', body: fd });
    const data = await r.json();
    let reply = data.reply;
    if (data.kbUsed) reply += `\n\n（已优先参考知识库：${data.kbSources.join('、')}）`;
    appendBubble(reply, 'ai');
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

// ===== 知识库（kb） =====
async function loadKbList() {
  try {
    const r = await fetch('/api/kb/list');
    const data = await r.json();
    $('kbCount').textContent = data.count || 0;
    const list = $('kbList');
    list.innerHTML = '';
    (data.files || []).forEach((f) => {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.className = 'kb-name';
      name.textContent = `${f.name}（${(f.size / 1024).toFixed(1)} KB）`;
      const del = document.createElement('button');
      del.className = 'kb-del';
      del.textContent = '删除';
      del.onclick = () => deleteKb(f.savedAs);
      li.appendChild(name);
      li.appendChild(del);
      list.appendChild(li);
    });
  } catch (e) {
    $('kbStatus').textContent = '加载失败：' + e.message;
  }
}

async function deleteKb(savedAs) {
  if (!confirm('确定删除该知识库文件？')) return;
  const r = await fetch('/api/kb/' + encodeURIComponent(savedAs), { method: 'DELETE' });
  const data = await r.json();
  if (data.ok) loadKbList();
  else $('kbStatus').textContent = '删除失败：' + (data.error || '');
}

$('btnKbUpload').addEventListener('click', async () => {
  const input = $('kbFile');
  if (!input.files.length) { $('kbStatus').textContent = '请先选择文件'; return; }
  $('kbStatus').textContent = '上传中…';
  let okCount = 0;
  for (const file of input.files) {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await fetch('/api/kb/upload', { method: 'POST', body: fd });
      const data = await r.json();
      if (data.ok) okCount++;
      else $('kbStatus').textContent = `「${file.name}」失败：${data.error || ''}`;
    } catch (e) {
      $('kbStatus').textContent = `「${file.name}」错误：${e.message}`;
    }
  }
  $('kbStatus').textContent = `已上传 ${okCount} 个文件`;
  input.value = '';
  loadKbList();
});
