// Lawfirm V0.01 - Express 后端骨架
// 职责：托管 public/ 下的 H5 前端，提供 /api/chat 入口（当前为占位 stub）。
// AI 真实接入（hy3 / 混元视觉 / deepseek）待 3 个 key 写入服务端 .env 后启用。
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 仅服务端读取 key，绝不入库
const keysReady = {
  hy3: !!process.env.HY3_KEY,
  hunyuan: !!process.env.HUNYUAN_KEY,
  deepseek: !!process.env.DEEPSEEK_KEY,
};
const allKeysReady = keysReady.hy3 && keysReady.hunyuan && keysReady.deepseek;

const upload = multer({ dest: path.join(__dirname, 'uploads') });

app.use(express.static(path.join(__dirname, 'public')));

// 聊天入口（V0.01 占位实现）
app.post('/api/chat', upload.single('file'), (req, res) => {
  const message = (req.body && req.body.message) || '';
  const hasFile = !!req.file;
  const reply = allKeysReady
    ? `[AI] 收到：${message}${hasFile ? '（含附件）' : ''}`
    : `（演示占位）收到：${message}${hasFile ? '（含附件）' : ''}\n` +
      `AI 接入待 3 个 key（hy3 / 混元视觉 / deepseek）写入服务端 .env 后启用。`;
  res.json({ reply, keysReady, ts: new Date().toISOString() });
});

// 健康检查
app.get('/api/health', (req, res) => res.json({ ok: true, keysReady, ts: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`Lawfirm V0.01 服务已启动: http://localhost:${PORT}`);
  console.log('Key 状态:', keysReady, 'allReady =', allKeysReady);
});
