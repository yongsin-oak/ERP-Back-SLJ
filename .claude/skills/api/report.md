# Report  `/api/v1/report`

ต้อง auth (all roles) — endpoints สำหรับปิดยอดรายเดือน/วิเคราะห์ยอดขาย

---

### GET `/api/v1/report/sales-summary`

**Query**
```
dateFrom  string   required — ISO8601
dateTo    string   required — ISO8601
shopId    string?  filter เฉพาะ shop
groupBy   string?  'day' | 'week' | 'month'  (default: 'day')
```

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": [
    { "date": "2026-05-01", "revenue": 45000, "cost": 32000, "profit": 13000, "orderCount": 25 },
    { "date": "2026-05-02", "revenue": 38000, "cost": 27000, "profit": 11000, "orderCount": 18 }
  ]
}
```
> `date` format: day=`yyyy-MM-dd`, week=`yyyy-Www`, month=`yyyy-MM`  
> คำนวณจาก `order.startRecordAt`

---

### GET `/api/v1/report/sales-by-shop`

**Query**
```
dateFrom  string   required — ISO8601
dateTo    string   required — ISO8601
```

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": [
    { "shopId": "SHOP-xxxx", "shopName": "Shopee Main", "platform": "Shopee", "revenue": 150000, "cost": 110000, "orderCount": 80 }
  ]
}
```

---

### GET `/api/v1/report/sales-by-product`

**Query**
```
dateFrom    string   required — ISO8601
dateTo      string   required — ISO8601
shopId      string?
categoryId  string?
brandId     string?
```

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": [
    {
      "barcode": "8850999123456",
      "name": "โค้ก 325ml",
      "quantityPack": 200,
      "quantityCarton": 15,
      "revenue": 28000,
      "cost": 20000,
      "profit": 8000
    }
  ]
}
```

---

### GET `/api/v1/report/man-hour`

**Query**
```
dateFrom    string   required — ISO8601
dateTo      string   required — ISO8601
employeeId  string?  filter เฉพาะพนักงาน
```

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": [
    {
      "employeeId": "EMP-xxxx",
      "name": "สมชาย ใจดี",
      "orderCount": 45,
      "totalMinutes": 315,
      "avgMinutesPerOrder": 7
    }
  ]
}
```
> คำนวณจาก `order.completedRecordAt - order.startRecordAt` — orders ที่ไม่มีทั้งสองค่าจะถูกข้ามไป
