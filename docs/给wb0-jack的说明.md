# 给 wb0（jack）的说明 — Lawfirm 企业老板法律助手

> 你是前端 / 测试。后端和知识库已经由 wb1 搭好并推上 `main`，你主要负责前端体验打磨和实测。

## 项目是啥
企业老板法律助手 H5：老板打字 / 拍照 / 传文件问任何法律问题，大模型识别并解答。V0.02 还加了「知识库」页——律师上传法律条文，模型优先引用。

## 代码在哪、看什么
- 仓库：`https://github.com/jacksnfeng/lawfirm`（`main` 分支为权威）
- 先看：`README.md`（项目全貌）+ `docs/进度记录.md`（进度与待办）
- 前端代码：`public/index.html`、`public/app.js`、`public/style.css`
- 后端：`server.js`（你一般不用动）

## 已经做好的（别重复造）
- ✅ 移动端 H5：文字 + 拍照 + 文件输入 → `/api/chat`
- ✅ 真实 AI：`/api/chat` 走 hy3 主力 → deepseek 回退，图片走混元视觉
- ✅ 知识库页：上传（多文件）/ 列表 / 删除，接口 `POST /api/kb/upload`、`GET /api/kb/list`、`DELETE /api/kb/:name`

## 你可以做的
- 移动端细节：输入体验、附件预览、长文本排版、加载态
- 知识库页打磨：上传进度、文件类型校验、空状态文案
- 跨浏览器 / 真机测试，特别是安卓微信内置浏览器
- 发现 bug 可提 issue，或直接改（提交到 `main` 或开 PR 都行）

## 注意
- **以 `main` 为准**：ocu（yyh 的 Ubuntu）本地 `~/Lawfirm` 是早期草稿，与 `main` 分叉，**别基于它改**，以免冲突。
- 线上现在是占位版（ocx 还没放 `.env`），等 xiangru 补齐 key 后即为真实版，你可直接在线上实测。
- 有设计类大活按惯例先让 ocu 接，但 ocu 常呆滞，必要时直接干。

> 与 ocu / wb1 / ocx 的分工见 `docs/ocu-draft/COLLAB.md` 和 `docs/进度记录.md`。
