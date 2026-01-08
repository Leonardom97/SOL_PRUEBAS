import { useState } from 'react';
import { Search, FileDown, ArrowLeft } from 'lucide-react';
import { basculaService, type Pesada } from './services/basculaService';
import { Link } from 'react-router-dom';

export default function BasculaReportes() {
    const [startDate, setStartDate] = useState(getSevenDaysAgo());
    const [endDate, setEndDate] = useState(getToday());
    const [data, setData] = useState<Pesada[]>([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ totalContext: 0, totalWeight: 0 });

    function getToday() {
        return new Date().toISOString().split('T')[0];
    }

    function getSevenDaysAgo() {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().split('T')[0];
    }

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await basculaService.getReports(startDate, endDate);
            setData(result);

            // Calc stats
            const weight = result.reduce((acc: number, curr: any) => acc + (parseFloat(curr.Peso_neto) || 0), 0);
            setStats({
                totalContext: result.length,
                totalWeight: weight
            });

        } catch (error) {
            console.error(error);
            alert('Error al cargar reporte');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <Link to="/bascula" className="inline-flex items-center gap-1 text-gray-500 hover:text-blue-600 mb-2 transition-colors">
                    <ArrowLeft size={16} /> Volver a Operación
                </Link>
                <h1 className="text-2xl font-bold text-gray-800">Reportes de Pesaje</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha Inicio</label>
                        <input
                            type="date"
                            required
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha Fin</label>
                        <input
                            type="date"
                            required
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                        />
                    </div>
                    <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-2">
                        <Search size={16} /> Buscar
                    </button>
                    <button type="button" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm flex items-center gap-2 ml-auto">
                        <FileDown size={16} /> Exportar
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="text-gray-500 text-xs font-bold uppercase">Total Pesadas</div>
                    <div className="text-2xl font-bold text-gray-800 mt-1">{stats.totalContext}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="text-gray-500 text-xs font-bold uppercase">Peso Total (kg)</div>
                    <div className="text-2xl font-bold text-blue-600 mt-1">{new Intl.NumberFormat().format(stats.totalWeight)}</div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3">Código</th>
                                <th className="px-4 py-3">Entrada</th>
                                <th className="px-4 py-3">Salida</th>
                                <th className="px-4 py-3">Placa</th>
                                <th className="px-4 py-3">Conductor</th>
                                <th className="px-4 py-3">Producto</th>
                                <th className="px-4 py-3 text-right">Bruto</th>
                                <th className="px-4 py-3 text-right">Tara</th>
                                <th className="px-4 py-3 text-right">Neto</th>
                                <th className="px-4 py-3">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.map((row: any) => (
                                <tr key={row.Codigo} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">{row.Codigo}</td>
                                    <td className="px-4 py-3">{row.Fecha_entrada}</td>
                                    <td className="px-4 py-3">{row.Fecha_salida || '-'}</td>
                                    <td className="px-4 py-3 font-bold">{row.Placa}</td>
                                    <td className="px-4 py-3">{row.Conductor}</td>
                                    <td className="px-4 py-3">{row.Producto}</td>
                                    <td className="px-4 py-3 text-right">{row.Peso_bruto}</td>
                                    <td className="px-4 py-3 text-right">{row.Peso_tara}</td>
                                    <td className="px-4 py-3 text-right font-bold">{row.Peso_neto}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs ${row.Estado === 'Finalizado' || row.Estado === 'Cerrado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {row.Estado}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                                        No se encontraron datos
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
