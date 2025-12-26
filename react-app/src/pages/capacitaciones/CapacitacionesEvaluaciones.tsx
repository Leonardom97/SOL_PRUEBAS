import { useState, useEffect } from 'react';
import { Play, CheckCircle, Clock, FileText, Star, AlertCircle, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthProvider';

interface Evaluacion {
    id: number;
    id_formulario: number;
    titulo: string;
    fecha_limite?: string;
    intentos_restantes: number;
    estado: 'pendiente' | 'realizada' | 'vencida';
    calificacion?: number;
    fecha_realizacion?: string;
    firma_digital?: string;
    puntaje_obtenido?: number;
    fecha_capacitacion?: string;
}

const CapacitacionesEvaluaciones = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [pending, setPending] = useState<Evaluacion[]>([]);
    const [history, setHistory] = useState<Evaluacion[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Adjust params based on legacy mis_evaluaciones.js logic
            const userId = user?.id || '';
            const cedula = user?.cedula || (user as any)?.usuario || ''; // fallback

            const [pendingRes, historyRes] = await Promise.all([
                api.get(`/m_capacitaciones/assets/php/evaluacion_api.php?action=get_pending_evaluations&id_colaborador=${userId}&cedula=${cedula}`),
                api.get(`/m_capacitaciones/assets/php/evaluacion_api.php?action=get_completed_evaluations&id_colaborador=${userId}&cedula=${cedula}`)
            ]);

            if (pendingRes.data.success) {
                setPending(pendingRes.data.data);
            }
            if (historyRes.data.success) {
                setHistory(historyRes.data.data);
            }

        } catch (error) {
            console.error('Error loading evaluations', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStart = (idFormulario: number, idHeader: number) => {
        navigate(`/evaluaciones/realizar/${idFormulario}/${idHeader}`);
    };

    const handleExport = () => {
        // Logic to export history - for now just alert or call backend PDF generator if valid
        alert("Exportar historial: Funcionalidad en desarrollo (requiere librería PDF).");
    };

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Mis Evaluaciones</h2>
                <p className="text-gray-500">Gestiona tus evaluaciones pendientes y consulta tu historial.</p>
            </div>

            {/* Pending Evaluations */}
            <section>
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Clock className="text-orange-500" /> Pendientes
                </h3>

                {loading ? (
                    <div className="text-center py-8 bg-white rounded-xl shadow-sm">Cargando...</div>
                ) : pending.length === 0 ? (
                    <div className="bg-green-50 text-green-700 p-6 rounded-xl border border-green-100 flex flex-col items-center">
                        <CheckCircle size={32} className="mb-2" />
                        <p className="font-medium">¡Estás al día! No tienes evaluaciones pendientes.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pending.map(item => (
                            <div key={item.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <FileText size={64} className="text-blue-500" />
                                </div>
                                <h4 className="font-bold text-lg text-gray-800 mb-2 pr-8">{item.titulo}</h4>

                                <div className="space-y-2 text-sm text-gray-600 mb-6">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle size={16} className="text-red-500" />
                                        <span>Vence: <span className="font-semibold text-gray-800">{item.fecha_limite || 'Sin límite'}</span></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Play size={16} className="text-blue-500" />
                                        <span>Intentos: <span className="font-semibold text-gray-800">{item.intentos_restantes}</span></span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleStart(item.id_formulario, item.id)} // Assuming item.id is id_header based on legacy usage
                                    className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <Play size={18} fill="currentColor" /> Comenzar Evaluación
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* History */}
            <section>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                        <CheckCircle className="text-green-500" /> Historial
                    </h3>
                    <button onClick={handleExport} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                        <Download size={16} /> Exportar Certificados
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="bg-gray-50 text-gray-700 uppercase font-medium">
                                <tr>
                                    <th className="px-6 py-3">Evaluación</th>
                                    <th className="px-6 py-3">Fecha</th>
                                    <th className="px-6 py-3">Calificación</th>
                                    <th className="px-6 py-3">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan={4} className="text-center py-8">Cargando...</td></tr>
                                ) : history.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-8">No hay historial disponible.</td></tr>
                                ) : (
                                    history.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium text-gray-900">{item.titulo}</td>
                                            <td className="px-6 py-4">{item.fecha_realizacion ? new Date(item.fecha_realizacion).toLocaleDateString() : '-'}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1">
                                                    <span className={`font-bold ${(item.puntaje_obtenido || 0) >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {item.puntaje_obtenido ? Number(item.puntaje_obtenido).toFixed(1) : '0.0'}
                                                    </span>
                                                    <span className="text-xs text-gray-400">/ 100</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {(item.puntaje_obtenido || 0) >= 70 ? (
                                                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">
                                                        <Star size={12} fill="currentColor" /> Aprobada
                                                    </span>
                                                ) : (
                                                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold">
                                                        Reprobada
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default CapacitacionesEvaluaciones;
