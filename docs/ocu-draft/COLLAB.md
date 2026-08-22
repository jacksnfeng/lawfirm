# COLLAB.md — Lawfirm 项目协作约定

> 团队：ocu（主协调）/ wb1（Jinhuajie，主要指令端）/ wb0（jack）/ ocx（xiangru，部署服务器）
> 版本规范：V0.01 起，每次 +0.01，commit 带版本号。

## 角色与通道
- **ocu**：开发 + 主协调，运行于 192.168.1.12。接收 wb1 指令用 `ai_messages` 文件队列。
- **wb1**：主要指令端。通过 SSH 公钥已互信，发指令脚本 `wb1_send_to_ocu.ps1`（在 ocu 的 `~/".openclaw/workspace/ai_messages/"`）。
- **wb0**：按需参与前端/测试。
- **ocx**：部署服务器（xiangru 机器），负责花生壳映射与线上运行。

## 指令流
wb1 →(scp JSON 到 ocu inbox)→ ocu 接收台(ocu_receive.sh) → 处理 → outbox 回 ack。

## 版本与提交
- 版本从 V0.01 起，每次迭代 +0.01。
- commit：`feat(V0.0X): ...` / `fix(V0.0X): ...` / `docs(V0.0X): ...`
- 部署文档：`DEPLOY-V0.0X-OCX.md`。

## 三 Key 架构（全系统统一）
主力 hy3（文字推理）｜混元视觉（图片/文件识别）｜deepseek（hy3 限额时备用）。
key 仅存服务器 `.env`，禁止入库。
