const http = require('http');
const { URL } = require('url');

const PORT = process.env.API_PORT || 3000;

const db = {
  users: [
    { id: 'u_consumer_1', phone: '13800000000', role: 'consumer', nickname: '小明' },
    { id: 'u_merchant_1', phone: '13900000000', role: 'merchant', nickname: '老王生鲜' }
  ],
  products: [
    {
      id: 'p_1',
      merchantId: 'u_merchant_1',
      title: '当日小番茄混合包',
      category: '蔬菜',
      marketPrice: 20,
      salePrice: 9.9,
      expiryLevel: '1day',
      pickupWindow: '19:00-21:00',
      status: 'published',
      availableQty: 20,
      lng: 121.4737,
      lat: 31.2304
    }
  ],
  orders: [],
  smsCodes: new Map(),
  tokens: new Map()
};

function send(res, code, payload) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
  });
}

function authUser(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const userId = db.tokens.get(token);
  return db.users.find((u) => u.id === userId) || null;
}

function requireRole(user, roles) {
  return user && roles.includes(user.role);
}

function distKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    return send(res, 200, { ok: true, service: 'xishihui-api' });
  }

  if (req.method === 'POST' && url.pathname === '/auth/sms/send') {
    const body = await parseBody(req).catch(() => null);
    if (!body?.phone) return send(res, 400, { message: 'phone is required' });
    const code = '123456';
    db.smsCodes.set(body.phone, code);
    return send(res, 200, { message: 'sms sent (mock)', code });
  }

  if (req.method === 'POST' && url.pathname === '/auth/login') {
    const body = await parseBody(req).catch(() => null);
    const { phone, code, role } = body || {};
    if (!phone || !code || !role) return send(res, 400, { message: 'phone/code/role required' });
    if (db.smsCodes.get(phone) !== code) return send(res, 401, { message: 'invalid code' });
    let user = db.users.find((u) => u.phone === phone && u.role === role);
    if (!user) {
      user = { id: `u_${Date.now()}`, phone, role, nickname: phone.slice(-4) };
      db.users.push(user);
    }
    const token = `token_${user.id}_${Date.now()}`;
    db.tokens.set(token, user.id);
    return send(res, 200, { accessToken: token, user });
  }

  if (req.method === 'GET' && url.pathname === '/auth/me') {
    const user = authUser(req);
    if (!user) return send(res, 401, { message: 'unauthorized' });
    return send(res, 200, { user });
  }

  if (req.method === 'GET' && url.pathname === '/products/nearby') {
    const lng = Number(url.searchParams.get('lng'));
    const lat = Number(url.searchParams.get('lat'));
    const radius = Number(url.searchParams.get('radius') || 3);
    if (Number.isNaN(lng) || Number.isNaN(lat)) return send(res, 400, { message: 'lng/lat required' });

    const products = db.products
      .filter((p) => p.status === 'published' && p.availableQty > 0)
      .map((p) => ({ ...p, distanceKm: Number(distKm(lat, lng, p.lat, p.lng).toFixed(2)) }))
      .filter((p) => p.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return send(res, 200, { items: products });
  }

  if (req.method === 'POST' && url.pathname === '/merchant/products') {
    const user = authUser(req);
    if (!requireRole(user, ['merchant'])) return send(res, 403, { message: 'merchant only' });
    const body = await parseBody(req).catch(() => null);
    if (!body?.title || !body?.salePrice || !body?.availableQty) {
      return send(res, 400, { message: 'title/salePrice/availableQty required' });
    }
    const item = {
      id: `p_${Date.now()}`,
      merchantId: user.id,
      title: body.title,
      category: body.category || '其他',
      marketPrice: Number(body.marketPrice || body.salePrice),
      salePrice: Number(body.salePrice),
      expiryLevel: body.expiryLevel || '1day',
      pickupWindow: body.pickupWindow || '19:00-21:00',
      status: 'published',
      availableQty: Number(body.availableQty),
      lng: Number(body.lng || 121.4737),
      lat: Number(body.lat || 31.2304)
    };
    db.products.push(item);
    return send(res, 201, { item });
  }

  if (req.method === 'POST' && url.pathname === '/orders') {
    const user = authUser(req);
    if (!requireRole(user, ['consumer'])) return send(res, 403, { message: 'consumer only' });
    const body = await parseBody(req).catch(() => null);
    const { productId, qty = 1 } = body || {};
    const product = db.products.find((p) => p.id === productId && p.status === 'published');
    if (!product) return send(res, 404, { message: 'product not found' });
    if (product.availableQty < qty) return send(res, 400, { message: 'insufficient inventory' });

    product.availableQty -= qty;
    const order = {
      id: `o_${Date.now()}`,
      orderNo: `XS${Date.now()}`,
      consumerId: user.id,
      merchantId: product.merchantId,
      productId,
      qty,
      amount: Number((product.salePrice * qty).toFixed(2)),
      status: 'pending_payment',
      pickupCode: String(Math.floor(100000 + Math.random() * 900000)),
      createdAt: new Date().toISOString()
    };
    db.orders.push(order);
    return send(res, 201, { order });
  }

  if (req.method === 'POST' && url.pathname.match(/^\/orders\/[^/]+\/pay$/)) {
    const user = authUser(req);
    if (!requireRole(user, ['consumer'])) return send(res, 403, { message: 'consumer only' });
    const orderId = url.pathname.split('/')[2];
    const order = db.orders.find((o) => o.id === orderId && o.consumerId === user.id);
    if (!order) return send(res, 404, { message: 'order not found' });
    if (order.status !== 'pending_payment') return send(res, 400, { message: 'invalid order status' });
    order.status = 'ready_for_pickup';
    return send(res, 200, { order });
  }

  if (req.method === 'GET' && url.pathname === '/orders/my') {
    const user = authUser(req);
    if (!requireRole(user, ['consumer'])) return send(res, 403, { message: 'consumer only' });
    return send(res, 200, { items: db.orders.filter((o) => o.consumerId === user.id) });
  }

  send(res, 404, { message: 'not found' });
});

server.listen(PORT, () => {
  console.log(`[xishihui-api] running at http://127.0.0.1:${PORT}`);
});
