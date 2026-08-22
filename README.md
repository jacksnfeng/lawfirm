# 律所助手 · 企业老板法律助手（Lawfirm）

> 面向**企业老板**的法律智能助手 H5。老板有任何法律问题、拍照/传文件，大模型识别并解答，不预设问题类型。

**当前版本：V0.01（前端骨架 + 后端占位）**

---

## 一、协作团队与角色

| 角色 | 是谁 | 职责 |
|------|------|------|
| ocu | 家庭 Ubuntu 笔记本 `yyh@192.168.1.12` | 主协调 + 文档 + 骨架 |
| **wb1** | 本机 Windows（Jinhuajie） | **主要指令端**，经 `ai_messages` 队列 / GitHub 发指令，本次前端由 wb1 搭建并推到 main |
| wb0 | 公司 jack | 参与前端（待接手） |
| ocx | 公司 xiangru 部署机 | 运行服务（花生壳内网穿透对外） |

> 想了解来龙去脉？看 [`docs/进度记录.md`](docs/进度记录.md)。

---

## 二、架构（V0.01）

```
手机 H5 (public/)  ──POST /api/chat──▶  Express 后端 (server.js)
                                        │
                                        ├─ 有 key：调 hy3（混元视觉识别 + deepseek 备用）
                                        └─ 无 key：返回占位回复（当前状态）
```

- 与既有海关/评估系统**共用同一套 3-key**：`hy3`(主力) / `混元视觉`(图片识别) / `deepseek`(备用)。
- key 放**服务端 `.env`**，绝不入库。

---

## 三、本地运行

```bash
npm install
cp .env.example .env      # 填入 3 个 key（没有也能跑，只是返回占位）
npm start                 # 默认 http://localhost:3000
```

打开浏览器（手机模式）即可：打字 / 拍照 / 传文件 → 发送。

---

## 四、部署（给 ocx / xiangru）

在部署机上：

```bash
git clone https://github.com/jacksnfeng/lawfirm.git
cd lawfirm
npm install --production
cp .env.example .env      # 填入真实 3 个 key
npm start                 # 或 pm2/node 起常驻
```

- 对外访问经**花生壳**内网穿透映射到 `npm start` 的端口（默认 3000）。
- 若用 systemd 常驻，参考海关项目的 `customs-deploy.timer` 思路（PR/自动拉取 → 重启）。

---

## 五、版本规范

- 从 **V0.01** 起步，每次 +0.01。
- commit 带版本号，例如：`feat: V0.02 接入 hy3 解答`。

---

## 六、目录

```
lawfirm/
├── server.js            # Express 后端（/api/chat 占位）
├── public/              # H5 前端
│   ├── index.html
│   ├── app.js
│   └── style.css
├── docs/进度记录.md      # 进度与交接（给 wb0/ocx 看）
├── .env.example         # key 模板（真实 .env 勿提交）
└── package.json
```
