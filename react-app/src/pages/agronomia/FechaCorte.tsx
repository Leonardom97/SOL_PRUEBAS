import { useState, useEffect } from 'react';
import { Calendar, Save, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthProvider';

export default function FechaCorte() {
    const { user } = useAuth();
    const [fecha, setFecha] = useState('');
    const [currentFecha, setCurrentFecha] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Only admins should really be here, but good to check roles
    const canEdit = user?.role === 'admin' || user?.permissions?.some(p => p.toLowerCase() === 'administrador');

    useEffect(() => {
        fetchFecha();
    }, []);

    const fetchFecha = async () => {
        try {
            setLoading(true);
            const res = await api.get('/m_agronomia/assets/php/fecha_corte.php');
            if (res.data && res.data.fecha_corte) {
                setCurrentFecha(res.data.fecha_corte);
                setFecha(res.data.fecha_corte);
                // Sync with localStorage as per legacy behavior
                localStorage.setItem('fecha_corte', res.data.fecha_corte);
            } else {
                setCurrentFecha(null);
                setFecha('');
                localStorage.removeItem('fecha_corte');
            }
        } catch (error: any) {
            console.error('Error fetching fecha corte:', error);
            // Non-critical error if 404 just means no date set
            if (error.response && error.response.status === 404) {
                setCurrentFecha(null);
                setFecha('');
            } else {
                setMessage({ type: 'error', text: 'Error al cargar la fecha actual.' });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (!fecha) {
            setMessage({ type: 'error', text: 'Por favor seleccione una fecha.' });
            return;
        }

        try {
            setSaving(true);

            // Legacy backend expects JSON body: { fecha_corte: 'YYYY-MM-DD' }
            // and historically checked a header X-User-Role, but we are authenticated via session/cookie now.
            // If the PHP backend strictly requires the header locally for some reason, we might need to add it, 
            // but the Axios interceptor should handle auth. 
            // Based on legacy code: if (isAdmin) headers['X-User-Role'] = 'Administrador';

            const config = {
                headers: {} as Record<string, string>
            };

            // If legacy strict check exists, emulate it for admin users
            if (user?.role === 'admin' || user?.permissions?.some(p => p.toLowerCase() === 'administrador')) {
                config.headers['X-User-Role'] = 'Administrador';
            }

            await api.put('/m_agronomia/assets/php/fecha_corte.php', { fecha_corte: fecha }, config);

            // Fetch again or just update state
            setCurrentFecha(fecha);
            localStorage.setItem('fecha_corte', fecha);

            // Dispatch event for other potential listeners (legacy hybrid mode)
            try {
                window.dispatchEvent(new CustomEvent('fechaCorteChanged', { detail: { fecha } }));
            } catch { /* ignore */ }

            setMessage({ type: 'success', text: 'Fecha de corte actualizada correctamente.' });

        } catch (error: any) {
            console.error('Error saving fecha corte:', error);
            const msg = error.response?.data?.message || error.response?.data?.error || 'Error al guardar la fecha.';
            setMessage({ type: 'error', text: msg });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Fecha de Cortes Agronomía</h1>
                <p className="text-gray-600">Gestión de la fecha de corte para las tablas y reportes de agronomía.</p>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden max-w-lg mx-auto">
                <div className="p-6">
                    <div className="text-center mb-6">
                        <span className="block text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">
                            Fecha Actual de Corte
                        </span>
                        <div className="text-2xl font-mono font-semibold text-blue-700 bg-blue-50 py-2 px-4 rounded-lg inline-block">
                            {currentFecha ? new Date(currentFecha + 'T00:00:00').toLocaleDateString('es-ES', {
                                day: '2-digit', month: '2-digit', year: 'numeric'
                            }) : 'No establecida'}
                        </div>
                    </div>

                    <form onSubmit={handleSave} className="space-y-6">
                        <div>
                            <label htmlFor="fecha" className="block text-sm font-medium text-gray-700 mb-2">
                                Nueva Fecha de Corte
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Calendar size={18} className="text-gray-400" />
                                </div>
                                <input
                                    type="date"
                                    id="fecha"
                                    value={fecha}
                                    onChange={(e) => setFecha(e.target.value)}
                                    disabled={!canEdit || saving}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors disabled:bg-gray-100 disabled:text-gray-500"
                                    required
                                />
                            </div>
                        </div>

                        {message && (
                            <div className={`p-4 rounded-md flex items-start gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                {message.type === 'success' ? <CheckCircle size={20} className="mt-0.5 shrink-0" /> : <AlertCircle size={20} className="mt-0.5 shrink-0" />}
                                <p className="text-sm font-medium">{message.text}</p>
                            </div>
                        )}

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={!canEdit || saving}
                                className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-all
                                    ${!canEdit ? 'bg-gray-400 cursor-not-allowed' :
                                        saving ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 hover:shadow-lg transform active:scale-[0.98]'}`}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin mr-2" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} className="mr-2" />
                                        Actualizar Fecha
                                    </>
                                )}
                            </button>
                        </div>

                        {!canEdit && (
                            <p className="text-xs text-center text-gray-500 mt-2">
                                Solo los administradores pueden modificar esta fecha.
                            </p>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
