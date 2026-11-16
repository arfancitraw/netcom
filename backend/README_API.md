# Netcom Analytics — API Reference & Postman Collection

This directory contains the official Postman collection and reference documentation for the Netcom E-Commerce Platform REST API.

---

## Postman Collection

The API collection is available in:
* **[netcom_api_collection.postman_collection.json](netcom_api_collection.postman_collection.json)** (Postman v2.1.0 format)

### Features included in the collection:
* **Pre-configured Environment Variables:** `baseUrl` defaults to `http://127.0.0.1:5000`.
* **Automated Token Capture:** Executing the **Login - Admin Role** request automatically captures the returned JWT token and stores it in the collection variable `jwt_token`.
* **Automatic Authorization:** All protected endpoints in the collection inherit `Bearer {{jwt_token}}` automatically.
* **Pre-populated Parameters:** Contains realistic IDs and query parameters matching the ingested Brazilian e-commerce dataset (e.g., Black Friday 2017 date queries, valid customer IDs, and composite keys).

---

## How to Import & Use

1. Open **Postman** and click **Import** (top left).
2. Drag and drop `netcom_api_collection.postman_collection.json` (or click **files** to browse).
3. Ensure the backend server is running:
   ```bash
   python backend/app.py
   ```
4. In the imported collection, run the request:
   **Authentication & RBAC &rarr; Login - Admin Role**
5. Postman will automatically capture the JWT token into `{{jwt_token}}`.
6. You can now execute any request across the Analytics, Orders, and CRUD folders immediately.

---

## Authentication & Test Credentials

All protected endpoints require an `Authorization: Bearer <token>` header. The database is pre-seeded with three test roles:

| Role | Username | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `Admin@123` | Full access: User administration, full CRUD mutations, order status updates, and all analytics. |
| **Manager** | `manager` | `Manager@123` | Operational access: CRUD create/update, order status updates, and all analytics. (Cannot delete records or manage users). |
| **Viewer** | `viewer` | `Viewer@123` | Read-only access: View-only permissions across all dashboards and tables. Mutations return `403 Forbidden`. |

---

## API Endpoints Overview

### 1. System
* `GET /api/health` — Database connection health ping. Returns `200 OK` with connection status.

### 2. Authentication & Users
* `POST /api/auth/login` — Authenticate credentials; returns JWT token and user profile.
* `GET /api/auth/me` — Retrieve active user identity and role claims.
* `GET /api/auth/users` — List registered users (Admin only).

### 3. Analytics & Operational Backlog
* `GET /api/analytics/overview` — High-level platform KPIs (GMV, order count, unique customers, category breakdown, payment split).
* `GET /api/analytics/daily-revenue?year=2017&month=11` — Daily time series of revenue and order volume. Supports `year=all` and `month=all`.
* `GET /api/analytics/anomalies?year=2017&method=zscore&threshold=2.5` — Algorithmic outlier detection (Z-score and IQR) highlighting demand shocks.
* `GET /api/analytics/unshipped-orders?page=1&page_size=20&status=all` — Operational fulfillment queue with calculated SLA latency.
* `PATCH /api/analytics/orders/<order_id>/status` — Advance order state (`shipped`, `delivered`, `canceled`).

### 4. Universal CRUD Engine
Supports all 9 relational dataset entities: `customers`, `orders`, `order_items`, `order_payments`, `order_reviews`, `products`, `sellers`, `geolocation`, and `product_category_translation`.

* `GET /api/crud/datasets` — List all 9 supported datasets with live record counts and primary key definitions.
* `GET /api/crud/schema/<dataset>` — Table schema introspection (column types, nullability, keys).
* `GET /api/crud/<dataset>?page=1&per_page=25&search=<query>&sort_by=<col>&sort_order=<asc|desc>` — Server-side paginated and sorted list.
* `GET /api/crud/<dataset>/<id>` — Fetch a single record. For composite keys, use slash syntax (e.g., `/api/crud/order_items/<order_id>/<order_item_id>`).
* `POST /api/crud/<dataset>` — Insert a new record (Admin/Manager).
* `PUT /api/crud/<dataset>/<id>` — Update an existing record (Admin/Manager).
* `DELETE /api/crud/<dataset>/<id>` — Delete a record (Admin only).
