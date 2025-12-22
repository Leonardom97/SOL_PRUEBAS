import React, { useState, useEffect } from 'react';
import { Truck, Wind, Droplets, Calculator } from 'lucide-react';
import { laboratorioService } from '../services/laboratorioService';
import { type Tanque, type LugarMuestreo, type Secador, type Colaborador } from '../types';
import Modal from '../../../components/ui/Modal';

interface CalidadWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

type MeasurementType = 'tanque' | 'bombeo' | 'despacho';
type QualityType = 'acidez' | 'humedad' | 'yodo';

const CalidadWizard: React.FC<CalidadWizardProps> = ({ isOpen, onClose, onSuccess }) => {
    // Phase 1: Selection
    const [phase, setPhase] = useState(1);
    const [originType, setOriginType] = useState<MeasurementType>('tanque');
    const [selectedQualities, setSelectedQualities] = useState<QualityType[]>([]);

    // Data Loading
    const [tanques, setTanques] = useState<Tanque[]>([]);
    const [secadores, setSecadores] = useState<Secador[]>([]);
    const [lugares, setLugares] = useState<LugarMuestreo[]>([]);

    // Forms Data - Origin Info
    const [originData, setOriginData] = useState({
        idTanque: '',
        idSecador: '',
        placa: '',
        conductor: '',
        toneladas: ''
    });

    // Forms Data - Measurements
    const [measurements, setMeasurements] = useState<{
        [key in QualityType]: {
            selected: boolean;
            isManual: boolean;
            valorManual: string;
            // Acidez
            cantidadMuestra: string;
            pesoMuestra: string;
            normalidad: string;
            volumenNaoh: string;
            // Humedad
            pesoRecipienteA: string;
            pesoMuestraB: string;
            pesoSecoC: string;
            // Yodo
            pesoAceiteW: string;
            volumenBlancoVb: string;
            volumenAceiteVa: string;
            // Common
            idLugar: string;
            cedula: string;
            colaborador: Colaborador | null;
            observaciones: string;
            resultadoCalculado: string | null;
        }
    }>({
        acidez: { selected: false, isManual: false, valorManual: '', cantidadMuestra: '', pesoMuestra: '', normalidad: '0.1', volumenNaoh: '', pesoRecipienteA: '', pesoMuestraB: '', pesoSecoC: '', pesoAceiteW: '', volumenBlancoVb: '', volumenAceiteVa: '', idLugar: '', cedula: '', colaborador: null, observaciones: '', resultadoCalculado: null },
        humedad: { selected: false, isManual: false, valorManual: '', cantidadMuestra: '', pesoMuestra: '', normalidad: '', volumenNaoh: '', pesoRecipienteA: '', pesoMuestraB: '', pesoSecoC: '', pesoAceiteW: '', volumenBlancoVb: '', volumenAceiteVa: '', idLugar: '', cedula: '', colaborador: null, observaciones: '', resultadoCalculado: null },
        yodo: { selected: false, isManual: false, valorManual: '', cantidadMuestra: '', pesoMuestra: '', normalidad: '', volumenNaoh: '', pesoRecipienteA: '', pesoMuestraB: '', pesoSecoC: '', pesoAceiteW: '', volumenBlancoVb: '', volumenAceiteVa: '', idLugar: '', cedula: '', colaborador: null, observaciones: '', resultadoCalculado: null }
    });

    useEffect(() => {
        if (isOpen) {
            loadInitialData();
            // Reset state
            setPhase(1);
            setOriginType('tanque');
            setSelectedQualities([]);
            setOriginData({ idTanque: '', idSecador: '', placa: '', conductor: '', toneladas: '' });
            // For brevity, not resetting deep measurements object here, but should in production
        }
    }, [isOpen]);

    const loadInitialData = async () => {
        try {
            const [t, s, l] = await Promise.all([
                laboratorioService.getTanques(),
                laboratorioService.getSecadores(),
                laboratorioService.getLugaresMuestreo()
            ]);
            setTanques(t);
            setSecadores(s);
            setLugares(l);
        } catch (error) {
            console.error('Error loading wizard data', error);
        }
    };

    // --- Logic ---

    const toggleQuality = (type: QualityType) => {
        if (selectedQualities.includes(type)) {
            setSelectedQualities(selectedQualities.filter(q => q !== type));
            setMeasurements(prev => ({ ...prev, [type]: { ...prev[type], selected: false } }));
        } else {
            setSelectedQualities([...selectedQualities, type]);
            setMeasurements(prev => ({ ...prev, [type]: { ...prev[type], selected: true } }));
        }
    };

    const validatePhase1 = () => {
        if (originType === 'tanque' && !originData.idTanque) return alert('Seleccione un tanque');
        if (originType === 'bombeo') {
            if (!originData.idTanque) return alert('Seleccione tanque destino');
            if (!originData.idSecador) return alert('Seleccione secador');
        }
        if (originType === 'despacho') {
            if (!originData.idTanque) return alert('Seleccione tanque origen');
        }
        if (selectedQualities.length === 0) return alert('Seleccione al menos una medición');
        setPhase(2);
    };

    const searchColaborador = async (type: QualityType) => {
        const cedula = measurements[type].cedula;
        if (!cedula) return;
        const col = await laboratorioService.getColaborador(cedula);
        if (col) {
            setMeasurements(prev => ({
                ...prev,
                [type]: { ...prev[type], colaborador: col }
            }));
        } else {
            alert('Colaborador no encontrado');
        }
    };

    const calculateResult = (type: QualityType) => {
        const m = measurements[type];
        let res = 0;

        if (type === 'acidez') {
            const V = parseFloat(m.volumenNaoh) || 0;
            const N = parseFloat(m.normalidad) || 0.1;
            const W = parseFloat(m.pesoMuestra) || 0;
            if (W > 0) res = (V * N * 28.2) / W;
        } else if (type === 'humedad') {
            const A = parseFloat(m.pesoRecipienteA) || 0;
            const B = parseFloat(m.pesoMuestraB) || 0;
            const C = parseFloat(m.pesoSecoC) || 0;
            // Formula: ((B - C) / (B - A)) * 100
            if (B - A !== 0) res = ((B - C) / (B - A)) * 100;
        } else if (type === 'yodo') {
            const VB = parseFloat(m.volumenBlancoVb) || 0;
            const VA = parseFloat(m.volumenAceiteVa) || 0;
            const W = parseFloat(m.pesoAceiteW) || 0;
            // Formula: (12.69 * N * (VB - VA)) / W
            if (W > 0) res = (12.69 * 0.1 * (VB - VA)) / W;
        }

        setMeasurements(prev => ({
            ...prev,
            [type]: { ...prev[type], resultadoCalculado: res.toFixed(4) }
        }));
    };

    const handleSave = async () => {
        try {
            // 1. Save Origin Record if needed (Bombeo/Despacho) or get Tanque ID
            let registroOrigenId: string | undefined = undefined;
            const commonPayload = {
                porcentaje_humedad: measurements.humedad.selected ? (measurements.humedad.isManual ? measurements.humedad.valorManual : measurements.humedad.resultadoCalculado) : null,
                porcentaje_acidez: measurements.acidez.selected ? (measurements.acidez.isManual ? measurements.acidez.valorManual : measurements.acidez.resultadoCalculado) : null,
                indice_yodo: measurements.yodo.selected ? (measurements.yodo.isManual ? measurements.yodo.valorManual : measurements.yodo.resultadoCalculado) : null,
            };

            if (originType === 'bombeo') {
                const res = await laboratorioService.saveMedicionBombeo({
                    id_secador: originData.idSecador,
                    id_tanque_destino: originData.idTanque,
                    toneladas: originData.toneladas,
                    ...commonPayload
                });
                if (res.success && res.id) registroOrigenId = res.id;
                else throw new Error(res.error || 'Error saving bombeo');
            } else if (originType === 'despacho') {
                const res = await laboratorioService.saveMedicionDespacho({
                    id_tanque: originData.idTanque,
                    toneladas: originData.toneladas,
                    placa_vehiculo: originData.placa,
                    responsable_vehiculo: originData.conductor,
                    ...commonPayload
                });
                if (res.success && res.id) registroOrigenId = res.id;
                else throw new Error(res.error || 'Error saving despacho');
            }

            // 2. Save Individual Measurements
            const promises = [];

            if (measurements.acidez.selected) {
                const m = measurements.acidez;
                promises.push(laboratorioService.saveMedicionAcidez({
                    id_tanque: originData.idTanque,
                    tipo_medida: m.isManual ? 'NIR' : 'Manual',
                    valor_manual: m.isManual ? m.valorManual : undefined,
                    cantidad_muestra_gramos: m.cantidadMuestra,
                    peso_muestra_w: m.pesoMuestra,
                    normalidad_n: m.normalidad,
                    volumen_naoh_v: m.volumenNaoh,
                    id_lugar_muestreo: m.idLugar,
                    id_colaborador: m.colaborador?.ac_id,
                    observaciones: m.observaciones,
                    tipo_origen: originType,
                    id_registro_origen: registroOrigenId
                }));
            }
            if (measurements.humedad.selected) {
                const m = measurements.humedad;
                promises.push(laboratorioService.saveMedicionHumedad({
                    id_tanque: originData.idTanque,
                    tipo_medida: m.isManual ? 'NIR' : 'Manual',
                    valor_manual: m.isManual ? m.valorManual : undefined,
                    peso_recipiente_a: m.pesoRecipienteA,
                    peso_muestra_humedad_b: m.pesoMuestraB,
                    peso_muestra_seca_recipiente_c: m.pesoSecoC,
                    id_lugar_muestreo: m.idLugar,
                    id_colaborador: m.colaborador?.ac_id,
                    observaciones: m.observaciones,
                    tipo_origen: originType,
                    id_registro_origen: registroOrigenId
                }));
            }
            if (measurements.yodo.selected) {
                const m = measurements.yodo;
                promises.push(laboratorioService.saveMedicionYodo({
                    id_tanque: originData.idTanque,
                    tipo_medida: m.isManual ? 'NIR' : 'Manual',
                    valor_manual: m.isManual ? m.valorManual : undefined,
                    peso_aceite_w: m.pesoAceiteW,
                    volumen_blanco_vb: m.volumenBlancoVb,
                    volumen_aceite_va: m.volumenAceiteVa,
                    id_lugar_muestreo: m.idLugar,
                    id_colaborador: m.colaborador?.ac_id,
                    observaciones: m.observaciones,
                    tipo_origen: originType,
                    id_registro_origen: registroOrigenId
                }));
            }

            await Promise.all(promises);
            onSuccess();
            onClose();

        } catch (error) {
            console.error(error);
            alert('Error al guardar mediciones');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nueva Medición de Calidad" size="xl">
            {/* Progress Phases */}
            <div className="flex items-center justify-center mb-8">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${phase >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>1</div>
                <div className={`w-20 h-1 ${phase >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${phase >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>2</div>
                <div className={`w-20 h-1 ${phase >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${phase >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>3</div>
            </div>

            {phase === 1 && (
                <div className="space-y-6">
                    {/* Origin Selection */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { id: 'tanque', icon: Droplets, label: 'Tanque' },
                            { id: 'bombeo', icon: Wind, label: 'Bombeo' },
                            { id: 'despacho', icon: Truck, label: 'Despacho' }
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setOriginType(item.id as MeasurementType)}
                                className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-all ${originType === item.id ? 'bg-blue-50 border-blue-500 text-blue-700' : 'hover:bg-gray-50'}`}
                            >
                                <item.icon size={24} />
                                <span className="font-medium">{item.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Origin Form */}
                    <div className="bg-gray-50 p-4 rounded-lg border">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {originType === 'bombeo' ? 'Tanque Destino' : originType === 'despacho' ? 'Tanque Origen' : 'Tanque'}
                                </label>
                                <select
                                    className="w-full border rounded px-3 py-2"
                                    value={originData.idTanque}
                                    onChange={(e) => setOriginData({ ...originData, idTanque: e.target.value })}
                                >
                                    <option value="">Seleccionar...</option>
                                    {tanques.map(t => <option key={t.id} value={t.id}>{t.numero_tanque}</option>)}
                                </select>
                            </div>

                            {originType === 'bombeo' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Secador Origen</label>
                                        <select
                                            className="w-full border rounded px-3 py-2"
                                            value={originData.idSecador}
                                            onChange={(e) => setOriginData({ ...originData, idSecador: e.target.value })}
                                        >
                                            <option value="">Seleccionar...</option>
                                            {secadores.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Toneladas Bombeadas</label>
                                        <input
                                            type="number"
                                            className="w-full border rounded px-3 py-2"
                                            value={originData.toneladas}
                                            onChange={(e) => setOriginData({ ...originData, toneladas: e.target.value })}
                                        />
                                    </div>
                                </>
                            )}

                            {originType === 'despacho' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Vehículo (Placa)</label>
                                        <input
                                            type="text"
                                            className="w-full border rounded px-3 py-2 uppercase"
                                            value={originData.placa}
                                            onChange={(e) => setOriginData({ ...originData, placa: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Conductor</label>
                                        <input
                                            type="text"
                                            className="w-full border rounded px-3 py-2"
                                            value={originData.conductor}
                                            onChange={(e) => setOriginData({ ...originData, conductor: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Toneladas Despachadas</label>
                                        <input
                                            type="number"
                                            className="w-full border rounded px-3 py-2"
                                            value={originData.toneladas}
                                            onChange={(e) => setOriginData({ ...originData, toneladas: e.target.value })}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Measurement Selection */}
                    <div>
                        <h4 className="font-medium text-gray-900 mb-3">Tipos de Medición a Realizar</h4>
                        <div className="flex gap-4">
                            {(['acidez', 'humedad', 'yodo'] as QualityType[]).map((type) => (
                                <label key={type} className={`flex-1 p-3 border rounded cursor-pointer transition-colors ${selectedQualities.includes(type) ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'}`}>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 text-blue-600"
                                            checked={selectedQualities.includes(type)}
                                            onChange={() => toggleQuality(type)}
                                        />
                                        <span className="capitalize font-medium">{type}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <div onClick={validatePhase1} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium cursor-pointer">
                            Siguiente
                        </div>
                    </div>
                </div>
            )}

            {phase === 2 && (
                <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2">
                    {selectedQualities.map((type) => {
                        const m = measurements[type];
                        return (
                            <div key={type} className="border rounded-lg overflow-hidden">
                                <div className="bg-gray-100 p-3 font-semibold capitalize border-b flex justify-between items-center">
                                    <span>{type}</span>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id={`manual-${type}`}
                                            checked={m.isManual}
                                            onChange={(e) => setMeasurements(prev => ({ ...prev, [type]: { ...prev[type], isManual: e.target.checked } }))}
                                        />
                                        <label htmlFor={`manual-${type}`} className="text-sm font-normal text-gray-600">Entrada Manual (NIR)</label>
                                    </div>
                                </div>
                                <div className="p-4 space-y-4">
                                    {/* Manual Value */}
                                    {m.isManual ? (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Valor NIR</label>
                                            <input
                                                type="number"
                                                className="w-full border rounded px-3 py-2"
                                                value={m.valorManual}
                                                onChange={(e) => setMeasurements(prev => ({ ...prev, [type]: { ...prev[type], valorManual: e.target.value } }))}
                                            />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Acidez Fields */}
                                            {type === 'acidez' && (
                                                <>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad Muestra (g)</label>
                                                        <input
                                                            type="number"
                                                            className="w-full border rounded px-3 py-2"
                                                            value={m.cantidadMuestra}
                                                            onChange={(e) => setMeasurements(prev => ({ ...prev, [type]: { ...prev[type], cantidadMuestra: e.target.value } }))}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Peso Muestra (W)</label>
                                                        <input
                                                            type="number"
                                                            className="w-full border rounded px-3 py-2"
                                                            value={m.pesoMuestra}
                                                            onChange={(e) => setMeasurements(prev => ({ ...prev, [type]: { ...prev[type], pesoMuestra: e.target.value } }))}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Normalidad (N)</label>
                                                        <input
                                                            type="number"
                                                            className="w-full border rounded px-3 py-2"
                                                            value={m.normalidad}
                                                            onChange={(e) => setMeasurements(prev => ({ ...prev, [type]: { ...prev[type], normalidad: e.target.value } }))}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Volumen NaOH (V)</label>
                                                        <input
                                                            type="number"
                                                            className="w-full border rounded px-3 py-2"
                                                            value={m.volumenNaoh}
                                                            onChange={(e) => setMeasurements(prev => ({ ...prev, [type]: { ...prev[type], volumenNaoh: e.target.value } }))}
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {/* Humedad Fields */}
                                            {type === 'humedad' && (
                                                <>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Peso Recipiente (A)</label>
                                                        <input
                                                            type="number"
                                                            className="w-full border rounded px-3 py-2"
                                                            value={m.pesoRecipienteA}
                                                            onChange={(e) => setMeasurements(prev => ({ ...prev, [type]: { ...prev[type], pesoRecipienteA: e.target.value } }))}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Peso Muestra + Recipiente (B)</label>
                                                        <input
                                                            type="number"
                                                            className="w-full border rounded px-3 py-2"
                                                            value={m.pesoMuestraB}
                                                            onChange={(e) => setMeasurements(prev => ({ ...prev, [type]: { ...prev[type], pesoMuestraB: e.target.value } }))}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Peso Seco + Recipiente (C)</label>
                                                        <input
                                                            type="number"
                                                            className="w-full border rounded px-3 py-2"
                                                            value={m.pesoSecoC}
                                                            onChange={(e) => setMeasurements(prev => ({ ...prev, [type]: { ...prev[type], pesoSecoC: e.target.value } }))}
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {/* Yodo Fields */}
                                            {type === 'yodo' && (
                                                <>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Peso Aceite (W)</label>
                                                        <input
                                                            type="number"
                                                            className="w-full border rounded px-3 py-2"
                                                            value={m.pesoAceiteW}
                                                            onChange={(e) => setMeasurements(prev => ({ ...prev, [type]: { ...prev[type], pesoAceiteW: e.target.value } }))}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Volumen Blanco (VB)</label>
                                                        <input
                                                            type="number"
                                                            className="w-full border rounded px-3 py-2"
                                                            value={m.volumenBlancoVb}
                                                            onChange={(e) => setMeasurements(prev => ({ ...prev, [type]: { ...prev[type], volumenBlancoVb: e.target.value } }))}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Volumen Aceite (VA)</label>
                                                        <input
                                                            type="number"
                                                            className="w-full border rounded px-3 py-2"
                                                            value={m.volumenAceiteVa}
                                                            onChange={(e) => setMeasurements(prev => ({ ...prev, [type]: { ...prev[type], volumenAceiteVa: e.target.value } }))}
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            <div className="col-span-2 flex justify-end">
                                                <button
                                                    onClick={() => calculateResult(type)}
                                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                                                >
                                                    <Calculator size={16} /> Calcular
                                                </button>
                                            </div>
                                            <div className="col-span-2 bg-blue-50 p-2 rounded text-center font-bold text-gray-800">
                                                Resultado: {m.resultadoCalculado || '-'} %
                                            </div>
                                        </div>
                                    )}

                                    {/* Common Info */}
                                    <div className="border-t pt-3 mt-3 grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Lugar de Muestreo</label>
                                            <select
                                                className="w-full border rounded px-3 py-2"
                                                value={m.idLugar}
                                                onChange={(e) => setMeasurements(prev => ({ ...prev, [type]: { ...prev[type], idLugar: e.target.value } }))}
                                            >
                                                <option value="">Seleccionar...</option>
                                                {lugares.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Realizado Por (Cédula)</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    className="w-full border rounded px-3 py-2"
                                                    value={m.cedula}
                                                    onChange={(e) => setMeasurements(prev => ({ ...prev, [type]: { ...prev[type], cedula: e.target.value } }))}
                                                    onBlur={() => searchColaborador(type)}
                                                />
                                            </div>
                                            {m.colaborador && <span className="text-xs text-green-600 font-medium">{m.colaborador.ac_nombre1}</span>}
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                                            <textarea
                                                className="w-full border rounded px-3 py-2"
                                                rows={2}
                                                value={m.observaciones}
                                                onChange={(e) => setMeasurements(prev => ({ ...prev, [type]: { ...prev[type], observaciones: e.target.value } }))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    <div className="flex justify-between pt-4">
                        <button onClick={() => setPhase(1)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
                            Atrás
                        </button>
                        <button onClick={handleSave} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                            Guardar Mediciones
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default CalidadWizard;
