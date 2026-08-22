# DEPLOY-V0.01-OCX.md — Lawfirm 部署说明（给 ocx / xiangru）

> **重要**：本文件原由 ocu 起草，已按 GitHub `jacksnfeng/lawfirm` 的 **main** 实现统一修正：
> - `.env` 变量名为 `HY3_KEY` / `HUNYUAN_KEY` / `DEEPSEEK_KEY`（**非** `HY3_API_KEY` 等旧名）
> - 启动入口为仓库根目录 `server.js`（`npm start` 或 `pm2 start server.js`），**非** `server/index.js`
> - 请以本仓库 `README.md` 第四节 + `.env.example` 为最终准。

## 0. 服务器环境
- 机器：ocx（xiangru）。
- 需安装：Node.js（LTS，建议 v22+）、git、pm2（或 systemd）做常驻。
- 开放端口：后端 API 默认 `3000`（可改），H5 静态由后端托管。

## 1. 拉代码
```bash
git clone https://github.com/jacksnfeng/lawfirm.git ~/lawfirm
cd ~/lawfirm
npm install
```

## 2. 配置三套 API Key（关键，不入库）
复制 `.env.example` 为 `.env`，填入（**变量名务必与本仓库一致**）：
```env
# 主力文字推理
HY3_KEY=...
HY3_BASE=https://tokenhub.tencentmaas.com/v1
HY3_MODEL=Hy3
# 视觉识别（混元视觉）
HUNYUAN_KEY=...
HUNYUAN_BASE=https://tokenhub.tencentmaas.com/v1
HUNYUAN_MODEL=hy-vision-2.0-instruct
# 备用推理
DEEPSEEK_KEY=...
DEEPSEEK_BASE=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
PORT=3000
```
> key 由团队提供（来源示例 `D:\Desktop\key.txt`），填入 `.env` 后 `/api/chat` 才会切真实 AI。hy3 限额时自动切 deepseek。

## 3. 启动
```bash
# 开发
npm start
# 生产常驻（推荐 pm2）
pm2 start server.js --name lawfirm
pm2 save
```

## 4. 花生壳内网穿透
1. ocx 安装并登录花生壳客户端。
2. 新增映射：类型 `HTTP`，内网主机 `127.0.0.1`，内网端口 `3000`，分配外网域名。
3. 老板访问分配到的域名。

## 5. 验证上线
- 浏览器打开映射域名 → 看到 H5。
- 发文字/图片 → 返回大模型解答。
- `curl <域名>/api/health` 应返回 `keysReady` 三项 `true`。

## 6. 常见坑
- **key 没生效**：确认 `.env` 在**仓库根目录**（与 `server.js` 同级），变量名是 `HY3_KEY`/`HUNYUAN_KEY`/`DEEPSEEK_KEY`。
- **仍是旧版**：`git pull` 后重启（`pm2 restart lawfirm`）。
- **拉错分支**：默认 `main`；功能分支需显式 checkout。

## 7. 回滚
```bash
git checkout <commit> && pm2 restart lawfirm
```
