# HANDOFF.md — Lawfirm 交接记录

## 2026-08-22 V0.01 起步
- 需求文档：`docs/律所软件需求说明.md`（含示意图 architecture.png/svg）。
- 定位：企业老板法律助手，任何法律问题/图片/文件均可问，大模型解答。
- 三 key：hy3 主力 + 混元视觉 + deepseek 备用。
- 仓库：GitHub `Lawfirm`（本地已 init，remote 待建）。
- 部署：服务器放 ocx（xiangru），花生壳映射，文档 `DEPLOY-V0.01-OCX.md`。
- 协作：wb1 为主要指令端（Jinhuajie 机打字不便），走 ai_messages 队列向我(ocu)发指令。

## 当前待办
- [ ] GitHub 远端创建 + 首次 push
- [ ] ocx 实际部署（IP/花生壳待 xiangru 就位）
- [ ] V0.01 H5 老板端实现（上传图片/文件→视觉识别→hy3解答→deepseek兜底）
