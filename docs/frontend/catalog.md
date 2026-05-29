# Brand, Category, Shop, Supplier — Request / Response

> Last updated: 2026-05-29
> See [/API.md](../../API.md) for envelope and auth. All responses are wrapped.

---

## Brand — `/brand`

### Brand object shape

```jsonc
{ "id": "BRD-xxxx", "name": "Sprite", "description": null, "createdAt": "...", "updatedAt": "..." }
```

### GET /brand — paginated (any role)

**Query:** `page`, `limit` (required).

**Response:** paginated list of Brand objects.

### GET /brand/:id (any role)

**Response `data`:** Brand object. Errors: `404`

### POST /brand — SuperAdmin

**Request body:**
| Field | Type | Required |
|---|---|---|
| `name` | string | yes |
| `description` | string | no |

**Response `data`:** created Brand (201). Errors: `409` name already exists

### POST /brand/bulk — SuperAdmin

**Request body:** array of Brand create objects.

**Response `data`:** array of created Brand objects.

### PATCH /brand/:id — SuperAdmin

**Request body:** any subset of `{ name, description }`.

**Response `data`:** updated Brand. Errors: `404`

### DELETE /brand/:id — SuperAdmin

**Response `data`:** deleted Brand. Errors: `404`

---

## Category — `/category`

### Category object shapes

**List / detail:**
```jsonc
{ "id": "CAT-xxxx", "name": "เครื่องดื่ม", "parentId": null, "description": null, "createdAt": "...", "updatedAt": "..." }
```

**Tree (`GET /category/tree`) — with children:**
```jsonc
{
  "id": "CAT-xxxx", "name": "สินค้า", "parentId": null, ...,
  "children": [ { "id": "CAT-yyyy", "name": "เครื่องดื่ม", ... } ]
}
```

**Single (`GET /category/:id`) — with parent:**
```jsonc
{
  "id": "CAT-yyyy", "name": "เครื่องดื่ม", ...,
  "parent": { "id": "CAT-xxxx", "name": "สินค้า", ... }
}
```

### GET /category — paginated (any role)

**Query:** `page`, `limit` (required) · `parentId` (optional filter by parent).

**Response:** paginated flat list.

### GET /category/tree (any role)

**Response `data`:** array of root categories each with nested `children[]`.

### GET /category/:id (any role)

**Response `data`:** Category with `parent` relation.

Errors: `404`

### POST /category — SuperAdmin

**Request body:**
| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | must be unique |
| `description` | string | no | |
| `parentId` | string | no | `CAT-xxxx` |

**Response `data`:** created Category (201). Errors: `409` name already exists

### PATCH /category/:id — SuperAdmin

**Request body:** any subset of `{ name, description, parentId }`.

Omitting `parentId` detaches the category from its parent (makes it a root).

**Response `data`:** updated Category. Errors: `404`

### DELETE /category/:id — SuperAdmin

**Query:** `deleteChild=true` to cascade-delete all children.
Without the flag, deletion is blocked if children exist.

**Response `data`:** deleted Category. Errors: `404` · `409` has children and `deleteChild` not set

---

## Shop — `/shop`

### Shop object shape

```jsonc
{
  "id": "SHOP-xxxx", "name": "SLJ Shopee", "description": null,
  "platform": "Shopee", "createdAt": "...", "updatedAt": "..."
}
```

Unique constraint: `(name, platform)`.

### GET /shop — paginated (any role)

**Query:** `page`, `limit` (required) · `platform` (optional).

**Response:** paginated list.

### GET /shop/:id (any role)

**Response `data`:** Shop object. Errors: `404`

### POST /shop — SuperAdmin

**Request body:**
| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | |
| `platform` | Platform | yes | `Shopee` \| `Lazada` \| `TikTok` \| `LineOA` \| `LineMan` \| `Offline` |
| `description` | string | no | |

**Response `data`:** created Shop (201). Errors: `409` (name, platform) pair exists

### PATCH /shop/:id — SuperAdmin

**Request body:** any subset of `{ name, platform, description }`.

**Response `data`:** updated Shop. Errors: `404`

### DELETE /shop/:id — SuperAdmin

**Response `data`:** deleted Shop. Errors: `404`

---

## Supplier — `/supplier`

### Supplier object shape

```jsonc
{
  "id": "SUP-xxxx", "name": "บริษัท โค้กไทย จำกัด",
  "contactName": "สมชาย", "phone": "021234567",
  "email": "contact@coke.co.th", "address": "Bangkok",
  "taxId": "0123456789012", "isActive": true,
  "note": null, "createdAt": "...", "updatedAt": "..."
}
```

### GET /supplier — paginated (any role)

**Query:** `page`, `limit` (required). Sorted by `name` ascending.

**Response:** paginated list.

### GET /supplier/:id (any role)

**Response `data`:** Supplier object. Errors: `404`

### POST /supplier — SuperAdmin

**Request body:**
| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | must be unique |
| `contactName` | string | no | |
| `phone` | string | no | |
| `email` | string (email) | no | |
| `address` | string | no | |
| `taxId` | string | no | |
| `isActive` | boolean | no | default `true` |
| `note` | string | no | |

**Response `data`:** created Supplier (201). Errors: `409` name exists

### PATCH /supplier/:id — SuperAdmin

**Request body:** any subset of Supplier create fields.

**Response `data`:** updated Supplier. Errors: `404`

### DELETE /supplier/:id — SuperAdmin

Hard delete. Use `PATCH isActive: false` to soft-retire.

**Response `data`:** deleted Supplier. Errors: `404`
