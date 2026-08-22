// Lawfirm V0.01 - Express 后端
// 职责：托管 public/ 下的 H5 前端，提供 /api/chat 入口。
// AI 接入：hy3 主力推理 → deepseek 回退；图片/文件走混元视觉。
// key 仅从服务端 .env 读取，绝不入库。
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 模型配置（base/model 均有默认值，可用 .env 覆盖）
const cfg = {
  hy3: {
    key: process.env.HY3_KEY,
    base: process.env.HY3_BASE || 'https://tokenhub.tencentmaas.com/v1',
    model: process.env.HY3_MODEL || 'Hy3',
  },
  hunyuan: {
    key: process.env.HUNYUAN_KEY,
    base: process.env.HUNYUAN_BASE || 'https://tokenhub.tencentmaas.com/v1',
    model: process.env.HUNYUAN_MODEL || 'hy-vision-2.0-instruct',
  },
  deepseek: {
    key: process.env.DEEPSEEK_KEY,
    base: process.env.DEEPSEEK_BASE || 'https://api.deepseek.com/v1',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  },
};

const keysReady = {
  hy3: !!cfg.hy3.key,
  hunyuan: !!cfg.hunyuan.key,
  deepseek: !!cfg.deepseek.key,
};
const allKeysReady = keysReady.hy3 && keysReady.hunyuan && keysReady.deepseek;

const upload = multer({ dest: path.join(__dirname, 'uploads') });
app.use(express.static(path.join(__dirname, 'public')));

// 通用 OpenAI 兼容 chat/completions 调用
async function chatCompletion({ base, key, model, messages, timeoutMs = 30000 }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ model, messages, stream: false }),
      signal: ctrl.signal,
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      throw new Error(`HTTP ${resp.status} ${txt.slice(0, 200)}`);
    }
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timer);
  }
}

// 文本问答：hy3 主力，失败回退 deepseek
async function answerText(message) {
  try {
    const text = await chatCompletion({
      base: cfg.hy3.base,
      key: cfg.hy3.key,
      model: cfg.hy3.model,
      messages: [{ role: 'user', content: message }],
    });
    return { text, model: 'hy3' };
  } catch (e) {
    console.warn('[warn] hy3 调用失败，回退 deepseek:', e.message);
    const text = await chatCompletion({
      base: cfg.deepseek.base,
      key: cfg.deepseek.key,
      model: cfg.deepseek.model,
      messages: [{ role: 'user', content: message }],
    });
    return { text, model: 'deepseek(回退)' };
  }
}

// 图片/文件：混元多模态视觉
async function answerVision(message, dataUrl) {
  const content = [];
  if (message) content.push({ type: 'text', text: message });
  if (dataUrl) content.push({ type: 'image_url', image_url: { url: dataUrl } });
  return chatCompletion({
    base: cfg.hunyuan.base,
    key: cfg.hunyuan.key,
    model: cfg.hunyuan.model,
    messages: [{ role: 'user', content }],
  });
}

app.post('/api/chat', upload.single('file'), async (req, res) => {
  const message = (req.body && req.body.message) || '';
  try {
    let reply, model;
    if (req.file && req.file.mimetype && req.file.mimetype.startsWith('image/')) {
      const b64 = fs.readFileSync(req.file.path).toString('base64');
      const dataUrl = `data:${req.file.mimetype};base64,${b64}`;
      reply = await answerVision(message, dataUrl);
      model = 'hunyuan-vision';
    } else if (req.file) {
      const r = await answerText(`${message}\n（用户上传文件：${req.file.originalname}，暂按文本处理）`);
      reply = r.text;
      model = r.model;
    } else {
      const r = await answerText(message);
      reply = r.text;
      model = r.model;
    }
    res.json({ reply, model, keysReady, allKeysReady, ts: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message, keysReady, allKeysReady, ts: new Date().toISOString() });
  }
});

// 健康检查
app.get('/api/health', (req, res) =>
  res.json({ ok: true, keysReady, allKeysReady, ts: new Date().toISOString() })
);

app.listen(PORT, () => {
  console.log(`Lawfirm V0.01 服务已启动: http://localhost:${PORT}`);
  console.log('Key 状态:', keysReady, 'allReady =', allKeysReady);
});
