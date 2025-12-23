import React, { useState, useEffect } from 'react';
import { Users, Search } from 'lucide-react';
import { adminService } from './services/adminService';

const AdminColaboradores: React.FC = () => {
    const [colaboradores, setColaboradores] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [error, setError] = useState<string | null>(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const LIMIT = 10;

    useEffect(() => {
        fetchColaboradores();
    }, [page, searchTerm]);

    const fetchColaboradores = async () => {
        setLoading(true);
        setError(null);
        try {
            // Note: service needs to support pagination params if not already
            // Just fetching all for now or relying on service default
            console.log("Fetching collaborators...");
            const data = await adminService.getColaboradores();
            console.log("Collaborators data received:", data);

            if (data && Array.isArray(data.data)) {
                setColaboradores(data.data);
                setTotalPages(Math.ceil((data.total || 0) / LIMIT));
            } else {
                console.error("Invalid collaborators data:", data);
                setError("Formato de datos inválido.");
            }
        } catch (error: any) {
            console.error("Error loading collaborators", error);
            setError(error.message || "Error al cargar colaboradores.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Users className="w-8 h-8 text-indigo-600" />
                    Gestión de Colaboradores
                </h1>
                {/* Add button if needed, reading mode for now as per API analysis mainly showing list */}
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-100 p-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o cédula..."
                        className="pl-10 pr-4 py-2 border rounded w-full md:w-1/3 text-sm focus:ring-2 focus:ring-indigo-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                {error && (
                    <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                        Error: {error}
                    </div>
                )}
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                        <tr>
                            <th className="px-4 py-3">Cédula</th>
                            <th className="px-4 py-3">Nombre Completo</th>
                            <th className="px-4 py-3">Empresa</th>
                            <th className="px-4 py-3">Cargo</th>
                            <th className="px-4 py-3">Área</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-8 text-gray-500">Cargando...</td></tr>
                        ) : colaboradores.length > 0 ? colaboradores.map((c: any) => (
                            <tr key={c.ac_id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-900">{c.ac_cedula}</td>
                                <td className="px-4 py-3">{c.ac_nombre1} {c.ac_apellido1}</td>
                                <td className="px-4 py-3">{c.emp_nombre}</td>
                                <td className="px-4 py-3">{c.cargo}</td>
                                <td className="px-4 py-3">{c.area}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={5} className="text-center py-8 text-gray-500">No se encontraron colaboradores</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
                <span>Página {page} de {totalPages}</span>
                <div className="flex gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                        Anterior
                    </button>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                        Siguiente
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminColaboradores;
