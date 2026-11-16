import React, { useState } from 'react';
import {
  Cpu,
  Database,
  Layers,
  Server,
  Zap,
  Download,
} from 'lucide-react';

export default function ArchitectureDoc() {
  const [activeSection, setActiveSection] = useState('scaling');

  const schemaTables = [
    { name: 'users', rows: 3, role: 'Dashboard Authentication & RBAC (Standalone)', pk: 'id', fk: 'None (Isolated)' },
    { name: 'geolocation', rows: 1000163, role: 'Spatial Coordinates & Zip Code Map', pk: 'geolocation_id', fk: 'Referenced by Customers/Sellers' },
    { name: 'product_category_translation', rows: 73, role: 'Category English Linguistic Map', pk: 'product_category_name', fk: 'Referenced by Products' },
    { name: 'products', rows: 32951, role: 'Item Catalog & Dimensions', pk: 'product_id', fk: 'product_category_name' },
    { name: 'customers', rows: 99441, role: 'Buyer Demographic & Unique Identity', pk: 'customer_id', fk: 'customer_zip_code_prefix' },
    { name: 'sellers', rows: 3095, role: 'Merchant Directory & Locations', pk: 'seller_id', fk: 'seller_zip_code_prefix' },
    { name: 'orders', rows: 99441, role: 'Central Hub Transaction Lifecycle', pk: 'order_id', fk: 'customer_id' },
    { name: 'order_items', rows: 112650, role: 'Line Item Purchases & Pricing', pk: '(order_id, order_item_id)', fk: 'order_id, product_id, seller_id' },
    { name: 'order_payments', rows: 103886, role: 'Payment Transactions & Tenders', pk: '(order_id, payment_sequential)', fk: 'order_id' },
    { name: 'order_reviews', rows: 99224, role: 'Customer Review Ratings & Surveys', pk: 'review_id', fk: 'order_id' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
          System Architecture & Scaling Blueprint
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Relational modeling, ERD schema topology, and 100x high-concurrency blueprints
        </p>
      </div>

      {/* Segmented Control Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md w-fit">
        <button
          onClick={() => setActiveSection('scaling')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            activeSection === 'scaling'
              ? 'bg-white text-slate-900 font-semibold shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          100x Scaling Strategy
        </button>
        <button
          onClick={() => setActiveSection('erd')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            activeSection === 'erd'
              ? 'bg-white text-slate-900 font-semibold shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Entity-Relationship Diagram (ERD)
        </button>
        <button
          onClick={() => setActiveSection('dump')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            activeSection === 'dump'
              ? 'bg-white text-slate-900 font-semibold shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Database Schema & Tables
        </button>
      </div>

      {/* 100x Scaling Strategy */}
      {activeSection === 'scaling' && (
        <div className="space-y-4">
          {/* Executive Architecture Summary */}
          <div className="bg-white border border-slate-200/80 p-4 rounded-lg space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <Zap className="w-4 h-4 text-slate-500" />
              <span>Scaling to 100x Volume (150 Million+ Records & 10k+ RPS)</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
              When scaling from 1.45M records to 150M+ records with high concurrent traffic (10,000+ RPS), a single monolithic database tier faces severe bottlenecks in lock contention, B-Tree index depth, I/O saturation, and memory limits. The architecture below guarantees sub-100ms analytical responses and 99.99% operational availability.
            </p>
          </div>

          {/* 4 Pillars of Scalability */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pillar 1 */}
            <div className="bg-white border border-slate-200/80 p-4 rounded-lg space-y-2.5">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs uppercase tracking-wider">
                <Database className="w-4 h-4 text-slate-600" />
                <span>1. Database Partitioning & Read Replicas</span>
              </div>
              <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside leading-relaxed">
                <li>
                  <strong className="text-slate-800">Range Partitioning:</strong> Partition <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">orders</code> and <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">order_items</code> by <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">YEAR(timestamp)</code> and <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">MONTH</code>. Query pruning discards non-relevant partitions.
                </li>
                <li>
                  <strong className="text-slate-800">Read/Write Splitting:</strong> 1 Primary Writer with 3 Read Replicas fronted by <strong className="text-slate-800">ProxySQL</strong>. 90% of dashboard traffic is read-only analytical queries offloaded to replicas.
                </li>
                <li>
                  <strong className="text-slate-800">Horizontal Sharding:</strong> For &gt; 500M rows, shard transactions by hash of <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">customer_id</code> across multi-node clusters.
                </li>
              </ul>
            </div>

            {/* Pillar 2 */}
            <div className="bg-white border border-slate-200/80 p-4 rounded-lg space-y-2.5">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs uppercase tracking-wider">
                <Zap className="w-4 h-4 text-slate-600" />
                <span>2. In-Memory Caching (Redis Cluster)</span>
              </div>
              <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside leading-relaxed">
                <li>
                  <strong className="text-slate-800">Revenue Rollup Caching:</strong> Pre-compute daily revenue rollups with Redis key <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">rev:daily:YYYY-MM</code> (TTL: 24h for historical months, 5m for active month), reducing DB queries by 95%.
                </li>
                <li>
                  <strong className="text-slate-800">Session & Token Blacklist:</strong> Store active JWT tokens and user roles in Redis for sub-millisecond RBAC authentication verification.
                </li>
                <li>
                  <strong className="text-slate-800">Distributed Rate Limiting:</strong> Enforce sliding-window rate limiting (100 req/min per IP) via Redis Lua scripts to safeguard the API.
                </li>
              </ul>
            </div>

            {/* Pillar 3 */}
            <div className="bg-white border border-slate-200/80 p-4 rounded-lg space-y-2.5">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs uppercase tracking-wider">
                <Layers className="w-4 h-4 text-slate-600" />
                <span>3. Analytical OLAP Offloading</span>
              </div>
              <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside leading-relaxed">
                <li>
                  <strong className="text-slate-800">Separation of OLTP and OLAP:</strong> OLTP (MySQL) handles real-time ACID transactions (CRUD, status updates). Heavy analytical queries are streamed via <strong className="text-slate-800">Debezium CDC + Kafka</strong> into <strong className="text-slate-800">ClickHouse</strong>.
                </li>
                <li>
                  <strong className="text-slate-800">Vectorized Execution:</strong> ClickHouse processes 150M row aggregations in under 80 milliseconds through columnar compression (LZ4/ZSTD) and SIMD parallelization.
                </li>
              </ul>
            </div>

            {/* Pillar 4 */}
            <div className="bg-white border border-slate-200/80 p-4 rounded-lg space-y-2.5">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs uppercase tracking-wider">
                <Server className="w-4 h-4 text-slate-600" />
                <span>4. Application Autoscaling & Pooling</span>
              </div>
              <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside leading-relaxed">
                <li>
                  <strong className="text-slate-800">Stateless Microservices:</strong> Containerized backend workers (Docker + K8s / EKS) scaling via Horizontal Pod Autoscaler (HPA) targeting CPU &gt; 70%.
                </li>
                <li>
                  <strong className="text-slate-800">Cloudflare Edge CDN:</strong> Static React SPA assets and public API payloads cached at global edge locations.
                </li>
                <li>
                  <strong className="text-slate-800">DB Connection Multiplexing:</strong> Centralized connection pooling with <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">PooledDB</code> prevents thread exhaustion under burst concurrent spikes.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ERD */}
      {activeSection === 'erd' && (
        <div className="bg-white border border-slate-200/80 p-4 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">Entity-Relationship Diagram</h3>
              <p className="text-xs text-slate-400">High-resolution relational data schema (300 DPI)</p>
            </div>
            <a
              href="/erd.png"
              download="erd.png"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PNG</span>
            </a>
          </div>

          <div className="p-2 bg-slate-50 rounded-md border border-slate-200/80 flex items-center justify-center overflow-hidden">
            <img
              src="/erd.png"
              alt="Entity Relationship Diagram"
              className="w-full max-h-[700px] object-contain rounded"
            />
          </div>
        </div>
      )}

      {/* Schema & Tables */}
      {activeSection === 'dump' && (
        <div className="bg-white border border-slate-200/80 rounded-lg overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">Database Schema Reference</h3>
            <span className="text-[11px] font-mono text-slate-400">10 Tables / Relational Constraints</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200 text-[10px]">
                <tr>
                  <th className="py-2.5 px-3.5 bg-slate-100">Table</th>
                  <th className="py-2.5 px-3.5 bg-slate-100 text-right">Rows</th>
                  <th className="py-2.5 px-3.5 bg-slate-100">Primary Key</th>
                  <th className="py-2.5 px-3.5 bg-slate-100">Foreign Keys</th>
                  <th className="py-2.5 px-3.5 bg-slate-100">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {schemaTables.map((tbl) => (
                  <tr key={tbl.name} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3.5 font-bold text-slate-900 font-mono">{tbl.name}</td>
                    <td className="py-2.5 px-3.5 text-right text-slate-600">{tbl.rows.toLocaleString()}</td>
                    <td className="py-2.5 px-3.5 text-slate-700">{tbl.pk}</td>
                    <td className="py-2.5 px-3.5 text-slate-400">{tbl.fk}</td>
                    <td className="py-2.5 px-3.5 font-sans text-slate-600">{tbl.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
