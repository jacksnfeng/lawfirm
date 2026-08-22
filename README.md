# Lawfirm — 企业老板法律助手（H5）

面向企业老板的法律智能助手：任何法律问题、拍下的图片或微信收到的文件，都能由大模型识别并解答。

- 版本：V0.01（起步，每次 +0.01）
- 模型架构：hy3（主力文字推理）｜混元视觉（图片/文件识别）｜deepseek（hy3 限额时备用）
- 部署：服务器 ocx（xiangru），花生壳映射访问
- 文档：`docs/律所软件需求说明.md`、`COLLAB.md`、`HANDOFF.md`、`DEPLOY-V0.01-OCX.md`

## 快速开始（开发）
```bash
npm install
cp .env.example .env   # 填入三套 key
npm start              # 默认 http://localhost:3000
```

## 结构
- `server/` 后端 API（Express）
- `public/` H5 老板端前端
- `docs/` 需求与协作文档
- `deploy/` 部署脚本
