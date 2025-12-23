import { useState, useEffect } from 'react';
import { Search, LogIn, LogOut, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import api from '../../services/api';

interface Vehicle {
    placa: string;
    tipo_vehiculo: string;
    empresa?: string;
    ubicacion_actual?: 'en_planta' | 'fuera';
    soat_fecha_vencimiento: string;
    tecnomecanica_fecha_vencimiento: string;
    poliza_terceros_fecha_vencimiento: string;
    updated_at: string;
}

interface ValidationResult {
    exists: boolean;
    data?: Vehicle;
    message?: string;
}

const AccessControl = () => {
    const [vehiclesInPlant, setVehiclesInPlant] = useState<Vehicle[]>([]);
    const [loadingList, setLoadingList] = useState(false);

    // Ingreso State
    const [ingresoPlaca, setIngresoPlaca] = useState('');
    const [ingresoResult, setIngresoResult] = useState<ValidationResult | null>(null);
    const [loadingIngreso, setLoadingIngreso] = useState(false);

    // Salida State
    const [salidaPlaca, setSalidaPlaca] = useState('');
    const [salidaResult, setSalidaResult] = useState<ValidationResult | null>(null);
    const [loadingSalida, setLoadingSalida] = useState(false);

    useEffect(() => {
        loadVehicles();
    }, []);

    const loadVehicles = async () => {
        setLoadingList(true);
        try {
            const res = await api.get('/m_porteria/assets/php/porteria_api.php?action=get_vehiculos');
            // Filter locally for now effectively matching existing JS logic
            const inPlant = res.data.data.filter((v: Vehicle) => v.ubicacion_actual === 'en_planta');
            setVehiclesInPlant(inPlant);
        } catch (err) {
            console.error('Error loading vehicles', err);
        } finally {
            setLoadingList(false);
        }
    };

    const checkPlaca = async (placa: string, type: 'ingreso' | 'salida') => {
        if (!placa) return;
        const setLoading = type === 'ingreso' ? setLoadingIngreso : setLoadingSalida;
        const setResult = type === 'ingreso' ? setIngresoResult : setSalidaResult;

        setLoading(true);
        try {
            const res = await api.get(`/m_porteria/assets/php/porteria_api.php?action=check_placa&placa=${placa}`);
            setResult(res.data);
        } catch (err) {
            console.error('Error checking placa', err);
            setResult({ exists: false });
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (type: 'ingreso' | 'salida') => {
        const placa = type === 'ingreso' ? ingresoPlaca : salidaPlaca;
        const action = type === 'ingreso' ? 'registrar_ingreso' : 'registrar_salida';

        try {
            const res = await api.post(`/m_porteria/assets/php/porteria_api.php?action=${action}`, { placa });
            if (res.data.status === 'success') {
                alert(`${type === 'ingreso' ? 'Ingreso' : 'Salida'} registrado`);
                // Reset
                if (type === 'ingreso') {
                    setIngresoPlaca('');
                    setIngresoResult(null);
                } else {
                    setSalidaPlaca('');
                    setSalidaResult(null);
                }
                loadVehicles();
            } else {
                alert('Error: ' + res.data.message);
            }
        } catch (err) {
            console.error('Error registering', err);
            alert('Error connecting to server');
        }
    };

    const checkExpiration = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return 'expired';
        if (diffDays < 30) return 'warning';
        return 'valid';
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <h2 className="text-2xl font-bold text-gray-800">Control de Acceso</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Ingreso Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-green-600 px-6 py-4 flex items-center gap-2 text-white">
                        <LogIn size={20} />
                        <h3 className="font-semibold text-lg">Registrar Ingreso</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={ingresoPlaca}
                                onChange={(e) => setIngresoPlaca(e.target.value.toUpperCase())}
                                placeholder="Placa (ej. ABC-123)"
                                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none uppercase"
                            />
                            <button
                                onClick={() => checkPlaca(ingresoPlaca, 'ingreso')}
                                disabled={loadingIngreso}
                                className="bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                title="Buscar placa"
                            >
                                <Search size={20} />
                            </button>
                        </div>

                        {ingresoResult && (
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                                {ingresoResult.exists ? (
                                    <>
                                        <div className="font-medium text-gray-900">
                                            {ingresoResult.data?.tipo_vehiculo} - {ingresoResult.data?.empresa || 'Sin Empresa'}
                                        </div>
                                        {IngresoValidation(ingresoResult.data!, checkExpiration)}
                                        {canIngresar(ingresoResult.data!, checkExpiration) && (
                                            <button
                                                onClick={() => handleRegister('ingreso')}
                                                className="w-full bg-green-600 text-white font-medium py-2 rounded-lg hover:bg-green-700 transition-colors"
                                            >
                                                Confirmar Ingreso
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-red-500 font-medium">Vehículo no registrado en inventario.</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Salida Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-blue-600 px-6 py-4 flex items-center gap-2 text-white">
                        <LogOut size={20} />
                        <h3 className="font-semibold text-lg">Registrar Salida</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={salidaPlaca}
                                onChange={(e) => setSalidaPlaca(e.target.value.toUpperCase())}
                                placeholder="Placa (ej. ABC-123)"
                                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase"
                            />
                            <button
                                onClick={() => checkPlaca(salidaPlaca, 'salida')}
                                disabled={loadingSalida}
                                className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                title="Buscar placa"
                            >
                                <Search size={20} />
                            </button>
                        </div>

                        {salidaResult && (
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                                {salidaResult.exists ? (
                                    <>
                                        <div className="font-medium text-gray-900">
                                            {salidaResult.data?.tipo_vehiculo}
                                        </div>
                                        {salidaResult.data?.ubicacion_actual !== 'en_planta' ? (
                                            <div className="text-yellow-600 flex items-center gap-2">
                                                <AlertTriangle size={16} /> NO está en planta.
                                            </div>
                                        ) : (
                                            <>
                                                <div className="text-green-600 flex items-center gap-2">
                                                    <CheckCircle size={16} /> Listo para salida.
                                                </div>
                                                <button
                                                    onClick={() => handleRegister('salida')}
                                                    className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                                >
                                                    Confirmar Salida
                                                </button>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-red-500 font-medium">Vehículo no registrado.</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-800">Vehículos en Planta</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">Placa</th>
                                <th className="px-6 py-3">Tipo</th>
                                <th className="px-6 py-3">Empresa</th>
                                <th className="px-6 py-3">Ingreso</th>
                                <th className="px-6 py-3">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingList ? (
                                <tr><td colSpan={5} className="text-center py-4">Cargando...</td></tr>
                            ) : vehiclesInPlant.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-4 text-gray-500">No hay vehículos en planta</td></tr>
                            ) : (
                                vehiclesInPlant.map((v) => (
                                    <tr key={v.placa} className="border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-bold">{v.placa}</td>
                                        <td className="px-6 py-4">{v.tipo_vehiculo}</td>
                                        <td className="px-6 py-4">{v.empresa || '-'}</td>
                                        <td className="px-6 py-4">{new Date(v.updated_at).toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                                                En Planta
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// Helper components logic extracted
const IngresoValidation = (v: Vehicle, checkExpiration: (d: string) => string) => {
    const soat = checkExpiration(v.soat_fecha_vencimiento);
    const tecno = checkExpiration(v.tecnomecanica_fecha_vencimiento);
    const poliza = checkExpiration(v.poliza_terceros_fecha_vencimiento);

    if (soat === 'expired' || tecno === 'expired' || poliza === 'expired') {
        return <div className="text-red-600 flex items-center gap-2"><AlertTriangle size={16} /> Documentos Vencidos!</div>;
    }
    if (v.ubicacion_actual === 'en_planta') {
        return <div className="text-yellow-600 flex items-center gap-2"><Clock size={16} /> Ya está en planta.</div>;
    }
    return <div className="text-green-600 flex items-center gap-2"><CheckCircle size={16} /> Documentos en regla.</div>;
};

const canIngresar = (v: Vehicle, checkExpiration: (d: string) => string) => {
    const soat = checkExpiration(v.soat_fecha_vencimiento);
    const tecno = checkExpiration(v.tecnomecanica_fecha_vencimiento);
    const poliza = checkExpiration(v.poliza_terceros_fecha_vencimiento);
    if (soat === 'expired' || tecno === 'expired' || poliza === 'expired') return false;
    if (v.ubicacion_actual === 'en_planta') return false;
    return true;
};

export default AccessControl;
