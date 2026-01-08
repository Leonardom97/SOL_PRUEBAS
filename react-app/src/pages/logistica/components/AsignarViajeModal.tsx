import React, { useState, useEffect } from 'react';
import { Truck, User, Save } from 'lucide-react';
import { logisticaService } from '../services/logisticaService';
import { type Vehiculo, type Conductor } from '../types';
import Modal from '../../../components/ui/Modal';

interface AsignarViajeModalProps {
    isOpen: boolean;
    onClose: () => void;
    programacionId: string | null;
    onSuccess: () => void;
}

const AsignarViajeModal: React.FC<AsignarViajeModalProps> = ({ isOpen, onClose, programacionId, onSuccess }) => {
    const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
    const [conductores, setConductores] = useState<Conductor[]>([]);

    const [selectedVehiculo, setSelectedVehiculo] = useState('');
    const [selectedConductor, setSelectedConductor] = useState('');

    const loadData = async () => {
        try {
            const [v, c] = await Promise.all([
                logisticaService.getVehiculosDisponibles(),
                logisticaService.getConductoresDisponibles()
            ]);
            setVehiculos(v);
            setConductores(c);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadData();
            setSelectedVehiculo('');
            setSelectedConductor('');
        }
    }, [isOpen]);

    const handleSave = async () => {
        if (!programacionId || !selectedVehiculo || !selectedConductor) return;

        try {
            const res = await logisticaService.saveViaje(programacionId, selectedVehiculo, selectedConductor);
            if (res.status === 'success') {
                onSuccess();
                onClose();
            } else {
                alert('Error: ' + res.message);
            }
        } catch (error) {
            console.error(error);
            alert('Error al asignar viaje');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Asignar Vehículo y Conductor">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <Truck size={16} /> Vehículo Disponible
                    </label>
                    <select
                        className="w-full border rounded px-3 py-2"
                        value={selectedVehiculo}
                        onChange={(e) => setSelectedVehiculo(e.target.value)}
                    >
                        <option value="">Seleccione...</option>
                        {vehiculos.map(v => (
                            <option key={v.id} value={v.id}>{v.placa} ({v.tipo_vehiculo})</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <User size={16} /> Conductor
                    </label>
                    <select
                        className="w-full border rounded px-3 py-2"
                        value={selectedConductor}
                        onChange={(e) => setSelectedConductor(e.target.value)}
                    >
                        <option value="">Seleccione...</option>
                        {conductores.map(c => (
                            <option key={c.id} value={c.id}>{c.nombres} {c.apellidos}</option>
                        ))}
                    </select>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleSave}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
                        disabled={!selectedVehiculo || !selectedConductor}
                    >
                        <Save size={16} /> Asignar
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default AsignarViajeModal;
