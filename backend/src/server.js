import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { initDb, User } from './db.js';

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`缺少环境变量: ${name}`);
  }
  return value;
}

function hashSessionKey(sessionKey) {
  return crypto.createHash('sha256').update(sessionKey).digest('hex');
}

async function fetchCode2Session(code) {
  const appid = requiredEnv('WECHAT_APPID');
  const secret = requiredEnv('WECHAT_SECRET');

  const { data } = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
    params: {
      appid,
      secret,
      js_code: code,
      grant_type: 'authorization_code'
    },
    timeout: 5000
  });

  if (data.errcode) {
    throw new Error(`微信换取 openid 失败: ${data.errmsg}(${data.errcode})`);
  }

  return {
    openid: data.openid,
    unionid: data.unionid || null,
    sessionKey: data.session_key
  };
}

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

app.post('/api/auth/wechat-login', async (req, res) => {
  const { code, profile } = req.body || {};

  if (!code) {
    return res.status(400).json({ message: '缺少 code' });
  }

  try {
    const { openid, unionid, sessionKey } = await fetchCode2Session(code);
    const sessionKeyHash = hashSessionKey(sessionKey);

    const [user, created] = await User.findOrCreate({
      where: { openid },
      defaults: {
        openid,
        unionid,
        sessionKeyHash,
        nickname: profile?.nickName || null,
        avatarUrl: profile?.avatarUrl || null,
        lastLoginAt: new Date()
      }
    });

    if (!created) {
      await user.update({
        unionid,
        sessionKeyHash,
        nickname: profile?.nickName || user.nickname,
        avatarUrl: profile?.avatarUrl || user.avatarUrl,
        lastLoginAt: new Date()
      });
    }

    const loginToken = crypto
      .createHmac('sha256', requiredEnv('LOGIN_TOKEN_SECRET'))
      .update(`${openid}.${Date.now()}`)
      .digest('hex');

    return res.json({
      isNewUser: created,
      token: loginToken,
      user: {
        id: user.id,
        openid,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message || '登录失败' });
  }
});

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`server started at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('database init failed', error);
    process.exit(1);
  });
