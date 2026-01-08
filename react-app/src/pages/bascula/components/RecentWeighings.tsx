import { useEffect, useState } from 'react';
import { Clock, CheckCircle, Truck, RefreshCw } from 'lucide-react';
import { basculaService, type Pesada } from '../services/basculaService';

export default function RecentWeighings({ refreshTrigger }: { refreshTrigger: number }) {
    const [pesadas, setPesadas] = useState<Pesada[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [refreshTrigger]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await basculaService.getRecentWeighings();
            setPesadas(data || []);
        } catch (error) {
            console.error('Error loading weighings', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Truck size={18} className="text-blue-600" />
                    Pesadas del Día
                </h3>
                <button onClick={loadData} className="text-gray-500 hover:text-blue-600 transition-colors" aria-label="Actualizar Pesadas">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="overflow-auto flex-1">
                {pesadas.length === 0 && !loading ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                        <Truck size={32} strokeWidth={1.5} className="mb-2 opacity-50" />
                        <p className="text-sm">No hay registros hoy</p>
                    </div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3">Código</th>
                                <th className="px-4 py-3">Placa</th>
                                <th className="px-4 py-3">Producto</th>
                                <th className="px-4 py-3 text-right">Neto</th>
                                <th className="px-4 py-3 text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {pesadas.map((item) => (
                                <tr key={item.codigo} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-gray-600">{item.codigo}</td>
                                    <td className="px-4 py-3 font-bold text-gray-800">{item.placa}</td>
                                    <td className="px-4 py-3 text-gray-600 truncate max-w-[150px]">{item.producto || '-'}</td>
                                    <td className="px-4 py-3 text-right font-mono">{item.peso_neto} kg</td>
                                    <td className="px-4 py-3 text-center">
                                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${(item.Estado === 'Activo' || item.estado === 'Activo')
                                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                                            : 'bg-green-50 text-green-700 border-green-200'
                                            }`}>
                                            {(item.Estado === 'Activo' || item.estado === 'Activo') ? (
                                                <><Clock size={12} /> Activo</>
                                            ) : (
                                                <><CheckCircle size={12} /> Cerrado</>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
