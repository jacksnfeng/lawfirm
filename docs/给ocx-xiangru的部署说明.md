# 给 ocx（xiangru）的部署说明 — Lawfirm 企业老板法律助手

> 你是部署负责人。目标：把 Lawfirm 在服务器跑起来，用花生壳穿透，老板手机浏览器就能用。

## 现在的状态（重要）
- 线上 `http://28i6844q92.zicp.vip/` 目前是**占位版**——Express 在跑，但 `/api/health` 里 `keysReady` 三项全 `false`。
- 原因：服务器上 `lawfirm/.env` 没有（或变量名不对），缺 3 个 API key。补齐即变真实版。

## 你需要做的（5 步）
1. **拉代码**
   ```bash
   git clone https://github.com/jacksnfeng/lawfirm.git ~/lawfirm
   cd ~/lawfirm
   npm install
   ```
2. **放 `.env`（关键）**
   ```bash
   cp .env.example .env
   ```
   用编辑器打开 `.env`，填入（**变量名必须如下，错一个就仍是占位版**）：
   ```
   HY3_KEY=你的hy3_key
   HUNYUAN_KEY=你的混元视觉_key
   DEEPSEEK_KEY=你的deepseek_key
   PORT=3000
   ```
   > ⚠️ 变量名是 `HY3_KEY` 这种（**不带 `_API`**）。key 来源问 Jinhuajie（他桌面 `D:\Desktop\key.txt` 里有），或沿用团队既有的 3-key。
3. **启动**
   ```bash
   npm start
   # 或生产常驻：pm2 start server.js --name lawfirm && pm2 save
   ```
4. **花生壳穿透**
   花生壳客户端新增映射：类型 `HTTP`，内网 `127.0.0.1:3000`，分配外网域名（即现在的 zicp.vip 或新域名）。
5. **验证**
   ```bash
   curl http://127.0.0.1:3000/api/health
   ```
   返回里 `keysReady` 三项都应是 `true`。手机打开映射域名 → 发文字/图片收到真实解答，即上线成功。

## 常见坑
- **还是占位版**：99% 是 `.env` 没放对或变量名错了（写成 `HY3_API_KEY` 就不认）。确认 `.env` 在**仓库根目录**、变量名如上。
- **改完要重启**：`pm2 restart lawfirm`（或 `npm start` 重跑）。
- **拉错分支**：默认 `main`，别动其他分支。

## 回滚
```bash
git checkout <某次commit> && pm2 restart lawfirm
```

> 详细背景见仓库 `README.md` 第四节 与 `docs/进度记录.md`。
