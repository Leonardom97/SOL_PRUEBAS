import { useState, useEffect, useCallback } from 'react';
import {
    ChevronLeft, ChevronRight, Filter, Plus,
    Edit, Eye, Lock, CheckCircle, XCircle
} from 'lucide-react';
import api from '../../../services/api';

export interface ColumnDef {
    key: string;
    label: string;
    sortable?: boolean;
    filterable?: boolean;
    type?: 'text' | 'date' | 'number' | 'status' | 'boolean';
}

interface AgronomiaTableProps {
    title: string;
    apiEndpoint: string;
    columns: ColumnDef[];
    onEdit?: (id: string | number) => void;
    onEditItem?: (item: any) => void;
    onView?: (id: string | number) => void;
    onCreate?: () => void;
    canCreate?: boolean;
    canEdit?: boolean;
    extraActions?: (row: any) => React.ReactNode;
}

const AgronomiaTable = ({
    title,
    apiEndpoint,
    columns,
    onEdit,
    onEditItem,
    onView,
    onCreate,
    canCreate = false,
    canEdit = false,
    extraActions
}: AgronomiaTableProps) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(25);
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [sortCol, setSortCol] = useState<string | null>(null);
    const [sortAsc, setSortAsc] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Build query params
            const params = new URLSearchParams();
            params.append('action', 'list');
            params.append('page', page.toString());
            params.append('pageSize', pageSize.toString());

            if (sortCol) {
                params.append('ordenColumna', sortCol);
                params.append('ordenAsc', sortAsc ? '1' : '0');
            }

            Object.entries(filters).forEach(([key, val]) => {
                if (val) params.append(`filtro_${key}`, val);
            });

            // Handle API variability (some might use slightly different query params, adjust as needed)
            const res = await api.get(`${apiEndpoint}?${params.toString()}`);

            let fetchedData = [];
            let fetchedTotal = 0;

            if (res.data && Array.isArray(res.data)) {
                fetchedData = res.data;
                fetchedTotal = res.data.length;
            } else if (res.data && res.data.datos) {
                fetchedData = res.data.datos;
                fetchedTotal = res.data.total || res.data.datos.length;
            } else if (res.data && res.data.data) {
                fetchedData = res.data.data;
                fetchedTotal = res.data.total || res.data.data.length;
            }

            setData(fetchedData);
            setTotal(fetchedTotal);
        } catch (error) {
            console.error("Error fetching data:", error);
            // alert("Error cargando datos");
        } finally {
            setLoading(false);
        }
    }, [apiEndpoint, page, pageSize, sortCol, sortAsc, filters]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1); // Reset to page 1 on filter
    };

    const handleSort = (key: string) => {
        if (sortCol === key) {
            setSortAsc(!sortAsc);
        } else {
            setSortCol(key);
            setSortAsc(true);
        }
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full animate-fade-in-up">
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
                <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                    {title}
                    <span className="text-sm font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">{total}</span>
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadData}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Recargar"
                    >
                        <Filter size={18} />
                    </button>
                    {canCreate && (
                        <button
                            onClick={onCreate}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium shadow-sm transition-all hover:shadow-md"
                        >
                            <Plus size={16} /> Nuevo
                        </button>
                    )}
                </div>
            </div>

            {/* Table Container */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-600 font-semibold sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-4 py-3 w-10 text-center">
                                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            </th>
                            {columns.map(col => (
                                <th key={col.key} className="px-4 py-3 min-w-[150px]">
                                    <div className="flex flex-col gap-1">
                                        <div
                                            className={`flex items-center gap-1 cursor-pointer hover:text-blue-600 ${sortCol === col.key ? 'text-blue-600' : ''}`}
                                            onClick={() => col.sortable !== false && handleSort(col.key)}
                                        >
                                            {col.label}
                                            {col.sortable !== false && (
                                                <div className="w-4 h-4 flex flex-col justify-center opacity-30 hover:opacity-100">
                                                    <div className={`h-0.5 w-full bg-current mb-0.5 ${sortCol === col.key && sortAsc ? 'bg-blue-600' : ''}`}></div>
                                                    <div className={`h-0.5 w-full bg-current ${sortCol === col.key && !sortAsc ? 'bg-blue-600' : ''}`}></div>
                                                </div>
                                            )}
                                        </div>
                                        {col.filterable !== false && (
                                            <input
                                                type="text"
                                                placeholder="..."
                                                className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:border-blue-400 focus:outline-none"
                                                onChange={(e) => {
                                                    // Debounce could be added here
                                                    handleFilterChange(col.key, e.target.value);
                                                }}
                                            />
                                        )}
                                    </div>
                                </th>
                            ))}
                            <th className="px-4 py-3 sticky right-0 bg-gray-50 shadow-l">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr>
                                <td colSpan={columns.length + 2} className="px-6 py-10 text-center text-gray-500">
                                    Cargando datos...
                                </td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + 2} className="px-6 py-10 text-center text-gray-500">
                                    No se encontraron registros
                                </td>
                            </tr>
                        ) : data.map((row, idx) => (
                            <tr key={idx} className="hover:bg-blue-50/50 transition-colors group">
                                <td className="px-4 py-3 text-center">
                                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                </td>
                                {columns.map(col => (
                                    <td key={col.key} className="px-4 py-3">
                                        {col.key === 'supervision' ? (
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${row[col.key] === 'aprobado' ? 'bg-green-100 text-green-700' :
                                                row[col.key] === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                {row[col.key] === 'aprobado' ? <CheckCircle size={12} /> :
                                                    row[col.key] === 'pendiente' ? <Lock size={12} /> : <XCircle size={12} />}
                                                {row[col.key]}
                                            </span>
                                        ) : (
                                            <span className="text-gray-700 truncate block max-w-[200px]" title={String(row[col.key] || '')}>
                                                {row[col.key]}
                                            </span>
                                        )}
                                    </td>
                                ))}
                                <td className="px-4 py-3 sticky right-0 bg-white group-hover:bg-blue-50/50 shadow-l flex items-center gap-2">
                                    {canEdit && (onEdit || onEditItem) && (
                                        <button
                                            onClick={() => {
                                                if (onEditItem) onEditItem(row);
                                                else if (onEdit) onEdit(row.id || row[Object.keys(row)[0]]);
                                            }}
                                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg"
                                            title="Editar"
                                            aria-label="Editar"
                                        >
                                            <Edit size={16} />
                                        </button>
                                    )}
                                    {onView && (
                                        <button onClick={() => onView(row.id)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg" title="Ver Detalles" aria-label="Ver Detalles">
                                            <Eye size={16} />
                                        </button>
                                    )}
                                    {extraActions && extraActions(row)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-lg flex justify-between items-center text-sm">
                <div className="text-gray-500">
                    Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, total)} de {total}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="px-2 font-medium text-gray-700">Página {page} de {totalPages || 1}</span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages || totalPages === 0}
                        className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AgronomiaTable;
