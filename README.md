# 惜食惠（MVP 开工版）

## 目录
- `index.html` / `styles.css` / `app.js`：静态演示页面
- `apps/api`：MVP 后端骨架（Auth + Product + Order + Prisma Schema）
- `apps/web`：前端工程预留目录
- `packages/shared`：共享包预留目录

## 启动静态主页
```bash
./run.sh
```
打开 `http://127.0.0.1:8000/index.html`

## 启动 API（第一阶段）
```bash
node apps/api/src/server.js
```
默认地址 `http://127.0.0.1:3000`

## 快速检查
```bash
node --check apps/api/src/server.js
curl http://127.0.0.1:3000/health
```
