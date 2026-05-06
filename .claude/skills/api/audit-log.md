# Audit Log  `/api/v1/audit-log`

บันทึก activity ในระบบ — **SuperAdmin เท่านั้น** (read-only)

`AuditLogService` export `log()` method ให้ module อื่น inject และเรียกใช้เพื่อบันทึก event

---

### GET `/api/v1/audit-log`

**Query**
```
page   number   required
limit  number   required
```

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": [{
    "id": "AUDIT-20260506-xxxx",
    "actorType": "user",
    "actorId": "abc123nanoid",
    "action": "create",
    "resourceType": "order",
    "resourceId": "ORD-20260506-xxxx",
    "beforeData": null,
    "afterData": { "status": "pending", "shopId": "SHOP-xxxx" },
    "ipAddress": "192.168.1.100",
    "createdAt": "2026-05-06T09:00:00.000Z"
  }],
  "pagination": { "page": 1, "limit": 20, "total": 500, "totalPages": 25, "hasNextPage": true, "hasPreviousPage": false }
}
```
> เรียงจากใหม่ → เก่า (DESC createdAt)

---

### GET `/api/v1/audit-log/:id`

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "OK", "data": { "id": "AUDIT-20260506-xxxx", "..." } }
```

---

## Enums

```ts
AuditActorType = 'user' | 'terminal' | 'employee' | 'system'

AuditAction    = 'login' | 'logout' | 'create' | 'update' | 'delete'
               | 'stock_in' | 'stock_adjust' | 'stock_return'
               | 'order_complete' | 'order_cancel'
               | 'pin_verify'
```

---

## Backend Usage (service injection)

```ts
import { AuditLogService, CreateAuditLogDto } from '@app/modules/audit-log/audit-log.service';
import { AuditActorType, AuditAction } from '@app/modules/audit-log/entities/audit-log.entity';

// inject ใน constructor
constructor(private readonly auditLogService: AuditLogService) {}

// เรียกใช้
await this.auditLogService.log({
  actorType: AuditActorType.User,
  actorId: req.user.sub,
  action: AuditAction.Create,
  resourceType: 'order',
  resourceId: order.id,
  afterData: { status: order.status },
  ipAddress: req.ip,
});
```

> import `AuditLogModule` ใน module ที่ต้องการก่อน
