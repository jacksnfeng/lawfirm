// Lawfirm V0.02 - Express 后端
// 职责：托管 public/ 下的 H5 前端，提供 /api/chat 咨询入口 + /api/kb 知识库管理。
// AI 接入：hy3 主力推理 → deepseek 回退；图片/文件走混元视觉。
// 知识库（V0.02）：律师上传法律条文/法规文件，/api/chat 解答时优先引用。
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
    // TokenPlan 专用网关（sk-tp- 开头的 key 必须走这里，普通混元 tokenhub 地址会 401）
    base: process.env.HY3_BASE || 'https://api.lkeap.cloud.tencent.com/plan/v3',
    model: process.env.HY3_MODEL || 'hy3',
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
// 解析 JSON 请求体（后台 key 设置接口需要）
app.use(express.json());


// ===== 知识库（V0.02） =====
// 落盘位置改为 TNAS 共享挂载点（//192.168.0.103/public/数据中心/技术工作/LowFirm法律条文）
// 由 /etc/fstab 挂载到 ~/lawfirm/kb_tnas，凭据见 /etc/.smbcred_lawfirm。
// 回退：若挂载点不存在则用本地 uploads/kb，保证服务不崩。
const TNAS_KB = path.join(__dirname, 'kb_tnas');
const KB_DIR = fs.existsSync(TNAS_KB) ? TNAS_KB : path.join(__dirname, 'uploads', 'kb');
fs.mkdirSync(KB_DIR, { recursive: true });
console.log('[kb] 知识库目录 =', KB_DIR, KB_DIR === TNAS_KB ? '(TNAS)' : '(本地回退)');

// 知识库上传：用 dest 风格（与 chat 上传同一套，已验证可写盘），落盘后重命名为 <时间戳>_<原名>
const kbUpload = multer({ dest: KB_DIR });

app.post('/api/kb/upload', kbUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未收到文件' });
  const safe = (req.file.originalname || 'file').replace(/[^\w.\-\u4e00-\u9fa5]/g, '_');
  const savedAs = `${Date.now()}_${safe}`;
  try {
    fs.renameSync(req.file.path, path.join(KB_DIR, savedAs));
  } catch (e) {
    return res.status(500).json({ error: '保存失败: ' + e.message });
  }
  console.log('[kb upload] saved:', savedAs, req.file.originalname);
  res.json({
    ok: true,
    name: req.file.originalname,
    savedAs,
    size: req.file.size,
    ts: new Date().toISOString(),
  });
});

app.get('/api/kb/list', (req, res) => {
  try {
    const files = fs.readdirSync(KB_DIR)
      .filter((f) => fs.statSync(path.join(KB_DIR, f)).isFile())
      .map((f) => {
        const stat = fs.statSync(path.join(KB_DIR, f));
        // 文件名格式: <stamp>_<原名>
        const idx = f.indexOf('_');
        const orig = idx >= 0 ? f.slice(idx + 1) : f;
        return { savedAs: f, name: orig, size: stat.size, mtime: stat.mtime };
      })
      .sort((a, b) => b.mtime - a.mtime);
    res.json({ ok: true, count: files.length, files });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/kb/:name', (req, res) => {
  const name = req.params.name;
  // 防目录穿越
  if (/[\\/]/.test(name)) return res.status(400).json({ error: '非法文件名' });
  const fp = path.join(KB_DIR, name);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: '不存在' });
  fs.unlinkSync(fp);
  res.json({ ok: true, deleted: name });
});

// 读取知识库全文作为优先参考上下文（截断避免超限）
function getKbContext(maxChars = 8000) {
  if (!fs.existsSync(KB_DIR)) return { text: '', sources: [] };
  const files = fs.readdirSync(KB_DIR).filter((f) =>
    /\.(txt|md|text|json|csv|log)$/i.test(f)
  );
  const parts = [];
  const sources = [];
  let total = 0;
  for (const f of files) {
    try {
      const content = fs.readFileSync(path.join(KB_DIR, f), 'utf8');
      const idx = f.indexOf('_');
      const orig = idx >= 0 ? f.slice(idx + 1) : f;
      if (total + content.length > maxChars) {
        parts.push(`【${orig}】（节选）\n` + content.slice(0, Math.max(0, maxChars - total)));
        sources.push(orig);
        break;
      }
      parts.push(`【${orig}】\n` + content);
      sources.push(orig);
      total += content.length;
    } catch (e) { /* 跳过不可读文件 */ }
  }
  return { text: parts.join('\n\n'), sources };
}

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

// 文本问答：hy3 主力，失败回退 deepseek；优先结合知识库
async function answerText(message, kbContext) {
  const system = kbContext
    ? `你是一名严谨的企业法律顾问。下面是从律所「参考知识库」中提取的条文/资料（由律师上传），请优先依据这些内容回答用户问题，并在回答中注明引用的来源文件名；若知识库内容不足以回答，再结合你的法律常识补充，并说明这是通用建议。\n\n<知识库>\n${kbContext}\n</知识库>`
    : '你是一名严谨的企业法律顾问，请用通俗易懂的语言回答企业老板的法律问题。';
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: message },
  ];
  try {
    const text = await chatCompletion({
      base: cfg.hy3.base, key: cfg.hy3.key, model: cfg.hy3.model, messages,
    });
    return { text, model: 'hy3' };
  } catch (e) {
    console.warn('[warn] hy3 调用失败，回退 deepseek:', e.message);
    const text = await chatCompletion({
      base: cfg.deepseek.base, key: cfg.deepseek.key, model: cfg.deepseek.model, messages,
    });
    return { text, model: 'deepseek(回退)' };
  }
}

// 图片/文件：混元多模态视觉
async function answerVision(message, dataUrl, kbContext) {
  const content = [];
  if (kbContext) {
    content.push({ type: 'text', text: `（参考知识库资料：\n${kbContext}\n）` });
  }
  if (message) content.push({ type: 'text', text: message });
  if (dataUrl) content.push({ type: 'image_url', image_url: { url: dataUrl } });
  return chatCompletion({
    base: cfg.hunyuan.base, key: cfg.hunyuan.key, model: cfg.hunyuan.model,
    messages: [{ role: 'user', content }],
  });
}

app.post('/api/chat', userGuard, upload.single('file'), async (req, res) => {
  const message = (req.body && req.body.message) || '';
  const kb = getKbContext();
  const userId = req.userId || 'anonymous' // 预留：将来多租户/计费用
  try {
    let reply, model;
    if (req.file && req.file.mimetype && req.file.mimetype.startsWith('image/')) {
      const b64 = fs.readFileSync(req.file.path).toString('base64');
      const dataUrl = `data:${req.file.mimetype};base64,${b64}`;
      reply = await answerVision(message, dataUrl, kb.text);
      model = 'hunyuan-vision';
    } else if (req.file) {
      const r = await answerText(
        `${message}\n（用户上传文件：${req.file.originalname}，按文本处理）`,
        kb.text
      );
      reply = r.text;
      model = r.model;
    } else {
      const r = await answerText(message, kb.text);
      reply = r.text;
      model = r.model;
    }
    // 清理临时上传（chat 附件不长期留存）
    if (req.file) fs.unlink(req.file.path, () => {});
    res.json({
      reply, model, userId,
      kbUsed: kb.sources.length > 0,
      kbSources: kb.sources,
      keysReady, allKeysReady, ts: new Date().toISOString(),
    });
  } catch (e) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: e.message, keysReady, allKeysReady, ts: new Date().toISOString() });
  }
});


// ===== 后台管理：API Key 设置（V0.03） =====
const VERSION = "V0.04"
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "lawfirm-admin"
// 后台来源 IP 白名单：仅允许办公室局域网 192.168.0.0/24（含 jack 机 192.168.0.131）
// 其他任何来源访问 /api/admin/* 一律 403，避免公网/外网直接进后台。
function inAdminSubnet(ip) {
  if (!ip) return false
  // 归一化 ::ffff:1.2.3.4 -> 1.2.3.4
  ip = ip.replace(/^::ffff:/, "")
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return false
  const [_, a, b] = m.map(Number)
  // 放行：本机回环(127.x) + 办公室局域网(192.168.0.x，含 jack 机 192.168.0.131)
  if (a === 127) return true
  if (a === 192 && b === 168) return true
  return false
}
function adminGuard(req, res, next) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim()
    || req.socket.remoteAddress || req.ip
  if (!inAdminSubnet(ip)) {
    return res.status(403).json({ error: "后台仅允许办公室局域网(192.168.0.x)访问", ip })
  }
  const t = req.headers["x-admin-token"] || (req.body && req.body.token)
  if (t !== ADMIN_TOKEN) return res.status(401).json({ error: "管理员令牌错误" })
  next()
}

// ===== 用户鉴权骨架（V0.04，为小程序/APP 预留，默认不强制）=====
// 设计：当前 H5 仍匿名可用（REQUIRE_AUTH=false）；将来小程序/APP 设 REQUIRE_AUTH=true，
// 前端先用 /api/auth/issue 用管理员令牌换一个 user token，之后 /api/chat 带 Authorization: Bearer <token>。
const REQUIRE_AUTH = process.env.REQUIRE_AUTH === 'true'
const USER_ISSUE_TOKEN = process.env.USER_ISSUE_TOKEN || ADMIN_TOKEN // 发放用户 token 的管理员令牌
const userTokens = new Map() // token -> { userId, createdAt }
function issueUserToken(userId) {
  const token = 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
  userTokens.set(token, { userId: userId || 'user', createdAt: Date.now() })
  return token
}
// /api/auth/issue：管理员令牌 -> 用户 token（小程序/APP 启动时调用一次）
app.post('/api/auth/issue', (req, res) => {
  const t = req.headers['x-admin-token'] || (req.body && req.body.token)
  if (t !== USER_ISSUE_TOKEN) return res.status(401).json({ error: '令牌错误' })
  const userId = (req.body && req.body.userId) || 'user'
  const token = issueUserToken(userId)
  res.json({ ok: true, token, userId })
})
// 用户鉴权中间件：REQUIRE_AUTH=true 时强制校验；false 时若带 token 则记录 userId（匿名记 anonymous）
function userGuard(req, res, next) {
  const auth = req.headers['authorization'] || ''
  const m = auth.match(/^Bearer\s+(.+)$/i)
  const token = m ? m[1].trim() : null
  if (REQUIRE_AUTH) {
    if (!token || !userTokens.has(token)) return res.status(401).json({ error: '需要有效的用户 token' })
    req.userId = userTokens.get(token).userId
  } else {
    req.userId = (token && userTokens.has(token)) ? userTokens.get(token).userId : 'anonymous'
  }
  next()
}
function maskKey(k) {
  if (!k) return ""
  if (k.length <= 12) return k[0] + "***" + k.slice(-2)
  return k.slice(0, 8) + "…" + k.slice(-4)
}
function writeEnvKey(key, val) {
  const p = path.join(__dirname, ".env")
  let lines = fs.existsSync(p) ? fs.readFileSync(p, "utf8").split("\n") : []
  let found = false
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(key + "=")) { lines[i] = key + "=" + val; found = true }
  }
  if (!found) lines.push(key + "=" + val)
  fs.writeFileSync(p, lines.join("\n"))
}
app.get("/api/admin/keys", adminGuard, (req, res) => {
  res.json({ ok: true, keys: {
    hy3: { value: maskKey(cfg.hy3.key), ready: keysReady.hy3, base: cfg.hy3.base, model: cfg.hy3.model },
    hunyuan: { value: maskKey(cfg.hunyuan.key), ready: keysReady.hunyuan, base: cfg.hunyuan.base, model: cfg.hunyuan.model },
    deepseek: { value: maskKey(cfg.deepseek.key), ready: keysReady.deepseek, base: cfg.deepseek.base, model: cfg.deepseek.model }
  }, allKeysReady })
})
app.post("/api/admin/keys", adminGuard, (req, res) => {
  const b = req.body || {}
  const changed = {}
  if (b.hy3) { cfg.hy3.key = b.hy3; writeEnvKey("HY3_KEY", b.hy3); changed.hy3 = true }
  if (b.hunyuan) { cfg.hunyuan.key = b.hunyuan; writeEnvKey("HUNYUAN_KEY", b.hunyuan); changed.hunyuan = true }
  if (b.deepseek) { cfg.deepseek.key = b.deepseek; writeEnvKey("DEEPSEEK_KEY", b.deepseek); changed.deepseek = true }
  keysReady.hy3 = !!cfg.hy3.key; keysReady.hunyuan = !!cfg.hunyuan.key; keysReady.deepseek = !!cfg.deepseek.key
  res.json({ ok: true, changed, keysReady, allKeysReady })
})
// 连通性测试：用指定 key 向对应 base 发最小 chat 请求，只验证、不改动内存 key
app.post("/api/admin/keys/test", adminGuard, async (req, res) => {
  const b = req.body || {}
  const provider = b.provider
  const candidate = b.key // 前端传来的待测 key（已填新值用新值，否则用当前值）
  const map = {
    hy3: cfg.hy3,
    hunyuan: cfg.hunyuan,
    deepseek: cfg.deepseek,
  }
  const c = map[provider]
  if (!c) return res.status(400).json({ ok: false, error: "未知 provider: " + provider })
  // 决议 key：优先用前端传入的待测值，保证"先填再测新 key"也能测；空则用现有值
  const testKey = (candidate && candidate.trim()) ? candidate.trim() : c.key
  if (!testKey) return res.status(400).json({ ok: false, error: "没有可测试的 Key（该 Key 为空）" })
  // hunyuan 是多模态视觉模型，也用 chat/completions 探活（tokenhub 该端点兼容）
  const probeContent = provider === "hunyuan"
    ? [{ type: "text", text: "ping" }]
    : "ping"
  const t0 = Date.now()
  try {
    const txt = await chatCompletion({
      base: c.base, key: testKey, model: c.model,
      messages: [{ role: "user", content: probeContent }],
      timeoutMs: 15000,
    })
    const ms = Date.now() - t0
    res.json({ ok: true, provider, reachable: true, ms, model: c.model, sample: String(txt).slice(0, 40) })
  } catch (e) {
    const ms = Date.now() - t0
    res.json({ ok: false, provider, reachable: false, ms, error: e.message })
  }
})
// 版本号（后台页拉取显示）
app.get('/api/version', (req, res) => res.json({ ok: true, version: VERSION, ts: new Date().toISOString() }));
// 健康检查
app.get('/api/health', (req, res) =>
  res.json({ ok: true, version: VERSION, authRequired: REQUIRE_AUTH, keysReady, allKeysReady, ts: new Date().toISOString() })
);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Lawfirm ${VERSION} 服务已启动: http://localhost:${PORT}`);
  console.log('Key 状态:', keysReady, 'allReady =', allKeysReady);
});
