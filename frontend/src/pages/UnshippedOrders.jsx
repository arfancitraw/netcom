import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  formatCurrency,
  formatInteger,
  formatDateTimeString,
  formatDateString,
} from '../utils/formatters';
import {
  Search,
  Truck,
  RefreshCw,
  X,
} from 'lucide-react';
import { Skeleton, TableRowSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';

const STATUS_PILL_STYLES = {
  invoiced: 'bg-blue-50 text-blue-700 border-blue-200',
  processing: 'bg-amber-50 text-amber-700 border-amber-200',
  unavailable: 'bg-slate-100 text-slate-700 border-slate-200',
  created: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function UnshippedOrders() {
  const { hasRole } = useAuth();
  const canEdit = hasRole(['admin', 'manager']);

  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({});
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total_records: 0, total_pages: 1 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('order_purchase_timestamp');
  const [sortOrder, setSortOrder] = useState('asc');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('shipped');
  const [isModalSaving, setIsModalSaving] = useState(false);
  const [modalErrorMessage, setModalErrorMessage] = useState('');

  const fetchUnshippedOrders = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await analyticsApi.getUnshippedOrders({
        page: pagination.page,
        page_size: pagination.page_size,
        status: statusFilter,
        search: searchQuery,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (response.data && response.data.success) {
        setOrders(response.data.orders);
        setSummary(response.data.summary);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.error?.message || error.message || 'Failed to query unshipped orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnshippedOrders();
  }, [pagination.page, statusFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPagination((prevPagination) => ({ ...prevPagination, page: 1 }));
    fetchUnshippedOrders();
  };

  const handleUpdateStatus = async (event) => {
    event.preventDefault();
    if (!selectedOrder) return;
    setIsModalSaving(true);
    setModalErrorMessage('');
    try {
      const response = await analyticsApi.updateOrderStatus(selectedOrder.order_id, newStatus);
      if (response.data && response.data.success) {
        setSelectedOrder(null);
        await fetchUnshippedOrders();
      }
    } catch (error) {
      setModalErrorMessage(error.response?.data?.error?.message || error.message || 'Failed to update order status');
    } finally {
      setIsModalSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
            Fulfillment Queue
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pending carrier handover and SLA urgency tracking
          </p>
        </div>

        <button
          onClick={fetchUnshippedOrders}
          aria-label="Refresh unshipped orders queue"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-md border border-slate-200 transition-all active:scale-[0.98] shadow-xs self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Integrated Stats Strip */}
      <div className="bg-white border border-slate-200/80 rounded-lg grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        <div className="p-3.5">
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Unshipped Total</div>
          <div className="text-base font-bold font-mono text-rose-600 mt-0.5">
            {formatInteger(summary.total_unshipped)}
          </div>
          <div className="text-[10px] text-slate-400">Backlog queue</div>
        </div>

        <div className="p-3.5">
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Invoiced (Ready)</div>
          <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
            {formatInteger(summary.status_breakdown?.invoiced)}
          </div>
          <div className="text-[10px] text-slate-400">Carrier dispatch ready</div>
        </div>

        <div className="p-3.5">
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">In Processing</div>
          <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
            {formatInteger(summary.status_breakdown?.processing)}
          </div>
          <div className="text-[10px] text-slate-400">Warehouse packaging</div>
        </div>

        <div className="p-3.5">
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Unavailable</div>
          <div className="text-base font-bold font-mono text-slate-600 mt-0.5">
            {formatInteger(summary.status_breakdown?.unavailable)}
          </div>
          <div className="text-[10px] text-slate-400">Stock exceptions</div>
        </div>

        <div className="p-3.5 col-span-2 md:col-span-4 lg:col-span-1">
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Early Stage</div>
          <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
            {formatInteger((summary.status_breakdown?.created || 0) + (summary.status_breakdown?.approved || 0))}
          </div>
          <div className="text-[10px] text-slate-400">Created / Approved</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/80 p-2.5 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status filter tabs */}
        <div className="flex flex-wrap items-center bg-slate-100 rounded-md p-0.5 text-xs">
          {['all', 'invoiced', 'processing', 'unavailable', 'created', 'approved'].map((statusKey) => (
            <button
              key={statusKey}
              onClick={() => {
                setStatusFilter(statusKey);
                setPagination((prevPagination) => ({ ...prevPagination, page: 1 }));
              }}
              className={`px-2.5 py-1 rounded capitalize transition-all active:scale-[0.98] text-xs ${
                statusFilter === statusKey
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {statusKey}
            </button>
          ))}
        </div>

        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative w-full md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search order or city..."
              aria-label="Search unshipped orders"
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-md pl-8 pr-2.5 py-1 outline-none focus:bg-white focus:border-slate-400"
            />
          </div>
          <button
            type="submit"
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-md transition-all active:scale-[0.98] shrink-0"
          >
            Search
          </button>
        </form>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200/80 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200 text-[10px]">
              <tr>
                <th className="py-2.5 px-3.5 bg-slate-100">Order</th>
                <th className="py-2.5 px-3.5 bg-slate-100">Purchase Date</th>
                <th className="py-2.5 px-3.5 bg-slate-100">Est. Delivery</th>
                <th className="py-2.5 px-3.5 bg-slate-100">Destination</th>
                <th className="py-2.5 px-3.5 bg-slate-100 text-right">Items</th>
                <th className="py-2.5 px-3.5 bg-slate-100 text-right">Total (R$)</th>
                <th className="py-2.5 px-3.5 bg-slate-100 text-center">Status</th>
                <th className="py-2.5 px-3.5 bg-slate-100 text-center">SLA</th>
                <th className="py-2.5 px-3.5 bg-slate-100 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {isLoading ? (
                <TableRowSkeleton columns={9} rows={8} />
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-0">
                    <EmptyState
                      title="No unshipped orders found"
                      description={
                        searchQuery
                          ? `No orders matching "${searchQuery}" with status "${statusFilter}".`
                          : `No orders currently queued under status "${statusFilter}".`
                      }
                      actionLabel="Reset to All Orders"
                      onAction={() => {
                        setStatusFilter('all');
                        setSearchQuery('');
                        setPagination((prev) => ({ ...prev, page: 1 }));
                      }}
                    />
                  </td>
                </tr>
              ) : (
                orders.map((orderRecord) => (
                  <tr key={orderRecord.order_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-3.5">
                      <div className="text-slate-900 font-semibold">{orderRecord.order_id.substring(0, 8)}...</div>
                      <div className="text-[10px] text-slate-400">c:{orderRecord.customer_id.substring(0, 6)}...</div>
                    </td>
                    <td className="py-2 px-3.5 text-slate-600">
                      {formatDateTimeString(orderRecord.purchase_timestamp)}
                    </td>
                    <td className="py-2 px-3.5 text-slate-400">
                      {formatDateString(orderRecord.estimated_delivery)}
                    </td>
                    <td className="py-2 px-3.5 font-sans text-slate-700">
                      <span className="capitalize">{orderRecord.customer_city}</span>, <span className="font-mono text-slate-400">{orderRecord.customer_state}</span>
                    </td>
                    <td className="py-2 px-3.5 text-right text-slate-600">{formatInteger(orderRecord.item_count)}</td>
                    <td className="py-2 px-3.5 text-right text-slate-900 font-medium">
                      {formatCurrency(orderRecord.total_value, '')}
                    </td>
                    <td className="py-2 px-3.5 text-center">
                      <span
                        className={`text-[9px] uppercase font-mono px-1.5 py-0.2 rounded font-medium ${
                          STATUS_PILL_STYLES[orderRecord.order_status] || 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {orderRecord.order_status}
                      </span>
                    </td>
                    <td className="py-2 px-3.5 text-center font-sans">
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                          orderRecord.sla_status === 'Urgent'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {orderRecord.sla_status}
                      </span>
                    </td>
                    <td className="py-2 px-3.5 text-center">
                      {canEdit ? (
                        <button
                          onClick={() => {
                            setSelectedOrder(orderRecord);
                            setNewStatus(orderRecord.order_status === 'invoiced' ? 'shipped' : 'invoiced');
                            setModalErrorMessage('');
                          }}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-[11px] font-sans font-medium transition-colors"
                        >
                          Update
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-sans">Read-Only</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <strong className="font-mono text-slate-900">{orders.length}</strong> of{' '}
            <strong className="font-mono text-slate-900">{formatInteger(pagination.total_records)}</strong> orders
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPagination((prevPagination) => ({ ...prevPagination, page: Math.max(1, prevPagination.page - 1) }))}
              disabled={pagination.page <= 1}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded text-xs disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="font-mono px-2 text-slate-500">
              {pagination.page} / {pagination.total_pages || 1}
            </span>
            <button
              onClick={() => setPagination((prevPagination) => ({ ...prevPagination, page: Math.min(prevPagination.total_pages, prevPagination.page + 1) }))}
              disabled={pagination.page >= pagination.total_pages}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded text-xs disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Update Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedOrder(null)}
          aria-hidden="true"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="unshipped-modal-title"
            className="bg-white border border-slate-200 rounded-lg max-w-sm w-full p-4 shadow-lg space-y-3"
            onClick={(event) => event.stopPropagation()}
            aria-hidden="false"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs">
                <Truck className="w-3.5 h-3.5 text-slate-700" aria-hidden="true" />
                <h3 id="unshipped-modal-title">Update Order Status</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close dialog"
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            {modalErrorMessage && (
              <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded">
                {modalErrorMessage}
              </div>
            )}

            <div className="text-xs text-slate-600 space-y-0.5 font-mono bg-slate-50 p-2.5 rounded border border-slate-100">
              <div>Order: <span className="text-slate-900 font-semibold">{selectedOrder.order_id}</span></div>
              <div>Current: <span className="text-amber-700 font-bold uppercase">{selectedOrder.order_status}</span></div>
              <div>City: {selectedOrder.customer_city}, {selectedOrder.customer_state}</div>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(event) => setNewStatus(event.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 text-xs rounded px-2.5 py-1.5 outline-none font-mono"
                >
                  <option value="processing">processing</option>
                  <option value="invoiced">invoiced</option>
                  <option value="shipped">shipped (Set Carrier Handover)</option>
                  <option value="delivered">delivered</option>
                  <option value="unavailable">unavailable</option>
                  <option value="canceled">canceled</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-600 text-xs rounded border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isModalSaving}
                  className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded disabled:opacity-50"
                >
                  {isModalSaving ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
