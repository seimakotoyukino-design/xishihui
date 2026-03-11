function bindRoleButtons() {
  const btnMerchant = document.querySelector('#btnMerchant');
  const btnUser = document.querySelector('#btnUser');

  if (btnMerchant) {
    btnMerchant.addEventListener('click', () => {
      alert('供应商入口：可发布临期/尾货商品，并查看损耗分析。');
    });
  }

  if (btnUser) {
    btnUser.addEventListener('click', () => {
      alert('消费者入口：浏览附近低价农蔬，在线下单并到店自提。');
    });
  }
}

bindRoleButtons();
