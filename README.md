# Netcom Analytics — Brazilian E-Commerce Platform

A full-stack analytics platform, operational dashboard, and relational data engine built for high-volume Brazilian e-commerce transaction data (1.45 million records across 9 relational tables).

![Entity-Relationship Diagram](erd.png)

---

## Overview

The platform provides fast relational querying, time-series revenue tracking, statistical anomaly detection, operational fulfillment queues, and dynamic CRUD management. It is designed to handle high transaction density with clean architecture, strict database constraints, connection pooling, and role-based access control.

### Technology Stack
* **Backend:** Python 3, Flask RESTful API, PyMySQL connection pooling with `DBUtils`, Argon2 password hashing, PyJWT authentication, NumPy/SciPy statistical engines.
* **Database:** MySQL 8.0 (InnoDB engine, UTF8MB4 charset, composite primary keys, foreign key constraints, B-Tree indexed search columns).
* **Frontend:** React 19, Vite 8, Tailwind CSS, Chart.js & react-chartjs-2, Lucide icons.
* **Security:** JWT bearer tokens, Argon2 password hashing, RBAC permission middleware (`admin`, `manager`, `viewer`).

---

## Repository Structure

```text
netcom/
├── backend/
│   ├── analytics/              # Revenue, anomaly detection, and fulfillment routes
│   ├── auth/                   # JWT authentication, Argon2 hashing, and RBAC routes
│   ├── crud/                   # Universal schema introspection and CRUD endpoints
│   ├── app.py                  # Flask application factory and blueprint registration
│   ├── config.py               # Environment configuration loader
│   ├── db.py                   # PooledDB connection management and query helpers
│   ├── init_db.py              # Database schema initializer and CSV ingestion runner
│   ├── test_api.py             # Automated 10-point test suite for API verification
│   ├── requirements.txt        # Backend Python dependencies
│   ├── .env.example            # Sample environment variables
│   └── netcom_api_collection.postman_collection.json # Postman v2.1.0 collection
├── dataset_technical_test_netcom/ # Source CSV datasets
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable UI (Navbar, Sidebar, Skeleton, EmptyState)
│   │   ├── context/            # AuthContext (JWT management, user state)
│   │   ├── pages/              # Overview, Daily Revenue, Anomalies, Orders, CRUD, Architecture
│   │   ├── api.js              # Axios HTTP client with request/response interceptors
│   │   └── App.jsx             # Main router and authenticated layout shell
│   ├── index.html              # HTML entrypoint
│   ├── package.json            # Node dependencies and build scripts
│   └── vite.config.js          # Vite config with backend proxy setup
├── erd.png                     # High-resolution Entity-Relationship Diagram (300 DPI)
├── netcom_ecommerce_dump.sql.gz # Compressed database dump with 1.45M records (39.4 MB)
├── schema.sql                  # DDL statements and foreign key constraints
└── README.md                   # System documentation and operational runbook
```

---

## Core Capabilities & Deliverables

| Module / Requirement | Description | Location |
| :--- | :--- | :--- |
| **Universal CRUD Engine** | Full Create, Read, Update, Delete with search, pagination, and sorting across all 9 dataset tables | [frontend/src/pages/CrudManager.jsx](frontend/src/pages/CrudManager.jsx)<br>[backend/crud/routes.py](backend/crud/routes.py) |
| **Authentication & RBAC** | Secure role-based login (Admin, Manager, Viewer) with Argon2 hashing and JWT tokens | [frontend/src/pages/Login.jsx](frontend/src/pages/Login.jsx)<br>[backend/auth/routes.py](backend/auth/routes.py) |
| **Daily Revenue Analytics** | Time-series daily revenue breakdown filtered by month and year with dual-axis volume correlation | [frontend/src/pages/RevenueAnalytics.jsx](frontend/src/pages/RevenueAnalytics.jsx)<br>[backend/analytics/routes.py](backend/analytics/routes.py) |
| **Statistical Anomaly Detection** | Parametric (Z-Score) & non-parametric (IQR) outlier detection highlighting demand shocks (e.g., Black Friday 2017) | [frontend/src/pages/AnomalyDetection.jsx](frontend/src/pages/AnomalyDetection.jsx)<br>[backend/analytics/routes.py](backend/analytics/routes.py) |
| **Fulfillment & Unshipped Orders** | Operational backlog queue tracking unshipped orders with delivery SLA latency warnings | [frontend/src/pages/UnshippedOrders.jsx](frontend/src/pages/UnshippedOrders.jsx)<br>[backend/analytics/routes.py](backend/analytics/routes.py) |
| **Entity-Relationship Diagram** | Normalized 9-entity relational topology with central order lifecycle hub (300 DPI) | [erd.png](erd.png) |
| **Complete Database Dump** | MySQL database dump containing complete DDL schema, indexes, and all 1,450,927 rows | [netcom_ecommerce_dump.sql.gz](netcom_ecommerce_dump.sql.gz) |
| **100x Scaling Architecture** | Multi-tier scaling blueprint (partitioning, Redis caching, ClickHouse OLAP, Kafka CDC) | [README.md #scaling-strategy](#100x-scaling-strategy-150m-records) & UI |

---

## Database Architecture & Ingestion

### Schema Topology
* **Central Hub (`orders`):** Connects to `order_items`, `order_payments`, and `order_reviews` via `order_id`.
* **Customers & Sellers:** `orders.customer_id` &rarr; `customers.customer_id`; `order_items.seller_id` &rarr; `sellers.seller_id`.
* **Catalog & Categories:** `order_items.product_id` &rarr; `products.product_id`; `products.product_category_name` &rarr; `product_category_translation.product_category_name`.
* **Spatial Mapping:** `customers.customer_zip_code_prefix` and `sellers.seller_zip_code_prefix` map to `geolocation.geolocation_zip_code_prefix`.
* **Isolated Auth Entity:** The `users` table is strictly segregated from transaction workflows for administrative security.

### Verified Ingested Records

| Table Name | Ingested Rows | Primary Key | Foreign Key References | Description |
| :--- | :---: | :--- | :--- | :--- |
| `users` | **3** | `id` (AUTO_INCREMENT) | None (Isolated) | Dashboard users & RBAC roles |
| `product_category_translation` | **73** | `product_category_name` | None | Category translation (PT &rarr; EN) |
| `customers` | **99,441** | `customer_id` | `customer_zip_code_prefix` | Unique customer profiles and locations |
| `sellers` | **3,095** | `seller_id` | `seller_zip_code_prefix` | Merchant directory and locations |
| `products` | **32,951** | `product_id` | `product_category_name` | Product dimensions, weights, and categories |
| `orders` | **99,441** | `order_id` | `customer_id` | Order lifecycle and status milestones |
| `order_items` | **112,650** | `(order_id, order_item_id)` | `order_id`, `product_id`, `seller_id` | Item-level prices and freight charges |
| `order_payments` | **103,886** | `(order_id, payment_sequential)` | `order_id` | Payment types, installments, and values |
| `order_reviews` | **99,224** | `review_id` | `order_id` | Review ratings (1-5) and customer comments |
| `geolocation` | **1,000,163** | `geolocation_id` (AUTO_INCREMENT) | Referenced by zip prefix | GPS coordinates, cities, and states |
| **Total Ingested** | **1,450,927** | — | — | **100% Relational Integrity** |

---

## Feature Implementations

### 1. Universal CRUD Engine
* **Dynamic Reflection:** Reads table metadata from `INFORMATION_SCHEMA.COLUMNS` to automatically construct table views, validation constraints, and form inputs.
* **Composite Primary Key Support:** Correctly handles multi-column keys in tables like `order_items` (`order_id`, `order_item_id`) and `order_payments` (`order_id`, `payment_sequential`).
* **Server-Side Pagination & Filtering:** Handles high table density with `LIMIT / OFFSET`, column-specific sorting (`ORDER BY`), and multi-column fuzzy search (`LIKE`).

### 2. Daily Revenue Analytics
* **Calendar Filtering:** Select by year (2016, 2017, 2018, or All) and month (Jan–Dec, or All Months).
* **Dual-Axis Chart:** Visualizes daily merchandise revenue (R$) alongside daily order counts.
* **Financial Ledger:** Detailed daily ledger reporting merchandise revenue, freight revenue, gross revenue, items sold, and average order value (AOV) with CSV export.

### 3. Statistical Anomaly Detection
* **Z-Score Engine (Parametric):** Calculates daily deviation relative to historical rolling mean and standard deviation ($Z = \frac{x - \mu}{\sigma}$). Threshold is user-configurable from $2.0\sigma$ to $3.5\sigma$.
* **IQR Boxplot Engine (Non-Parametric):** Robust against skewness using upper quartile thresholds ($Q_3 + 1.5 \times IQR$).
* **Black Friday 2017 Detection:** Automatically identifies **2017-11-24** as the all-time peak trading day (R\$ 152,653.74 across 1,166 orders, Z-score **+12.13**, $+10.44\sigma$ surge above mean), alongside the carry-over weekend spike on 2017-11-25.

### 4. Fulfillment & Unshipped Orders
* **Queue Scope:** Monitors all active orders pending shipment (`invoiced`, `processing`, `created`, `approved`, `unavailable` — 1,233 orders).
* **SLA Tracking:** Computes real-time fulfillment latency against `order_estimated_delivery_date` (`Within SLA`, `Normal`, `Urgent`).
* **Inline Lifecycle Transitions:** Allows authorized roles to advance orders (`Mark Shipped`, `Mark Delivered`, `Cancel Order`) with immediate UI update.

---

## 100x Scaling Strategy (150M+ Records)

When scaling from 1.45 million records to **150 million+ records** with thousands of concurrent users, a single monolithic database tier faces table lock contention, deep B-Tree traversal times, I/O saturation, and connection exhaustion. 

The architecture below outlines the strategy to sustain sub-100ms response times and 99.99% availability:

```text
                          ┌──────────────────────────┐
                          │   Global Edge CDN        │
                          │ Cloudflare / CloudFront  │
                          │ (Static Assets & API)    │
                          └─────────────┬────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │    ALB / Nginx Proxy     │
                          │  Rate Limiting & SSL     │
                          └─────────────┬────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    │                                       │
                    ▼                                       ▼
      ┌──────────────────────────┐            ┌──────────────────────────┐
      │  App Pod 1 (FastAPI/Py)  │            │  App Pod N (FastAPI/Py)  │
      │  Horizontal Auto-Scaled  │            │  Horizontal Auto-Scaled  │
      └─────────────┬────────────┘            └─────────────┬────────────┘
                    │                                       │
                    ├───────────────────┬───────────────────┤
                    │                   │                   │
                    ▼                   ▼                   ▼
      ┌──────────────────────────┐┌───────────┐┌──────────────────────────┐
      │      Redis Cluster       ││ ProxySQL  ││    Kafka + Debezium CDC  │
      │   In-Memory Cache & Lock ││ Multiplex ││    Change Data Capture   │
      └──────────────────────────┘└─────┬─────┘└────────────┬─────────────┘
                                        │                   │
                  ┌─────────────────────┴───────┐           │
                  │                             │           │
                  ▼                             ▼           ▼
      ┌──────────────────────────┐┌───────────────────────┐┌──────────────┐
      │ Primary MySQL (OLTP)     ││ Read Replica Cluster  ││ ClickHouse   │
      │ Range Partitioned by Year││ (1:3 Multi-AZ Nodes)  ││ (OLAP Engine)│
      └──────────────────────────┘└───────────────────────┘└──────────────┘
```

### 1. Database Partitioning & Read Replicas
* **Range Partitioning by Timestamp:** Partition `orders` and `order_items` by `YEAR(order_purchase_timestamp)` and `MONTH`. MySQL query pruning scans only the specific target month partition, reducing disk lookups from 150M rows down to ~1.2M rows.
* **Read/Write Splitting with ProxySQL:** Deploy 1 Primary Writer with 3 Read Replicas. ProxySQL directs transactional writes to the primary node and routes analytical queries across read replicas.
* **Connection Multiplexing:** `PooledDB` and ProxySQL multiplex client connections, keeping active DB threads capped at ~200 while safely serving 10,000+ concurrent clients.

### 2. In-Memory Caching Tier (Redis Cluster)
* **Pre-Computed Daily Revenue Rollups:** Daily financial aggregates are cached in Redis (`rev:daily:YYYY-MM`). Historical months are cached permanently, while current month data uses a 3-minute TTL with cache-aside invalidation.
* **Sub-Millisecond Token Verification:** Active JWT tokens and role privileges are validated against Redis in under 0.5ms.
* **Sliding-Window Rate Limiting:** Redis Lua scripts enforce a 100 req/min rate limit per IP to protect analytics endpoints.

### 3. Columnar OLAP Engine (ClickHouse / BigQuery)
* **Separation of OLTP and OLAP:** Real-time transactional mutations (CRUD, order status updates) stay on MySQL. Row changes are streamed from MySQL binlogs via **Debezium CDC** into **Apache Kafka**.
* **Vectorized Analytical Execution:** Kafka loads data into **ClickHouse**. With LZ4 columnar compression and vectorized execution, ClickHouse computes Z-scores across 150M records in **under 80ms** (compared to ~45 seconds on standard row-oriented MySQL).

### 4. Spatial Geolocation Pre-Aggregation
* In the raw dataset, `geolocation` contains 1,000,163 GPS records for ~19,000 zip code prefixes.
* *Optimization:* Create a materialized table `geolocation_centroids` grouping by `geolocation_zip_code_prefix` and computing `AVG(latitude)` and `AVG(longitude)`. This compresses 1,000,000 rows to 19,015 indexed points, eliminating massive N:M cartesian join overhead.

---

## Quickstart & Setup Guide

### 1. Prerequisites
* **Python:** 3.10+
* **Node.js:** 18+ (Node 20 recommended)
* **Database:** MySQL 8.0+ running on `127.0.0.1:3306`

---

### 2. Database Setup

Create the target database in MySQL:
```sql
CREATE DATABASE IF NOT EXISTS netcom_ecommerce_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**Option A — Restore from Database Dump (Recommended & Fastest):**
```bash
# On Windows (built-in tar):
tar -xzf netcom_ecommerce_dump.sql.gz
mysql -u <your_username> -p netcom_ecommerce_db < netcom_ecommerce_dump.sql

# On Linux / macOS:
gzip -d < netcom_ecommerce_dump.sql.gz | mysql -u <your_username> -p netcom_ecommerce_db
```

**Option B — Ingest from Raw CSV Files:**
```bash
cd backend
python init_db.py
```

---

### 3. Backend Setup

1. Navigate to the backend directory and install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. Configure environment variables by copying `.env.example`:
   ```bash
   cp .env.example .env
   ```
   *(On Windows PowerShell: `Copy-Item .env.example .env`)*

   Adjust database credentials in `backend/.env` if your local MySQL settings differ:
   ```ini
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=netcom_ecommerce_db
   JWT_SECRET=change-me-in-production-jwt-secret-key
   PORT=5000
   ```

3. Run the automated test suite to verify database connection and API endpoints:
   ```bash
   python test_api.py
   ```
   *Expected output:*
   ```text
   ============================================================
   NETCOM E-COMMERCE ANALYTICS & CRUD API TEST SUITE
   ============================================================
   [PASS] 1. /api/health - Database connected
   [PASS] 2. Login verification: admin (admin)
   [PASS] 2. Login verification: manager (manager)
   [PASS] 2. Login verification: viewer (viewer)
   [PASS] 3. /api/auth/me - Token validation passed
   [PASS] 4. /api/crud/datasets - All 9 datasets listed (9 tables)
   [PASS] 5. /api/crud/customers - Schema inspected and paginated (Total: 99441)
   [PASS] 6. /api/analytics/overview - KPIs verified (Orders: 99441, Rev: R$ 13,591,643.70)
   [PASS] 7. /api/analytics/daily-revenue - November 2017 Peak verified on 2017-11-24 (R$ 152,653.74)
   [PASS] 8. /api/analytics/anomalies - Black Friday 2017 detected (Z-Score: 12.13)
   [PASS] 9. /api/analytics/unshipped-orders - Operational queue verified (1233 unshipped orders)
   [PASS] 10. RBAC Protection - Viewer forbidden from PATCH status (HTTP 403 verified)
   ============================================================
   All 10 API test suites passed successfully.
   ============================================================
   ```

4. Start the backend API server:
   ```bash
   python app.py
   ```
   *Server runs at:* `http://127.0.0.1:5000`

---

### 4. Frontend Setup

1. Open a new terminal, navigate to the frontend directory, and install packages:
   ```bash
   cd frontend
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```
   *Frontend is live at:* `http://localhost:3000`

3. *(Optional)* Build for production:
   ```bash
   npm run build
   ```

---

## Default Test Accounts

| Username | Password | Role | Permissions |
| :--- | :--- | :---: | :--- |
| **`admin`** | `Admin@123` | **`admin`** | Full CRUD, order status modifications, analytics, schema inspection |
| **`manager`** | `Manager@123` | **`manager`** | Full CRUD, order status modifications, analytics |
| **`viewer`** | `Viewer@123` | **`viewer`** | Read-only access across all dashboards, charts, and tables |

---

## API Reference

### Authentication (`/api/auth`)
* `POST /api/auth/login` — Authenticate and receive JWT token + user profile.
* `GET /api/auth/me` — Inspect current token payload and active role.
* `GET /api/auth/users` — Administrative user list (Admin only).

### Universal CRUD Engine (`/api/crud`)
* `GET /api/crud/datasets` — List all 9 supported dataset entities with record counts.
* `GET /api/crud/schema/<dataset>` — Inspect column names, data types, and primary keys.
* `GET /api/crud/<dataset>?page=1&per_page=25&search=...&sort_by=...&sort_order=...` — Paginated and sorted records.
* `GET /api/crud/<dataset>/<id>` — Fetch a single record by primary key.
* `POST /api/crud/<dataset>` — Create a new record (Admin/Manager).
* `PUT /api/crud/<dataset>/<id>` — Update an existing record (Admin/Manager).
* `DELETE /api/crud/<dataset>/<id>` — Delete a record (Admin only).

### Analytics & Fulfillment (`/api/analytics`)
* `GET /api/analytics/overview` — Executive KPIs (gross revenue, orders, customers, reviews, payment breakdown).
* `GET /api/analytics/daily-revenue?year=2017&month=11` — Daily time-series revenue and volume data.
* `GET /api/analytics/anomalies?year=2017&method=zscore&threshold=2.5` — Algorithmic outlier detection register.
* `GET /api/analytics/unshipped-orders?page=1&page_size=20&status=...` — Fulfillment backlog queue with SLA health.
* `PATCH /api/analytics/orders/<order_id>/status` — Update order fulfillment state (`shipped`, `delivered`, `canceled`).

---

## Testing & Tooling
* **Automated Test Suite:** Run `python backend/test_api.py` to run the 10-point assertion suite.
* **Postman Collection:** Import [backend/netcom_api_collection.postman_collection.json](backend/netcom_api_collection.postman_collection.json) (v2.1.0) with automated token extraction into Postman. See [backend/README_API.md](backend/README_API.md) for usage instructions.
