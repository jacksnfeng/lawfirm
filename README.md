# 律所助手 · 企业老板法律助手（Lawfirm）

> 面向**企业老板**的法律智能助手 H5。老板有任何法律问题、拍照/传文件，大模型识别并解答，不预设问题类型。律师可上传法律条文/法规作为**优先参考知识库**。

**当前版本：V0.02（前端 H5 + 真实 AI 接入 + 参考知识库）**

---

## 一、协作团队与角色

| 角色 | 是谁 | 职责 |
|------|------|------|
| ocu | 家庭 Ubuntu 笔记本 `yyh@192.168.1.12` | 主协调 + 文档 + 骨架 |
| **wb1** | 本机 Windows（Jinhuajie） | **主要指令端**；经 `ai_messages` 队列 / GitHub 发指令。V0.01/V0.02 前端与后端由 wb1 搭建并推到 main（ocu 常呆滞，按规则由 wb1 接管） |
| wb0 | 公司 jack | 参与前端 |
| ocx | 公司 xiangru 部署机 | 运行服务（花生壳内网穿透对外） |

> 想了解来龙去脉？看 [`docs/进度记录.md`](docs/进度记录.md)。

---

## 二、架构（V0.02）

```
手机 H5 (public/)
  ├─ 咨询页：POST /api/chat ──▶ Express 后端 (server.js)
  │                            │
  │                            ├─ 优先读取「知识库」(uploads/kb/) 条文作上下文
  │                            ├─ 文字：hy3 主力 → deepseek 回退
  │                            └─ 图片/文件：混元视觉识别
  └─ 知识库页：上传/查看/删除 ─▶ POST /api/kb/upload · GET /api/kb/list · DELETE /api/kb/:name
```

- 与既有海关/评估系统**共用同一套 3-key**：`hy3`(主力) / `混元视觉`(图片识别) / `deepseek`(备用)。
- **参考知识库**：律师在「知识库」页上传 `.txt/.md/.csv/.json/.log` 等文件，存于 `uploads/kb/`；`/api/chat` 解答时会**优先引用**这些条文，并在回复中标注来源文件名。
- key 放**服务端 `.env`**，绝不入库。

---

## 三、本地运行

```bash
npm install
cp .env.example .env      # 填入 3 个 key（没有也能跑，只是返回占位）
npm start                 # 默认 http://localhost:3000
```

打开浏览器（手机模式）：
- **咨询页**：打字 / 拍照 / 传文件 → 发送。
- **知识库页**：选文件上传（可多文件），列表显示已上传内容，可删除。

---

## 四、部署（给 ocx / xiangru）

在部署机上：

```bash
git clone https://github.com/jacksnfeng/lawfirm.git
cd lawfirm
npm install --production
cp .env.example .env      # 填入真实 3 个 key（重要：否则只跑占位版）
npm start                 # 或 pm2/node 起常驻
```

- 对外访问经**花生壳**内网穿透映射到 `npm start` 的端口（默认 3000）。
- `.env` **不进仓库**，需单独放到服务器 `lawfirm/.env`。

---

## 五、版本规范

- 从 **V0.01** 起步，每次 +0.01。
- commit 带版本号，例如：`feat: V0.02 知识库 + 大模型优先引用`。

---

## 六、目录

```
lawfirm/
├── server.js            # Express 后端（/api/chat 真实 AI + /api/kb 知识库）
├── public/              # H5 前端（咨询页 + 知识库页）
│   ├── index.html
│   ├── app.js
│   └── style.css
├── uploads/kb/          # 知识库上传文件（gitignore，运行时生成）
├── docs/进度记录.md      # 进度与交接（给 wb0/ocx 看）
├── .env.example         # key 模板（真实 .env 勿提交）
└── package.json
```
