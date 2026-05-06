# User Management  `/api/v1/user`

ทุก endpoint ต้อง auth — **SuperAdmin เท่านั้น**

---

### GET `/api/v1/user/roles`
ดึง enum Role ทั้งหมดที่มีในระบบ

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": ["Operator", "SuperAdmin", "Admin", "Accountant", "Warehouse", "Sales", "Marketing", "HR"]
}
```

---

### GET `/api/v1/user`

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": [{ "id": "abc123", "username": "superadmin", "role": "SuperAdmin" }]
}
```

---

### GET `/api/v1/user/:id`

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "OK", "data": { "id": "abc123", "username": "superadmin", "role": "SuperAdmin" } }
```

---

### POST `/api/v1/user`

**Body**
```json
{ "username": "john_doe", "password": "password1234", "role": "Operator" }
```

**Response 201**
```json
{ "success": true, "statusCode": 201, "message": "Created", "data": { "id": "abc123", "username": "john_doe", "role": "Operator" } }
```

---

### PATCH `/api/v1/user/:id/role`

**Body**
```json
{ "role": "Admin" }
```

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "Updated", "data": { "id": "abc123", "username": "john_doe", "role": "Admin" } }
```

---

### DELETE `/api/v1/user/:id`

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "Deleted", "data": { "id": "abc123", "username": "john_doe", "role": "Operator" } }
```
