# 微信小程序一键登录 + 后端自动建号示例

这个示例演示完整链路：

1. 小程序端调用 `wx.login` 获取临时 `code`。
2. 小程序端（可选）调用 `wx.getUserProfile` 获取头像昵称。
3. 后端调用微信 `jscode2session` 换取 `openid` + `session_key`。
4. 后端将 `openid` 写入数据库：不存在则创建用户，存在则更新最近登录时间。
5. 后端返回业务 token 与用户信息给小程序。

---

## 目录结构

```text
backend/
  src/
    server.js
    db.js
  .env.example
  package.json
miniprogram/
  pages/login/
    login.js
    login.wxml
    login.wxss
    login.json
```

---

## 后端启动

```bash
cd backend
npm install
cp .env.example .env
# 编辑 .env，填入你自己的微信小程序 appid / secret
npm run start
```

默认使用 `sqlite`，数据库文件会生成在 `backend/wechat-login.sqlite`。

---

## 小程序端接入

把 `miniprogram/pages/login/*` 放到你的项目页面目录，并在 `app.json` 中注册页面路径。

如果你是真机调试，需要把 `http://127.0.0.1:3000` 替换成你的可访问后端地址（例如内网穿透地址），并配置合法 request 域名。

---

## 关键接口

### `POST /api/auth/wechat-login`

请求体：

```json
{
  "code": "wx.login返回的code",
  "profile": {
    "nickName": "昵称",
    "avatarUrl": "头像URL"
  }
}
```

响应：

```json
{
  "isNewUser": true,
  "token": "业务token",
  "user": {
    "id": 1,
    "openid": "o_xxx",
    "nickname": "张三",
    "avatarUrl": "https://..."
  }
}
```

---

## 生产建议

- 把 `token` 换成 JWT，并加入过期时间、刷新机制。
- 对 `session_key` 仅保存哈希值（本示例已处理）。
- 增加设备风控与登录频控。
- 建议改用 MySQL/PostgreSQL 并配置连接池。
