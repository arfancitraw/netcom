import React, { useState, useEffect } from 'react';
import { crudApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { formatInteger } from '../utils/formatters';
import {
  Search,
  Plus,
  Trash2,
  Edit,
  ArrowUpDown,
  RefreshCw,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { Skeleton, TableRowSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';

export default function CrudManager() {
  const { hasRole, role } = useAuth();
  const canCreate = hasRole(['admin', 'manager']);
  const canEdit = hasRole(['admin', 'manager']);
  const canDelete = hasRole(['admin']);

  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState('customers');
  const [schema, setSchema] = useState(null);
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, per_page: 25, total: 0, total_pages: 1 });
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [modalMode, setModalMode] = useState(null);
  const [activeRecord, setActiveRecord] = useState(null);
  const [formData, setFormData] = useState({});
  const [isModalSaving, setIsModalSaving] = useState(false);
  const [modalErrorMessage, setModalErrorMessage] = useState('');

  useEffect(() => {
    async function loadDatasets() {
      try {
        const response = await crudApi.getDatasets();
        if (response.data && response.data.success) {
          setDatasets(response.data.data);
        }
      } catch (error) {
        console.error('Failed to load datasets:', error);
      }
    }
    loadDatasets();
  }, []);

  useEffect(() => {
    async function loadSchemaAndData() {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const schemaResponse = await crudApi.getSchema(selectedDataset);
        if (schemaResponse.data && schemaResponse.data.success) {
          setSchema(schemaResponse.data);
          const defaultSortColumn = schemaResponse.data.primary_keys[0];
          setSortBy(defaultSortColumn);
          await loadRecords(selectedDataset, 1, pagination.per_page, '', defaultSortColumn, 'asc');
        }
      } catch (error) {
        setErrorMessage(error.response?.data?.error?.message || error.message || 'Failed to load table schema');
        setIsLoading(false);
      }
    }
    loadSchemaAndData();
  }, [selectedDataset]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && modalMode) {
        setModalMode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalMode]);

  const loadRecords = async (dataset, pageNum, perPageCount, searchQuery, sortColumn, direction) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await crudApi.listRecords(dataset, {
        page: pageNum,
        per_page: perPageCount,
        search: searchQuery,
        sort_by: sortColumn,
        sort_order: direction,
      });
      if (response.data && response.data.success) {
        setRecords(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.error?.message || error.message || 'Failed to query records');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    loadRecords(selectedDataset, 1, pagination.per_page, search, sortBy, sortOrder);
  };

  const handleSort = (columnName) => {
    const nextOrder = sortBy === columnName && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(columnName);
    setSortOrder(nextOrder);
    loadRecords(selectedDataset, pagination.page, pagination.per_page, search, columnName, nextOrder);
  };

  const openCreateModal = () => {
    const initialData = {};
    schema?.columns?.forEach((col) => {
      if (col.extra !== 'auto_increment') {
        initialData[col.name] = '';
      }
    });
    setFormData(initialData);
    setModalErrorMessage('');
    setModalMode('create');
  };

  const openEditModal = (record) => {
    setActiveRecord(record);
    setFormData({ ...record });
    setModalErrorMessage('');
    setModalMode('edit');
  };

  const openDeleteModal = (record) => {
    setActiveRecord(record);
    setModalErrorMessage('');
    setModalMode('delete');
  };

  const handleModalSubmit = async (event) => {
    event.preventDefault();
    setIsModalSaving(true);
    setModalErrorMessage('');
    try {
      if (modalMode === 'create') {
        await crudApi.createRecord(selectedDataset, formData);
      } else if (modalMode === 'edit') {
        const compositeKey = schema.primary_keys.map((keyName) => activeRecord[keyName]).join('/');
        await crudApi.updateRecord(selectedDataset, compositeKey, formData);
      } else if (modalMode === 'delete') {
        const compositeKey = schema.primary_keys.map((keyName) => activeRecord[keyName]).join('/');
        await crudApi.deleteRecord(selectedDataset, compositeKey);
      }
      setModalMode(null);
      loadRecords(selectedDataset, pagination.page, pagination.per_page, search, sortBy, sortOrder);
    } catch (error) {
      setModalErrorMessage(error.response?.data?.error?.message || error.message || 'Operation failed');
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
            Data Manager
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Schema inspection and record management across 9 database entities
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canCreate ? (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-md transition-all active:scale-[0.98] shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Create Record</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 px-2.5 py-1 bg-slate-100 rounded-md">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span>Read-Only ({role})</span>
            </div>
          )}
        </div>
      </div>

      {/* Dataset Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {datasets.map((datasetItem) => (
          <button
            key={datasetItem.slug}
            onClick={() => setSelectedDataset(datasetItem.slug)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all active:scale-[0.98] flex items-center gap-2 ${
              selectedDataset === datasetItem.slug
                ? 'bg-slate-900 text-white font-semibold shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{datasetItem.display_name}</span>
            <span
              className={`text-[10px] font-mono px-1 py-0.2 rounded font-medium ${
                selectedDataset === datasetItem.slug
                  ? 'bg-slate-800 text-slate-200'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {datasetItem.total_records > 999 ? `${(datasetItem.total_records / 1000).toFixed(0)}k` : datasetItem.total_records}
            </span>
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/80 p-2.5 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-72">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${schema?.display_name || 'records'}...`}
              aria-label="Search records"
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-md pl-8 pr-2.5 py-1 outline-none focus:bg-white focus:border-slate-400"
            />
          </div>
          <button
            type="submit"
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-md transition-colors shrink-0"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>Rows:</span>
          <select
            value={pagination.per_page}
            onChange={(event) => {
              const perPageValue = Number(event.target.value);
              setPagination((prevPagination) => ({ ...prevPagination, per_page: perPageValue, page: 1 }));
              loadRecords(selectedDataset, 1, perPageValue, search, sortBy, sortOrder);
            }}
            aria-label="Records per page"
            className="bg-white border border-slate-200 text-slate-800 text-xs rounded px-2 py-0.5 outline-none"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <button
            onClick={() => loadRecords(selectedDataset, pagination.page, pagination.per_page, search, sortBy, sortOrder)}
            className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-500 hover:text-slate-800"
            title="Refresh"
            aria-label="Refresh dataset records"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200/80 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[550px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold sticky top-0 border-b border-slate-200 z-10 text-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <tr>
                {schema?.columns?.map((column) => (
                  <th
                    key={column.name}
                    onClick={() => handleSort(column.name)}
                    className="py-2.5 px-3.5 bg-slate-100 cursor-pointer hover:text-slate-900 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{column.name}</span>
                      {column.is_primary_key && (
                        <span className="text-[9px] px-1 bg-slate-200 text-slate-800 rounded font-mono font-bold">
                          PK
                        </span>
                      )}
                      <ArrowUpDown className="w-3 h-3 text-slate-400" aria-hidden="true" />
                    </div>
                  </th>
                ))}
                <th className="py-2.5 px-3.5 text-center sticky right-0 bg-slate-100 border-l border-slate-200 z-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {isLoading ? (
                <TableRowSkeleton columns={schema?.columns?.length ? schema.columns.length + 1 : 8} rows={10} />
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={schema?.columns?.length ? schema.columns.length + 1 : 8} className="p-0">
                    <EmptyState
                      title={`No ${schema?.display_name || 'records'} found`}
                      description={
                        search
                          ? `No records match search "${search}" in ${schema?.display_name}.`
                          : `The ${schema?.display_name} dataset is currently empty.`
                      }
                      actionLabel="Clear Search"
                      onAction={search ? () => {
                        setSearch('');
                        loadRecords(selectedDataset, 1, pagination.per_page, '', sortBy, sortOrder);
                      } : null}
                    />
                  </td>
                </tr>
              ) : (
                records.map((record, recordIndex) => (
                  <tr key={recordIndex} className="hover:bg-slate-50/80 transition-colors">
                    {schema?.columns?.map((column) => (
                      <td key={column.name} className="py-2 px-3.5 max-w-xs truncate text-slate-700">
                        {record[column.name] !== null && record[column.name] !== undefined ? String(record[column.name]) : (
                          <span className="text-slate-300 italic">null</span>
                        )}
                      </td>
                    ))}
                    <td className="py-2 px-3.5 text-center sticky right-0 bg-white border-l border-slate-200">
                      <div className="flex items-center justify-center gap-1">
                        {canEdit && (
                          <button
                            onClick={() => openEditModal(record)}
                            className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded transition-colors"
                            title="Edit Record"
                            aria-label="Edit record"
                          >
                            <Edit className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => openDeleteModal(record)}
                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Delete Record"
                            aria-label="Delete record"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                        {!canEdit && !canDelete && (
                          <span className="text-[10px] text-slate-400">View</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-mono text-slate-900 font-medium">{records.length}</span> of{' '}
            <span className="font-mono text-slate-900 font-medium">{formatInteger(pagination.total)}</span> records
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => loadRecords(selectedDataset, Math.max(1, pagination.page - 1), pagination.per_page, search, sortBy, sortOrder)}
              disabled={pagination.page <= 1}
              className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 text-slate-600 transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <span className="font-mono px-2 text-slate-500">
              {pagination.page} / {pagination.total_pages || 1}
            </span>
            <button
              onClick={() => loadRecords(selectedDataset, Math.min(pagination.total_pages, pagination.page + 1), pagination.per_page, search, sortBy, sortOrder)}
              disabled={pagination.page >= pagination.total_pages}
              className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 text-slate-600 transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Dialog */}
      {modalMode && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          onClick={() => setModalMode(null)}
          aria-hidden="true"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="bg-white border border-slate-200 rounded-lg max-w-lg w-full p-4 shadow-lg space-y-3 max-h-[90vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
            aria-hidden="false"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 id="modal-title" className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                {modalMode === 'create' && `Create in ${schema?.display_name}`}
                {modalMode === 'edit' && `Edit in ${schema?.display_name}`}
                {modalMode === 'delete' && 'Confirm Record Deletion'}
              </h3>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                aria-label="Close dialog"
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {modalErrorMessage && (
              <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded">
                {modalErrorMessage}
              </div>
            )}

            {modalMode === 'delete' ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 text-rose-600 text-xs bg-rose-50/70 p-3 rounded border border-rose-100">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    Are you sure you want to permanently delete this record? This action cannot be undone.
                  </div>
                </div>
                <div className="font-mono text-xs bg-slate-50 p-2.5 rounded border border-slate-100 text-slate-700 space-y-0.5">
                  {schema?.primary_keys?.map((pkKey) => (
                    <div key={pkKey}>
                      <span className="font-semibold">{pkKey}:</span> {activeRecord[pkKey]}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-600 text-xs rounded border border-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleModalSubmit}
                    disabled={isModalSaving}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded disabled:opacity-50"
                  >
                    {isModalSaving ? 'Deleting...' : 'Delete Permanently'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleModalSubmit} className="space-y-3">
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {schema?.columns?.map((column) => {
                    const isPk = column.is_primary_key;
                    const isAuto = column.extra === 'auto_increment';
                    const isReadOnly = (modalMode === 'edit' && isPk) || isAuto;
                    return (
                      <div key={column.name} className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                          <span>{column.name}</span>
                          <span className="font-mono font-normal text-slate-400">{column.data_type}</span>
                        </label>
                        <input
                          type="text"
                          value={formData[column.name] !== undefined ? formData[column.name] : ''}
                          disabled={isReadOnly}
                          onChange={(event) =>
                            setFormData({ ...formData, [column.name]: event.target.value })
                          }
                          className={`w-full text-xs rounded px-2.5 py-1.5 outline-none font-mono ${
                            isReadOnly
                              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                              : 'bg-white border border-slate-200 text-slate-900 focus:border-slate-400'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-600 text-xs rounded border border-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isModalSaving}
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded disabled:opacity-50"
                  >
                    {isModalSaving ? 'Saving...' : modalMode === 'create' ? 'Create' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
