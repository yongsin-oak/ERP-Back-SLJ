# Axios Config & Relationships

## Relationships (Quick Reference)

```
brand.id          → product.brandId
category.id       → product.categoryId
category.id       → category.parentId        (self-ref)
employee.id       → order.recordByEmployeeId
terminal.id       → order.terminalId
shop.id           → order.shopId
order.id          → order_detail.orderId
product.barcode   → order_detail.productBarcode
product.barcode   → stock_entry.productBarcode
employee.id       → stock_entry.employeeId
```

---

## Axios Config

### User Session (ปกติ)
```ts
const api = axios.create({
  baseURL: 'http://localhost:5050/api/v1',
  withCredentials: true,   // ส่ง cookie ทุก request
});

// Auto refresh เมื่อ 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true;
      await api.post('/auth/refresh-token');
      return api(err.config);
    }
    return Promise.reject(err);
  },
);
```

### Terminal + Actor Token Flow
```ts
// 1. Terminal login
await api.post('/auth/login', { terminalCode: 'POS-01', password: 'terminal1234' });

// 2. Employee PIN verify → ได้ actorToken
const { data } = await api.post('/auth/pin/verify', {
  employeeId: 'EMP-xxxx',
  pin: '1234',
});
const actorToken = data.data.actorToken;

// 3. ใช้ actorToken ใน header สำหรับ action ที่ต้องการ
await api.post('/stock-entry', body, {
  headers: { 'X-Actor-Token': actorToken },
});

// 4. เมื่อ actorToken หมดอายุ (401) → ขอ PIN ใหม่
```
