import React, { useState, useEffect } from 'react';
import { Truck, Leaf, Clock, Save, FileText } from 'lucide-react';
import { logisticaService } from './services/logisticaService';

const NuevaRemision: React.FC = () => {
    const [viajes, setViajes] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        viaje_id: '',
        fecha_corte: new Date().toISOString().split('T')[0],
        ciclo_cosecha: '',
        lotes_corte: '',
        variedad_tipo: 'hibrido',
        cosechado_por: '',
        fecha_hora_cargue: '',
        fecha_hora_recogida: '',
        fruto_certificado: false,
        certificado_por: '',
        observaciones: ''
    });

    useEffect(() => {
        loadViajes();
    }, []);

    const loadViajes = async () => {
        try {
            const data = await logisticaService.getViajesActivos();
            setViajes(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Only send 'certificado_por' if 'fruto_certificado' is true
            const payload = {
                ...formData,
                variedad_tipo: formData.variedad_tipo as 'hibrido' | 'guineensis',
                certificado_por: formData.fruto_certificado ? formData.certificado_por : undefined
            };

            const res = await logisticaService.saveRemision(payload);
            if (res.status === 'success') {
                alert('Remisión creada correctamente');
                // Reset form
                setFormData({
                    viaje_id: '',
                    fecha_corte: new Date().toISOString().split('T')[0],
                    ciclo_cosecha: '',
                    lotes_corte: '',
                    variedad_tipo: 'hibrido',
                    cosechado_por: '',
                    fecha_hora_cargue: '',
                    fecha_hora_recogida: '',
                    fruto_certificado: false,
                    certificado_por: '',
                    observaciones: ''
                });
                loadViajes();
            } else {
                alert('Error: ' + res.message);
            }
        } catch (error) {
            console.error(error);
            alert('Error al guardar remisión');
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-6">
                <div className="p-2 bg-green-100 rounded-lg text-green-600">
                    <FileText size={24} />
                </div>
                Nueva Remisión de Despacho
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Section 1: Viaje */}
                <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-blue-500">
                    <h5 className="text-blue-600 font-semibold mb-4 flex items-center gap-2">
                        <Truck size={20} /> Selección de Viaje
                    </h5>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Viaje Activo</label>
                        <select
                            className="w-full border rounded px-3 py-2 text-lg"
                            value={formData.viaje_id}
                            onChange={(e) => setFormData({ ...formData, viaje_id: e.target.value })}
                            required
                        >
                            <option value="">Seleccione un viaje...</option>
                            {viajes.map(v => (
                                <option key={v.id} value={v.id}>
                                    {v.placa} - {v.finca_empresa} ({new Date(v.created_at).toLocaleDateString()})
                                </option>
                            ))}
                        </select>
                        <p className="text-sm text-gray-500 mt-1">Solo se muestran viajes en curso o programados sin remisión asociada.</p>
                    </div>
                </div>

                {/* Section 2: Cosecha */}
                <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-green-500">
                    <h5 className="text-green-600 font-semibold mb-4 flex items-center gap-2">
                        <Leaf size={20} /> Datos de Cosecha
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Corte</label>
                            <input
                                type="date"
                                className="w-full border rounded px-3 py-2"
                                value={formData.fecha_corte}
                                onChange={(e) => setFormData({ ...formData, fecha_corte: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ciclo de Cosecha</label>
                            <input
                                type="text"
                                className="w-full border rounded px-3 py-2"
                                placeholder="Ej: Ciclo 1-2025"
                                value={formData.ciclo_cosecha}
                                onChange={(e) => setFormData({ ...formData, ciclo_cosecha: e.target.value })}
                            />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Lotes de Corte</label>
                            <input
                                type="text"
                                className="w-full border rounded px-3 py-2"
                                placeholder="Ej: Lote A, Lote B (Separados por coma)"
                                value={formData.lotes_corte}
                                onChange={(e) => setFormData({ ...formData, lotes_corte: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Variedad</label>
                            <select
                                className="w-full border rounded px-3 py-2"
                                value={formData.variedad_tipo}
                                onChange={(e) => setFormData({ ...formData, variedad_tipo: e.target.value })}
                            >
                                <option value="hibrido">Híbrido</option>
                                <option value="guineensis">Guineensis</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cosechado Por</label>
                            <input
                                type="text"
                                className="w-full border rounded px-3 py-2"
                                value={formData.cosechado_por}
                                onChange={(e) => setFormData({ ...formData, cosechado_por: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Section 3: Tiempos y Certificación */}
                <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-yellow-500">
                    <h5 className="text-yellow-600 font-semibold mb-4 flex items-center gap-2">
                        <Clock size={20} /> Tiempos y Certificación
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hora Cargue</label>
                            <input
                                type="datetime-local"
                                className="w-full border rounded px-3 py-2"
                                value={formData.fecha_hora_cargue}
                                onChange={(e) => setFormData({ ...formData, fecha_hora_cargue: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hora Recogida</label>
                            <input
                                type="datetime-local"
                                className="w-full border rounded px-3 py-2"
                                value={formData.fecha_hora_recogida}
                                onChange={(e) => setFormData({ ...formData, fecha_hora_recogida: e.target.value })}
                                required
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2 bg-gray-50 p-3 rounded flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 text-blue-600 rounded"
                                    checked={formData.fruto_certificado}
                                    onChange={(e) => setFormData({ ...formData, fruto_certificado: e.target.checked })}
                                />
                                <span className="font-bold text-gray-700">¿Fruto Certificado?</span>
                            </label>
                            {formData.fruto_certificado && (
                                <input
                                    type="text"
                                    className="border rounded px-3 py-1 text-sm w-64"
                                    placeholder="Certificado Por..."
                                    value={formData.certificado_por}
                                    onChange={(e) => setFormData({ ...formData, certificado_por: e.target.value })}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Section 4: Observaciones */}
                <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-gray-500">
                    <h5 className="text-gray-600 font-semibold mb-4 flex items-center gap-2">
                        <FileText size={20} /> Observaciones
                    </h5>
                    <textarea
                        className="w-full border rounded px-3 py-2 h-24"
                        placeholder="Observaciones adicionales..."
                        value={formData.observaciones}
                        onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    />
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-bold text-lg flex items-center gap-2 shadow-lg"
                    >
                        <Save size={24} /> Crear Remisión
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NuevaRemision;
