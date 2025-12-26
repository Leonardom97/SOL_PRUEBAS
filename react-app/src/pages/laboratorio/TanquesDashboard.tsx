import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Save, CheckCircle, Calculator, Info } from 'lucide-react';
import { laboratorioService } from './services/laboratorioService';
import { type Tanque, type RegistroDiario, type Variedad } from './types';
import Modal from '../../components/ui/Modal';

const TanquesDashboard: React.FC = () => {
    const [registros, setRegistros] = useState<RegistroDiario[]>([]);
    const [tanques, setTanques] = useState<Tanque[]>([]);
    const [variedades, setVariedades] = useState<Variedad[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showNuevoTanqueModal, setShowNuevoTanqueModal] = useState(false);
    const [showMedicionModal, setShowMedicionModal] = useState(false);
    const [showCierreModal, setShowCierreModal] = useState(false);

    // Modal Data
    const [medicionData, setMedicionData] = useState<{ id: string; tipo: 'inicial' | 'final'; capacidad: number } | null>(null);
    const [medicionForm, setMedicionForm] = useState({ pRefIni: '', pRefFin: '', resultado: '' });

    const [cierreData, setCierreData] = useState<{ registro: RegistroDiario } | null>(null);
    const [cierreForm, setCierreForm] = useState({ inventarioFinal: '', observaciones: '' });

    const [nuevoTanqueForm, setNuevoTanqueForm] = useState({ numero: '', capacidad: '', variedad: '' });

    // Date State
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);

    // Load Data
    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        loadRegistros();
    }, [fecha]);

    const loadInitialData = async () => {
        try {
            const [t, v] = await Promise.all([
                laboratorioService.getTanques(),
                laboratorioService.getVariedades()
            ]);
            setTanques(t);
            setVariedades(v);
        } catch (err) {
            console.error('Error al cargar datos iniciales', err);
        }
    };

    const loadRegistros = async () => {
        setLoading(true);
        try {
            const data = await laboratorioService.getRegistrosHoy(fecha);
            setRegistros(data);
        } catch (err) {
            console.error('Error al cargar registros diarios', err);
        } finally {
            setLoading(false);
        }
    };

    // --- Handlers ---
    const handleSaveRow = async (registro: RegistroDiario) => {
        try {
            const payload = {
                id: registro.id,
                id_tanque: registro.id_tanque,
                fecha: fecha,
                despacho_neto: registro.despacho_neto || 0,
                inventario_final: registro.inventario_final ?? undefined,
                temperatura_inicial: registro.temperatura_inicial ?? undefined,
                temperatura_final: registro.temperatura_final ?? undefined
            };

            const result = await laboratorioService.saveRegistroDiario(payload);
            if (result.success) {
                loadRegistros();
            } else {
                alert(result.error || 'Error al guardar');
            }
        } catch (err) {
            alert('Error al guardar registro');
        }
    };

    const handleInputChange = (index: number, field: keyof RegistroDiario, value: any) => {
        const newRegistros = [...registros];
        newRegistros[index] = { ...newRegistros[index], [field]: value };
        setRegistros(newRegistros);
    };

    const handleAddRow = () => {
        const newRow: RegistroDiario = {
            id: `temp-${Date.now()}`,
            id_tanque: '',
            fecha: fecha,
            numero_tanque: '',
            capacidad_toneladas: '0',
            inventario_inicial: '0',
            despacho_neto: null,
            inventario_final: null,
            total_secadores: 0,
            total_ton_secadores: '0',
            medicion_inicial: null,
            medicion_final: null,
            temperatura_inicial: null,
            temperatura_final: null,
            cerrado: 0
        };
        setRegistros([...registros, newRow]);
    };

    const handleTanqueSelect = async (index: number, tanqueId: string) => {
        const tanque = tanques.find(t => t.id === tanqueId);
        if (!tanque) return;

        let invInicial = '0';
        try {
            const prev = await laboratorioService.getInventarioAnterior(tanqueId, fecha);
            invInicial = prev.inventario_final || '0';
        } catch (e) {
            console.error(e);
        }

        const newRegistros = [...registros];
        newRegistros[index] = {
            ...newRegistros[index],
            id_tanque: tanqueId,
            numero_tanque: tanque.numero_tanque,
            variedad_nombre: tanque.variedad_nombre,
            capacidad_toneladas: tanque.capacidad_toneladas,
            inventario_inicial: invInicial
        };
        setRegistros(newRegistros);
    };

    // --- Medicion Calculation Modal ---

    const openMedicionModal = (registro: RegistroDiario, tipo: 'inicial' | 'final') => {
        if (registro.cerrado) return;
        setMedicionData({
            id: registro.id,
            tipo,
            capacidad: parseFloat(registro.capacidad_toneladas) || 0
        });
        setMedicionForm({ pRefIni: '', pRefFin: '', resultado: '' });
        setShowMedicionModal(true);
    };

    const calculateMedicion = () => {
        if (!medicionData) return;
        const ini = parseFloat(medicionForm.pRefIni) || 0;
        const fin = parseFloat(medicionForm.pRefFin) || 0;
        const res = medicionData.capacidad - (ini - fin);
        setMedicionForm({ ...medicionForm, resultado: res.toFixed(3) });
    };

    const saveMedicion = async () => {
        if (!medicionData || !medicionForm.resultado) return;
        try {
            await laboratorioService.saveMedicionCalculo({
                id: medicionData.id,
                tipo: medicionData.tipo,
                medicion_resultado: medicionForm.resultado,
                p_ref_ini: medicionForm.pRefIni,
                p_ref_fin: medicionForm.pRefFin
            });
            setShowMedicionModal(false);
            loadRegistros();
        } catch (err) {
            alert('Error al guardar medición');
        }
    };

    // --- Cierre Modal ---

    const openCierreModal = (registro: RegistroDiario) => {
        setCierreData({ registro });
        setCierreForm({ inventarioFinal: registro.inventario_final || '', observaciones: '' });
        setShowCierreModal(true);
    };

    const confirmCierre = async () => {
        if (!cierreData) return;
        try {
            await laboratorioService.cerrarRegistroDiario({
                id: cierreData.registro.id,
                inventario_final: cierreForm.inventarioFinal,
                observaciones: cierreForm.observaciones
            });
            setShowCierreModal(false);
            loadRegistros();
        } catch (err) {
            alert('Error al cerrar día');
        }
    };

    // --- Nieuvo Tanque ---
    const saveNuevoTanque = async () => {
        if (!nuevoTanqueForm.numero || !nuevoTanqueForm.capacidad) return;
        try {
            await laboratorioService.saveTanque({
                numero_tanque: nuevoTanqueForm.numero,
                capacidad_toneladas: nuevoTanqueForm.capacidad,
                id_variedad: nuevoTanqueForm.variedad || null
            });
            setShowNuevoTanqueModal(false);
            setNuevoTanqueForm({ numero: '', capacidad: '', variedad: '' });
            loadInitialData();
        } catch (err) {
            alert('Error al crear tanque');
        }
    };

    // Render Helpers
    const getQualityBadges = (registro: RegistroDiario) => {
        return (
            <div className="flex flex-col gap-1">
                {registro.calidad_acidez && <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded">{parseFloat(registro.calidad_acidez).toFixed(2)}% acid</span>}
                {registro.calidad_humedad && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">{parseFloat(registro.calidad_humedad).toFixed(2)}% hum</span>}
                {registro.calidad_yodo && <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded">{parseFloat(registro.calidad_yodo).toFixed(2)}% yodo</span>}
            </div>
        );
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <Info size={24} />
                </div>
                Registro Diario de Tanques
            </h1>

            {/* Header Controls */}
            <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="text-gray-400" size={20} />
                        <span className="font-medium text-gray-700">Fecha:</span>
                        <input
                            type="date"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            className="border rounded px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>
                <button
                    onClick={() => setShowNuevoTanqueModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
                >
                    <Plus size={20} />
                    Nuevo Tanque
                </button>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                            <tr>
                                <th className="px-4 py-3 text-left w-32">Tanque</th>
                                <th className="px-4 py-3 text-left">Variedad</th>
                                <th className="px-4 py-3 text-left">Calidad</th>
                                <th className="px-4 py-3 text-center">Cap. (Ton)</th>
                                <th className="px-4 py-3 text-center">Inv. Ini</th>
                                <th className="px-4 py-3 text-center w-24">Desp. Neto</th>
                                <th className="px-4 py-3 text-center w-24">Inv. Fin</th>
                                <th className="px-4 py-3 text-center">Med. Ini</th>
                                <th className="px-4 py-3 text-center">Med. Fin</th>
                                <th className="px-4 py-3 text-center w-20">T° Ini</th>
                                <th className="px-4 py-3 text-center w-20">T° Fin</th>
                                <th className="px-4 py-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={12} className="px-4 py-8 text-center text-gray-500">Cargando...</td></tr>
                            ) : (
                                registros.map((registro, idx) => (
                                    <tr key={registro.id || `new-${idx}`} className="hover:bg-gray-50">
                                        <td className="px-4 py-2">
                                            {registro.id ? (
                                                <span className="font-medium text-gray-900">{registro.numero_tanque}</span>
                                            ) : (
                                                <select
                                                    className="w-full border rounded px-2 py-1 text-sm"
                                                    onChange={(e) => handleTanqueSelect(idx, e.target.value)}
                                                    value={registro.id_tanque}
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    {tanques.map(t => (
                                                        <option key={t.id} value={t.id}>{t.numero_tanque}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-gray-600">{registro.variedad_nombre || '-'}</td>
                                        <td className="px-4 py-2">{getQualityBadges(registro)}</td>
                                        <td className="px-4 py-2 text-center">{registro.capacidad_toneladas}</td>
                                        <td className="px-4 py-2 text-center text-gray-500">{registro.inventario_inicial}</td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                className="w-full text-center border rounded py-1"
                                                value={registro.despacho_neto || ''}
                                                onChange={(e) => handleInputChange(idx, 'despacho_neto', e.target.value)}
                                                disabled={!!registro.cerrado}
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-center font-bold text-gray-900">{registro.inventario_final || '-'}</td>
                                        <td className="px-4 py-2 text-center">
                                            {registro.medicion_inicial ? (
                                                <span className="text-green-600 font-medium">{registro.medicion_inicial}</span>
                                            ) : (
                                                <button
                                                    onClick={() => openMedicionModal(registro, 'inicial')}
                                                    className="text-blue-600 hover:underline text-xs"
                                                    disabled={!!registro.cerrado}
                                                >
                                                    Agregar
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            {registro.medicion_final ? (
                                                <span className="text-green-600 font-medium">{registro.medicion_final}</span>
                                            ) : (
                                                <button
                                                    onClick={() => openMedicionModal(registro, 'final')}
                                                    className="text-blue-600 hover:underline text-xs"
                                                    disabled={!!registro.cerrado}
                                                >
                                                    Agregar
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                className="w-full text-center border rounded py-1"
                                                value={registro.temperatura_inicial || ''}
                                                onChange={(e) => handleInputChange(idx, 'temperatura_inicial', e.target.value)}
                                                disabled={!!registro.cerrado}
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                className="w-full text-center border rounded py-1"
                                                value={registro.temperatura_final || ''}
                                                onChange={(e) => handleInputChange(idx, 'temperatura_final', e.target.value)}
                                                disabled={!!registro.cerrado}
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            {registro.cerrado ? (
                                                <CheckCircle className="text-green-500 mx-auto" size={18} />
                                            ) : (
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleSaveRow(registro)}
                                                        className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                                                        aria-label="Guardar Registro"
                                                    >
                                                        <Save size={16} />
                                                    </button>
                                                    {registro.id && (
                                                        <button
                                                            onClick={() => openCierreModal(registro)}
                                                            className="text-purple-600 hover:bg-purple-50 p-1 rounded"
                                                            aria-label="Cerrar Día"
                                                        >
                                                            <CheckCircle size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                            {!loading && (
                                <tr>
                                    <td colSpan={12} className="px-4 py-3">
                                        <button
                                            onClick={handleAddRow}
                                            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-2 text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Plus size={20} />
                                            Agregar Fila
                                        </button>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modales */}
            <Modal isOpen={showNuevoTanqueModal} onClose={() => setShowNuevoTanqueModal(false)} title="Nuevo Tanque">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Número de Tanque</label>
                        <input
                            type="text"
                            className="w-full border rounded px-3 py-2"
                            value={nuevoTanqueForm.numero}
                            onChange={(e) => setNuevoTanqueForm({ ...nuevoTanqueForm, numero: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Capacidad (Toneladas)</label>
                        <input
                            type="number"
                            className="w-full border rounded px-3 py-2"
                            value={nuevoTanqueForm.capacidad}
                            onChange={(e) => setNuevoTanqueForm({ ...nuevoTanqueForm, capacidad: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Variedad</label>
                        <select
                            className="w-full border rounded px-3 py-2"
                            value={nuevoTanqueForm.variedad}
                            onChange={(e) => setNuevoTanqueForm({ ...nuevoTanqueForm, variedad: e.target.value })}
                        >
                            <option value="">Seleccionar...</option>
                            {variedades.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button onClick={saveNuevoTanque} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                            Guardar
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showMedicionModal} onClose={() => setShowMedicionModal(false)} title="Carencia (Medición de Espacio Vacío)">
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Ingrese la distancia desde el borde superior hasta el nivel del producto (P. Ref).
                        El sistema calculará las toneladas basado en la capacidad total ({medicionData?.capacidad} Ton).
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">P. Ref Inicial (m)</label>
                            <input
                                type="number"
                                className="w-full border rounded px-3 py-2"
                                value={medicionForm.pRefIni}
                                onChange={(e) => setMedicionForm({ ...medicionForm, pRefIni: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">P. Ref Final (m)</label>
                            <input
                                type="number"
                                className="w-full border rounded px-3 py-2"
                                value={medicionForm.pRefFin}
                                onChange={(e) => setMedicionForm({ ...medicionForm, pRefFin: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded">
                        <span className="font-semibold text-gray-700">Resultado Calculado:</span>
                        <div className="flex items-center gap-3">
                            <span className="text-xl font-bold text-blue-600">{medicionForm.resultado || '---'}</span>
                            <button onClick={calculateMedicion} className="text-blue-600 hover:text-blue-800" title="Calcular">
                                <Calculator size={20} />
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button onClick={saveMedicion} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" disabled={!medicionForm.resultado}>
                            Guardar Medición
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showCierreModal} onClose={() => setShowCierreModal(false)} title="Cierre de Registro Diario">
                <div className="space-y-4">
                    <div className="bg-yellow-50 p-4 rounded text-yellow-800 text-sm">
                        Advertencia: Al cerrar el registro, no se podrán realizar más ediciones para este día.
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Inventario Final</label>
                        <input
                            type="number"
                            className="w-full border rounded px-3 py-2"
                            value={cierreForm.inventarioFinal}
                            onChange={(e) => setCierreForm({ ...cierreForm, inventarioFinal: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Observaciones</label>
                        <textarea
                            className="w-full border rounded px-3 py-2"
                            rows={3}
                            value={cierreForm.observaciones}
                            onChange={(e) => setCierreForm({ ...cierreForm, observaciones: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end pt-4">
                        <button onClick={confirmCierre} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
                            Confirmar Cierre
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default TanquesDashboard;
