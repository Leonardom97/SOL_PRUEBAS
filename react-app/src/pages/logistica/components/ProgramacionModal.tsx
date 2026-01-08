import React, { useState, useEffect } from 'react';
import { Save, Plus, AlertCircle } from 'lucide-react';
import { logisticaService } from '../services/logisticaService';
import { type ProgramacionItem, type Finca, type Acopio, type Cajon, type Viaje } from '../types';
import Modal from '../../../components/ui/Modal';
import AsignarViajeModal from './AsignarViajeModal';

interface ProgramacionModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingItem: ProgramacionItem | null;
    week: string; // To pre-fill date if new
    onSuccess: () => void;
}

const ProgramacionModal: React.FC<ProgramacionModalProps> = ({ isOpen, onClose, editingItem, onSuccess }) => {
    // Master Data
    const [fincas, setFincas] = useState<Finca[]>([]);
    const [acopios, setAcopios] = useState<Acopio[]>([]);
    const [cajones, setCajones] = useState<Cajon[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        fecha_programacion: '',
        jornada: 'Mañana',
        variedad_fruto: '',
        finca_id: '',
        acopio_id: '',
        cajon_id: '',
        cantidad_cajones: '',
        toneladas_estimadas: ''
    });

    // Viajes (only for edit mode)
    const [viajes, setViajes] = useState<Viaje[]>([]);
    const [showViajeModal, setShowViajeModal] = useState(false);

    const loadMasterData = async () => {
        try {
            const data = await logisticaService.getMasterData();
            setFincas(data.fincas);
            setAcopios(data.acopios);
            setCajones(data.cajones);
        } catch (e) {
            console.error(e);
        }
    };

    const loadViajes = async (progId: string) => {
        try {
            const v = await logisticaService.getViajes(progId);
            setViajes(v);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadMasterData();
            if (editingItem) {
                // Edit Mode
                setFormData({
                    fecha_programacion: editingItem.fecha_programacion,
                    jornada: editingItem.jornada,
                    variedad_fruto: editingItem.variedad_fruto || editingItem.tipo_material || '',
                    finca_id: editingItem.finca_id || '',
                    acopio_id: editingItem.acopio_id || '',
                    cajon_id: editingItem.cajon_id || '',
                    cantidad_cajones: editingItem.cantidad_cajones?.toString() || '',
                    toneladas_estimadas: editingItem.toneladas_estimadas?.toString() || ''
                });
                loadViajes(editingItem.id);
            } else {
                // Create Mode
                setFormData({
                    fecha_programacion: '',
                    jornada: 'Mañana',
                    variedad_fruto: '',
                    finca_id: '',
                    acopio_id: '',
                    cajon_id: '',
                    cantidad_cajones: '',
                    toneladas_estimadas: ''
                });
                setViajes([]);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, editingItem]);

    // --- Logic ---
    const calculateTons = (cajonId: string, qtyStr: string) => {
        const cajon = cajones.find(c => c.id === cajonId);
        const qty = parseFloat(qtyStr);
        if (cajon && !isNaN(qty)) {
            const total = cajon.capacidad_ton * qty;
            setFormData(prev => ({ ...prev, toneladas_estimadas: total.toFixed(2) }));
        }
    };

    const handleCajonChange = (cajonId: string) => {
        setFormData(prev => ({ ...prev, cajon_id: cajonId }));
        calculateTons(cajonId, formData.cantidad_cajones);
    };

    const handleQtyChange = (qty: string) => {
        setFormData(prev => ({ ...prev, cantidad_cajones: qty }));
        calculateTons(formData.cajon_id, qty);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                id: editingItem?.id,
                ...formData,
                cantidad_cajones: parseInt(formData.cantidad_cajones),
                toneladas_estimadas: parseFloat(formData.toneladas_estimadas)
            };

            const res = await logisticaService.saveProgramacion(payload);
            if (res.status === 'success') {
                onSuccess();
                onClose();
            } else {
                alert('Error: ' + res.message);
            }
        } catch (error) {
            console.error(error);
            alert('Error guardando programación');
        }
    };

    // Filter Acopios based on Finca
    const filteredAcopios = acopios.filter(a => a.finca_id === formData.finca_id);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={editingItem ? "Editar Programación" : "Programar Recolección"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Fecha</label>
                        <input
                            type="date"
                            className="w-full border rounded px-3 py-2"
                            value={formData.fecha_programacion}
                            onChange={(e) => setFormData({ ...formData, fecha_programacion: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Jornada</label>
                        <select
                            className="w-full border rounded px-3 py-2"
                            value={formData.jornada}
                            onChange={(e) => setFormData({ ...formData, jornada: e.target.value })}
                            required
                        >
                            <option value="Mañana">Mañana</option>
                            <option value="Tarde">Tarde</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Variedad</label>
                        <select
                            className="w-full border rounded px-3 py-2"
                            value={formData.variedad_fruto}
                            onChange={(e) => setFormData({ ...formData, variedad_fruto: e.target.value })}
                            required
                        >
                            <option value="">Seleccione...</option>
                            <option value="Rojo">Rojo</option>
                            <option value="Premium">Premium</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-3 rounded">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Finca</label>
                        <select
                            className="w-full border rounded px-3 py-2"
                            value={formData.finca_id}
                            onChange={(e) => setFormData({ ...formData, finca_id: e.target.value, acopio_id: '' })}
                            required
                        >
                            <option value="">Seleccione...</option>
                            {fincas.map(f => (
                                <option key={f.id} value={f.id}>{f.nombre_finca ? `${f.nombre_finca} (${f.nombre_empresa})` : f.nombre_empresa}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Acopio</label>
                        <select
                            className="w-full border rounded px-3 py-2"
                            value={formData.acopio_id}
                            onChange={(e) => setFormData({ ...formData, acopio_id: e.target.value })}
                            required
                            disabled={!formData.finca_id}
                        >
                            <option value="">Seleccione...</option>
                            {filteredAcopios.map(a => (
                                <option key={a.id} value={a.id}>{a.identificador}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Cajón</label>
                        <select
                            className="w-full border rounded px-3 py-2"
                            value={formData.cajon_id}
                            onChange={(e) => handleCajonChange(e.target.value)}
                            required
                        >
                            <option value="">Seleccione...</option>
                            {cajones.map(c => (
                                <option key={c.id} value={c.id}>{c.codigo} - {c.color}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Cantidad</label>
                        <input
                            type="number"
                            className="w-full border rounded px-3 py-2"
                            value={formData.cantidad_cajones}
                            onChange={(e) => handleQtyChange(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Estimado (Ton)</label>
                        <input
                            type="number"
                            className="w-full border rounded px-3 py-2 bg-gray-100"
                            value={formData.toneladas_estimadas}
                            readOnly
                        />
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-4">
                    <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 flex items-center gap-2">
                        <Save size={18} /> Guardar
                    </button>
                </div>
            </form>

            {/* Viajes Section if Editing */}
            {editingItem && (
                <div className="mt-8 border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold text-gray-800">Viajes Asignados</h4>
                        <button
                            type="button"
                            onClick={() => setShowViajeModal(true)}
                            className="text-sm bg-green-50 text-green-700 px-3 py-1 rounded border border-green-200 hover:bg-green-100 flex items-center gap-1"
                        >
                            <Plus size={16} /> Asignar Viaje
                        </button>
                    </div>

                    {viajes.length === 0 ? (
                        <div className="text-gray-500 text-sm italic flex items-center gap-2">
                            <AlertCircle size={16} /> No hay viajes asignados a esta programación.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {viajes.map(v => (
                                <div key={v.id} className="bg-gray-50 p-3 rounded border flex justify-between items-center">
                                    <div>
                                        <div className="font-medium text-gray-900">{v.placa} ({v.tipo_vehiculo})</div>
                                        <div className="text-sm text-gray-600">{v.nombres} {v.apellidos}</div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                        ${v.estado_viaje === 'completo' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
                                    `}>
                                        {v.estado_viaje.toUpperCase()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <AsignarViajeModal
                isOpen={showViajeModal}
                onClose={() => setShowViajeModal(false)}
                programacionId={editingItem?.id || null}
                onSuccess={() => {
                    if (editingItem) loadViajes(editingItem.id);
                }}
            />
        </Modal>
    );
};

export default ProgramacionModal;
