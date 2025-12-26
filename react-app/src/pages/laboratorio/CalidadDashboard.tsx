import React, { useState, useEffect } from 'react';
import { Plus, Filter, FlaskConical } from 'lucide-react';
import { laboratorioService } from './services/laboratorioService';
import { type Tanque } from './types';
import CalidadWizard from './components/CalidadWizard';

const CalidadDashboard: React.FC = () => {
    const [mediciones, setMediciones] = useState<any[]>([]);
    const [tanques, setTanques] = useState<Tanque[]>([]);
    const [loading, setLoading] = useState(true);
    const [showWizard, setShowWizard] = useState(false);

    // Filters
    const [filterTanque, setFilterTanque] = useState('');
    const [filterTipo, setFilterTipo] = useState('');
    const [filterFechaDesde, setFilterFechaDesde] = useState('');
    const [filterFechaHasta, setFilterFechaHasta] = useState('');

    useEffect(() => {
        loadInitialData();
        loadMediciones();
    }, []);

    const loadInitialData = async () => {
        try {
            const t = await laboratorioService.getTanques();
            setTanques(t);
        } catch (e) {
            console.error(e);
        }
    };

    const loadMediciones = async () => {
        setLoading(true);
        try {
            const data = await laboratorioService.getAllMediciones({
                id_tanque: filterTanque,
                tipo: filterTipo,
                fecha_desde: filterFechaDesde,
                fecha_hasta: filterFechaHasta
            });

            // Transform data as seen in JS (it returns { acidez: [], humidity: [], yodo: [] })
            // We need to flatten it
            let all: any[] = [];
            if (data.acidez) all = [...all, ...data.acidez.map((m: any) => ({ ...m, tipo: 'acidez', valor: m.porcentaje_agl || m.valor }))];
            if (data.humedad) all = [...all, ...data.humedad.map((m: any) => ({ ...m, tipo: 'humedad', valor: m.porcentaje_humedad || m.valor }))];
            if (data.yodo) all = [...all, ...data.yodo.map((m: any) => ({ ...m, tipo: 'yodo', valor: m.indice_yodo || m.valor }))];

            // Sort by date desc
            all.sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime());

            setMediciones(all);
        } catch (error) {
            console.error('Error loading history', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        loadMediciones();
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                        <FlaskConical size={24} />
                    </div>
                    Control de Calidad
                </h1>
                <button
                    onClick={() => setShowWizard(true)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2 shadow-sm transition-colors"
                >
                    <Plus size={20} />
                    Nueva Medición
                </button>
            </div>

            {/* Filters */}
            <form onSubmit={handleFilterSubmit} className="bg-white p-4 rounded-lg shadow-sm mb-6 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanque</label>
                    <select
                        className="w-full border rounded px-3 py-2"
                        value={filterTanque}
                        onChange={(e) => setFilterTanque(e.target.value)}
                    >
                        <option value="">Todos</option>
                        {tanques.map(t => <option key={t.id} value={t.id}>{t.numero_tanque}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select
                        className="w-full border rounded px-3 py-2"
                        value={filterTipo}
                        onChange={(e) => setFilterTipo(e.target.value)}
                    >
                        <option value="">Todos</option>
                        <option value="acidez">Acidez</option>
                        <option value="humedad">Humedad</option>
                        <option value="yodo">Yodo</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                    <input type="date" className="w-full border rounded px-3 py-2" value={filterFechaDesde} onChange={(e) => setFilterFechaDesde(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                    <input type="date" className="w-full border rounded px-3 py-2" value={filterFechaHasta} onChange={(e) => setFilterFechaHasta(e.target.value)} />
                </div>
                <button type="submit" className="bg-gray-100 text-gray-700 px-4 py-2 rounded border hover:bg-gray-200 flex items-center justify-center gap-2">
                    <Filter size={18} /> Filtrar
                </button>
            </form>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                        <tr>
                            <th className="px-4 py-3">Fecha/Hora</th>
                            <th className="px-4 py-3">Tanque</th>
                            <th className="px-4 py-3">Tipo</th>
                            <th className="px-4 py-3">Valor</th>
                            <th className="px-4 py-3">Método</th>
                            <th className="px-4 py-3">Origen</th>
                            <th className="px-4 py-3">Realizado Por</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Cargando...</td></tr>
                        ) : mediciones.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No hay mediciones encontradas</td></tr>
                        ) : (
                            mediciones.map((m, idx) => {
                                const tanque = tanques.find(t => t.id == m.id_tanque);
                                return (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">{m.fecha_hora}</td>
                                        <td className="px-4 py-3 font-medium">{tanque?.numero_tanque || m.id_tanque}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold
                                                ${m.tipo === 'acidez' ? 'bg-green-100 text-green-800' :
                                                    m.tipo === 'humedad' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}
                                            `}>
                                                {m.tipo.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-bold text-gray-900">{parseFloat(m.valor).toFixed(4)}</td>
                                        <td className="px-4 py-3 text-gray-500">{m.tipo_medida}</td>
                                        <td className="px-4 py-3 capitalize">{m.tipo_origen || 'Tanque'}</td>
                                        <td className="px-4 py-3 text-gray-600">{m.nombre_colaborador || '-'}</td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <CalidadWizard
                isOpen={showWizard}
                onClose={() => setShowWizard(false)}
                onSuccess={() => {
                    loadMediciones();
                    setShowWizard(false);
                }}
            />
        </div>
    );
};

export default CalidadDashboard;
