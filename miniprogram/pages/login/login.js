Page({
  data: {
    loading: false,
    userInfo: null,
    isNewUser: false
  },

  async handleWechatLogin() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const loginRes = await this.wxLogin();

      // 小程序基础库 2.21.2+ 支持 getUserProfile
      const profileRes = await wx.getUserProfile({
        desc: '用于完善会员资料'
      });

      const backendRes = await this.requestBackendLogin({
        code: loginRes.code,
        profile: profileRes.userInfo
      });

      wx.setStorageSync('token', backendRes.token);
      wx.setStorageSync('user', backendRes.user);

      this.setData({
        userInfo: {
          id: backendRes.user.id,
          nickname: backendRes.user.nickname,
          avatarUrl: backendRes.user.avatarUrl
        },
        isNewUser: backendRes.isNewUser
      });

      wx.showToast({ title: '登录成功', icon: 'success' });
    } catch (error) {
      console.error(error);
      wx.showToast({
        title: error.message || '登录失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  wxLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            resolve(res);
            return;
          }
          reject(new Error('wx.login 未返回 code'));
        },
        fail: reject
      });
    });
  },

  requestBackendLogin(payload) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'http://127.0.0.1:3000/api/auth/wechat-login',
        method: 'POST',
        header: {
          'Content-Type': 'application/json'
        },
        data: payload,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
            return;
          }
          reject(new Error(res.data?.message || `请求失败: ${res.statusCode}`));
        },
        fail: reject
      });
    });
  }
});
