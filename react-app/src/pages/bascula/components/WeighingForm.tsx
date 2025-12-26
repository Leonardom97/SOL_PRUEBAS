import { useState, useEffect } from 'react';
import { LogIn, LogOut, Save, Search, Loader2, ArrowRight } from 'lucide-react';
import { basculaService, type CatalogoItem } from '../services/basculaService';
import { useAuth } from '../../../contexts/AuthProvider';

export default function WeighingForm({
    onSuccess,
    currentWeight
}: {
    onSuccess: () => void;
    currentWeight: number;
}) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'entrada' | 'salida'>('entrada');
    const [loading, setLoading] = useState(false);

    // Catalogs
    // const [procedencias, setProcedencias] = useState<CatalogoItem[]>([]); // Removed unused state
    const [placas, setPlacas] = useState<CatalogoItem[]>([]);
    const [transacciones, setTransacciones] = useState<CatalogoItem[]>([]);
    const [productos, setProductos] = useState<CatalogoItem[]>([]);
    const [docOrigen, setDocOrigen] = useState<CatalogoItem[]>([]);
    const [siembras, setSiembras] = useState<CatalogoItem[]>([]);
    const [origenes, setOrigenes] = useState<CatalogoItem[]>([]);

    // Form State - Entrada
    const [entradaData, setEntradaData] = useState({
        procedencia: '',
        placa: '',
        conductor: '',
        tara: '',
        transaccion: '',
        producto: '',
        siembra: '',
        tipoProcedencia: '',
        origen: '',
        docOrigen: '',
        numDocumento: ''
    });

    // Form State - Salida
    const [busquedaPlaca, setBusquedaPlaca] = useState('');
    const [infoSalida, setInfoSalida] = useState<any>(null);
    const [salidaData, setSalidaData] = useState({
        producto: '',
        pesoBruto: ''
    });

    useEffect(() => {
        loadInitialCatalogs();
    }, []);

    // Sync current weight to output if relevant
    useEffect(() => {
        if (activeTab === 'salida' && infoSalida) {
            // Optional: Auto-fill weight if requested? For now we leave it to manual "Leer" action usually, 
            // but user might want it auto-updated? Legacy allows manual input or "Read" button sync.
            // We'll let user manually type or click a "Usar Peso" button if we added one, 
            // but for now we follow legacy which has an input that can be typed or filled.
            // We can use a button near the input to "Usar Indicador".
        }
    }, [currentWeight, activeTab, infoSalida]); // Added dependencies

    const loadInitialCatalogs = async () => {
        try {
            const [trans, prod, doc, siem] = await Promise.all([
                basculaService.getTransacciones(),
                basculaService.getProductos(),
                basculaService.getDocOrigen(),
                basculaService.getSiembras()
            ]);
            setTransacciones(trans);
            setProductos(prod);
            setDocOrigen(doc);
            setSiembras(siem);
        } catch (error) {
            console.error('Error loading catalogs', error);
        }
    };

    // --- ENTRADA HANDLERS ---

    const handleProcedenciaChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setEntradaData(prev => ({ ...prev, procedencia: val, placa: '', conductor: '', tara: '' }));
        setPlacas([]);

        if (val) {
            try {
                const data = await basculaService.getPlacasByProcedencia(val);
                setPlacas(data);
            } catch (error) { console.error(error); }
        }
    };

    const handlePlacaChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setEntradaData(prev => ({ ...prev, placa: val }));

        if (val) {
            try {
                const info = await basculaService.getVehiculoInfo(val);
                setEntradaData(prev => ({
                    ...prev,
                    conductor: info.conductor || '',
                    tara: info.tara || ''
                }));
            } catch (error) { console.error(error); }
        }
    };

    const handleTipoProcedenciaChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setEntradaData(prev => ({ ...prev, tipoProcedencia: val, origen: '' }));
        setOrigenes([]);

        if (val) {
            try {
                const data = await basculaService.getProcedencia(val);
                setOrigenes(data);
            } catch (error) { console.error(error); }
        }
    };

    const handleTransaccionChange = async (val: string) => {
        setEntradaData(prev => ({ ...prev, transaccion: val }));
        // Trigger doc number update if we have all needed fields
        updateDocNumber(val, entradaData.origen, entradaData.siembra);
    };

    const handleOrigenChange = async (val: string) => {
        setEntradaData(prev => ({ ...prev, origen: val }));
        updateDocNumber(entradaData.transaccion, val, entradaData.siembra);
    };

    const updateDocNumber = async (trans: string, orig: string, siem: string) => {
        if (trans && orig) {
            try {
                const docNum = await basculaService.getDocumentNumber(trans, orig, siem);
                if (docNum) setEntradaData(prev => ({ ...prev, numDocumento: docNum }));
            } catch (error) { console.error(error); }
        }
    };

    const submitEntrada = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return alert('No user');
        setLoading(true);

        const payload = {
            placa: entradaData.placa,
            conductor: entradaData.conductor,
            siembra: entradaData.siembra,
            tt_codigo: parseInt(entradaData.transaccion),
            tpr_codigo: entradaData.origen,
            tp_codigo: entradaData.producto,
            do_codigo: parseInt(entradaData.docOrigen),
            num_documento: entradaData.numDocumento,
            tara: parseInt(entradaData.tara),
            au_codigo: (user as any).codigo || 0 // Cast to any to access legacy property
        };

        try {
            await basculaService.createEntrada(payload);
            onSuccess();
            // Reset crucial fields
            setEntradaData(prev => ({
                ...prev,
                placa: '', conductor: '', tara: '',
                transaccion: '', producto: '', numDocumento: ''
            }));
            alert('Entrada registrada correcta');
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    // --- SALIDA HANDLERS ---

    const searchPlaca = async () => {
        if (!busquedaPlaca) return;
        setLoading(true);
        try {
            const results = await basculaService.searchByPlaca(busquedaPlaca);
            if (results && results.length > 0) {
                setInfoSalida(results[0]);
                setSalidaData(prev => ({ ...prev, pesoBruto: '' })); // Reset weight
            } else {
                alert('No se encontró entrada activa para esta placa');
                setInfoSalida(null);
            }
        } catch (error: any) {
            alert(error instanceof Error ? error.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
    };

    const submitSalida = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!infoSalida) return;
        setLoading(true);

        const pesoBruto = parseInt(salidaData.pesoBruto);
        const pesoTara = parseInt(infoSalida.peso_tara);

        const payload = {
            codigo: parseInt(infoSalida.codigo),
            tp_codigo: salidaData.producto,
            peso_bruto: pesoBruto,
            peso_neto: pesoBruto - pesoTara
        };

        try {
            await basculaService.createSalida(payload);
            onSuccess();
            setInfoSalida(null);
            setBusquedaPlaca('');
            alert('Salida registrada correcta');
        } catch (error: any) {
            alert(error instanceof Error ? error.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
    };

    const copyWeightToBruto = () => {
        setSalidaData(prev => ({ ...prev, pesoBruto: currentWeight.toString() }));
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
            {/* Tabs */}
            <div className="flex border-b border-gray-100">
                <button
                    onClick={() => setActiveTab('entrada')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 relative ${activeTab === 'entrada' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <LogIn size={16} /> Entrada
                    {activeTab === 'entrada' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('salida')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 relative ${activeTab === 'salida' ? 'text-green-600 bg-green-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <LogOut size={16} /> Salida
                    {activeTab === 'salida' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600"></div>}
                </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
                {activeTab === 'entrada' ? (
                    <form onSubmit={submitEntrada} className="space-y-4">
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b pb-2">Datos Vehículo</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Procedencia</label>
                                    <select required className="input-field w-full" value={entradaData.procedencia} onChange={handleProcedenciaChange}>
                                        <option value="">- Seleccione -</option>
                                        <option value="1">SEMAG</option>
                                        <option value="2">SAN MARCOS</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Placa</label>
                                    <select required className="input-field w-full uppercase" value={entradaData.placa} onChange={handlePlacaChange}>
                                        <option value="">- Seleccione Procedencia -</option>
                                        {placas.map(p => <option key={p.codigo} value={p.codigo}>{p.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Conductor</label>
                                    <input type="text" readOnly className="input-field w-full bg-gray-50" value={entradaData.conductor} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Tara (kg)</label>
                                    <input type="number" readOnly className="input-field w-full bg-gray-50 font-mono" value={entradaData.tara} />
                                </div>
                            </div>

                            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b pb-2 mt-6">Transacción</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo Transacción</label>
                                    <select required className="input-field w-full" value={entradaData.transaccion} onChange={e => handleTransaccionChange(e.target.value)}>
                                        <option value="">- Seleccione -</option>
                                        {transacciones.map(t => <option key={t.codigo} value={t.codigo}>{t.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Producto</label>
                                    <select required className="input-field w-full" value={entradaData.producto} onChange={e => setEntradaData(p => ({ ...p, producto: e.target.value }))}>
                                        <option value="">- Seleccione -</option>
                                        {productos.map(t => <option key={t.codigo} value={t.codigo}>{t.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Siembra</label>
                                    <select className="input-field w-full" value={entradaData.siembra} onChange={e => setEntradaData(p => ({ ...p, siembra: e.target.value }))}>
                                        <option value="">- Opcional -</option>
                                        {siembras.map(t => <option key={t.codigo} value={t.codigo}>{t.nombre}</option>)}
                                    </select>
                                </div>
                            </div>

                            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b pb-2 mt-6">Origen</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo Procedencia</label>
                                    <select required className="input-field w-full" value={entradaData.tipoProcedencia} onChange={handleTipoProcedenciaChange}>
                                        <option value="">- Seleccione -</option>
                                        <option value="1">Centro de Costo</option>
                                        <option value="2">Proveedor</option>
                                        <option value="3">Cliente</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Origen</label>
                                    <select required className="input-field w-full" value={entradaData.origen} onChange={e => handleOrigenChange(e.target.value)}>
                                        <option value="">- Seleccione Tipo -</option>
                                        {origenes.map(t => <option key={t.codigo} value={t.codigo}>{t.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Doc. Origen</label>
                                    <select required className="input-field w-full" value={entradaData.docOrigen} onChange={e => setEntradaData(p => ({ ...p, docOrigen: e.target.value }))}>
                                        <option value="">- Seleccione -</option>
                                        {docOrigen.map(t => <option key={t.codigo} value={t.codigo}>{t.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Nº Documento</label>
                                    <input type="text" className="input-field w-full" value={entradaData.numDocumento} onChange={e => setEntradaData(p => ({ ...p, numDocumento: e.target.value }))} />
                                </div>
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-all flex justify-center items-center gap-2 mt-6">
                            {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                            Registrar Entrada
                        </button>
                    </form>
                ) : (
                    <form onSubmit={submitSalida} className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                            <label className="block text-sm font-semibold text-gray-700">Buscar Vehículo</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Ingrese placa..."
                                    className="input-field flex-1 uppercase"
                                    value={busquedaPlaca}
                                    onChange={e => setBusquedaPlaca(e.target.value)}
                                />
                                <button type="button" onClick={searchPlaca} className="btn-secondary flex items-center gap-2">
                                    <Search size={18} /> Buscar
                                </button>
                            </div>
                        </div>

                        {infoSalida && (
                            <div className="animate-in fade-in slide-in-from-bottom-2">
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                        <div className="text-xs text-blue-600 uppercase font-bold">Placa</div>
                                        <div className="text-lg font-mono font-bold text-gray-800">{infoSalida.placa}</div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <div className="text-xs text-gray-500 uppercase font-bold">Conductor</div>
                                        <div className="text-sm text-gray-800 truncate">{infoSalida.conductor}</div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <div className="text-xs text-gray-500 uppercase font-bold">Tara</div>
                                        <div className="text-lg font-mono text-gray-800">{infoSalida.peso_tara} kg</div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <div className="text-xs text-gray-500 uppercase font-bold">Entrada</div>
                                        <div className="text-xs text-gray-800">{infoSalida.fecha_entrada}</div>
                                    </div>
                                </div>

                                <div className="space-y-4 border-t pt-4">
                                    <h4 className="text-sm font-bold text-green-700 uppercase tracking-wide">Registro de Salida</h4>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Producto Final</label>
                                            <select required className="input-field w-full" value={salidaData.producto} onChange={e => setSalidaData(p => ({ ...p, producto: e.target.value }))}>
                                                <option value="">- Seleccione -</option>
                                                {productos.map(t => <option key={t.codigo} value={t.codigo}>{t.nombre}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Peso Bruto</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    required
                                                    className="input-field w-full pr-10 font-bold text-lg"
                                                    value={salidaData.pesoBruto}
                                                    onChange={e => setSalidaData(p => ({ ...p, pesoBruto: e.target.value }))}
                                                />
                                                <div className="absolute right-2 top-2 text-gray-400 text-xs">kg</div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={copyWeightToBruto}
                                            className="h-10 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                                        >
                                            <ArrowRight size={14} /> Usar {currentWeight} kg
                                        </button>
                                    </div>

                                    {salidaData.pesoBruto && (
                                        <div className="bg-green-50 p-4 rounded-lg border border-green-100 flex justify-between items-center">
                                            <span className="text-green-800 font-semibold">Peso Neto Calculado:</span>
                                            <span className="text-2xl font-bold text-green-700 font-mono">
                                                {parseInt(salidaData.pesoBruto) - parseInt(infoSalida.peso_tara)} kg
                                            </span>
                                        </div>
                                    )}

                                    <button type="submit" disabled={loading} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-sm transition-all flex justify-center items-center gap-2 mt-2">
                                        {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                                        Registrar Salida
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
}
