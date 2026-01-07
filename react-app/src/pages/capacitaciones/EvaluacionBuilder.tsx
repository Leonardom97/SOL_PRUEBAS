import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import { capacitacionService } from './services/capacitacionService';

interface Opcion {
    id: number | string;
    texto: string;
    correcta: boolean;
    orden_correcto?: number;
}

interface Pregunta {
    id?: number;
    tipo: 'seleccion' | 'verdadero_falso' | 'texto' | 'ordenar';
    enunciado: string;
    segundo_aparicion: number;
    opciones: Opcion[];
}

interface EvaluacionStructure {
    titulo: string;
    instrucciones: string;
    multimedia: {
        ruta: string;
        tipo: string;
        titulo?: string;
    } | null;
    preguntas: Pregunta[];
}

const EvaluacionBuilder = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    const [data, setData] = useState<EvaluacionStructure>({
        titulo: '',
        instrucciones: '',
        multimedia: null,
        preguntas: []
    });

    useEffect(() => {
        if (id) loadEvaluacion(id);
    }, [id]);

    const loadEvaluacion = async (formId: string) => {
        try {
            const res = await capacitacionService.getEvaluacionStructure(formId);
            if (res.success) {
                const mapped: EvaluacionStructure = {
                    titulo: res.header?.titulo || '',
                    instrucciones: res.header?.instrucciones || '',
                    multimedia: res.multimedia ? {
                        ruta: res.multimedia.ruta_archivo,
                        tipo: res.multimedia.tipo,
                        titulo: 'Media'
                    } : null,
                    preguntas: res.preguntas || []
                };
                setData(mapped);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!id) return;
        if (!data.titulo) return alert('Ingrese un título');
        if (data.preguntas.length === 0) return alert('Agregue al menos una pregunta');

        try {
            const payload = {
                id_formulario: id,
                titulo: data.titulo,
                instrucciones: data.instrucciones,
                multimedia: data.multimedia,
                preguntas: data.preguntas
            };
            const res = await capacitacionService.saveEvaluacionStructure(payload);
            if (res.success) {
                alert('Evaluación guardada correctamente');
            } else {
                alert('Error: ' + res.error);
            }
        } catch (error) {
            console.error(error);
            alert('Error guardando');
        }
    };

    const addPregunta = (tipo: Pregunta['tipo']) => {
        const newQ: Pregunta = {
            tipo,
            enunciado: '',
            segundo_aparicion: 0,
            opciones: tipo === 'seleccion' ? [{ id: 1, texto: '', correcta: false }, { id: 2, texto: '', correcta: false }] :
                tipo === 'verdadero_falso' ? [{ id: 'v', texto: 'Verdadero', correcta: true }, { id: 'f', texto: 'Falso', correcta: false }] :
                    tipo === 'ordenar' ? [{ id: 1, texto: '', correcta: false }, { id: 2, texto: '', correcta: false }] : []
        };
        setData(prev => ({ ...prev, preguntas: [...prev.preguntas, newQ] }));
    };

    const removePregunta = (index: number) => {
        const list = [...data.preguntas];
        list.splice(index, 1);
        setData(prev => ({ ...prev, preguntas: list }));
    };

    const updatePregunta = (index: number, changes: Partial<Pregunta>) => {
        const list = [...data.preguntas];
        list[index] = { ...list[index], ...changes };
        setData(prev => ({ ...prev, preguntas: list }));
    };

    const XIcon = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;

    // Multimedia Upload Logic
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const res = await capacitacionService.uploadMultimedia(file, data.multimedia?.ruta);
            if (res.success) {
                setData(prev => ({
                    ...prev,
                    multimedia: { ruta: res.path, tipo: res.type, titulo: file.name }
                }));
            } else {
                alert('Error subiendo archivo: ' + res.error);
            }
        } catch (err) { alert('Error de red'); }
    };

    const handleYouTube = () => {
        const url = prompt('Ingrese URL de YouTube:');
        if (!url) return;
        const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        if (match && match[2].length === 11) {
            const videoId = match[2];
            setData(prev => ({
                ...prev,
                multimedia: { ruta: videoId, tipo: 'youtube', titulo: 'Video YouTube' }
            }));
        } else {
            alert('URL no válida');
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando evaluación...</div>;

    return (
        <div className="max-w-4xl mx-auto pb-20 animate-fade-in-up">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Volver"><ArrowLeft size={24} /></button>
                <h1 className="text-2xl font-bold text-gray-800">Constructor de Evaluación</h1>
                <div className="flex-1"></div>
                <button onClick={handleSave} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-bold flex items-center gap-2 shadow-sm">
                    <Save size={20} /> Guardar
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Header Config */}
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                    <div className="mb-4">
                        <label className="block text-sm font-bold text-gray-700 mb-1">Título de la Evaluación</label>
                        <input
                            type="text"
                            className="w-full text-lg border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            value={data.titulo}
                            onChange={e => setData(prev => ({ ...prev, titulo: e.target.value }))}
                            placeholder="Ej: Evaluación de Seguridad Industrial"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-bold text-gray-700 mb-1">Instrucciones</label>
                        <textarea
                            className="w-full border-gray-300 rounded-lg shadow-sm"
                            rows={3}
                            value={data.instrucciones}
                            onChange={e => setData(prev => ({ ...prev, instrucciones: e.target.value }))}
                            placeholder="Instrucciones para el evaluado..."
                        ></textarea>
                    </div>

                    {/* Multimedia Section */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h3 className="font-bold text-blue-800 mb-2">Multimedia Asociada</h3>
                        {data.multimedia ? (
                            <div className="flex items-center gap-3 bg-white p-3 rounded shadow-sm">
                                <span className="font-bold text-gray-700">{data.multimedia.titulo || data.multimedia.tipo}</span>
                                <button
                                    onClick={() => setData(prev => ({ ...prev, multimedia: null }))}
                                    className="text-red-500 hover:text-red-700 text-sm ml-auto"
                                >
                                    Quitar
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-4">
                                <label className="cursor-pointer bg-white border border-blue-200 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 flex items-center gap-2">
                                    Subir Video/PDF
                                    <input type="file" className="hidden" accept="video/*,application/pdf" onChange={handleFileUpload} />
                                </label>
                                <button onClick={handleYouTube} className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 flex items-center gap-2">
                                    YouTube Link
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Questions List */}
                <div className="p-6 bg-gray-50">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center justify-between">
                        Preguntas ({data.preguntas.length})
                        <div className="flex gap-2 text-sm">
                            <button onClick={() => addPregunta('seleccion')} className="px-3 py-1 bg-white border rounded hover:bg-gray-100">+ Selección</button>
                            <button onClick={() => addPregunta('verdadero_falso')} className="px-3 py-1 bg-white border rounded hover:bg-gray-100">+ V/F</button>
                            <button onClick={() => addPregunta('texto')} className="px-3 py-1 bg-white border rounded hover:bg-gray-100">+ Abierta</button>
                        </div>
                    </h3>

                    <div className="space-y-6">
                        {data.preguntas.map((q, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 relative group">
                                <button
                                    onClick={() => removePregunta(idx)}
                                    className="absolute top-2 right-2 text-gray-300 hover:text-red-500"
                                >
                                    <XIcon size={20} />
                                </button>

                                <div className="grid grid-cols-12 gap-4 mb-3">
                                    <div className="col-span-1 flex items-center justify-center font-bold text-gray-300 text-xl">
                                        {idx + 1}
                                    </div>
                                    <div className="col-span-11 space-y-3">
                                        <input
                                            type="text"
                                            className="w-full font-medium border-0 border-b border-gray-200 focus:ring-0 focus:border-blue-500 px-0 placeholder-gray-300"
                                            placeholder="Ingrese el enunciado de la pregunta..."
                                            value={q.enunciado}
                                            onChange={e => updatePregunta(idx, { enunciado: e.target.value })}
                                        />

                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <span>Minuto de aparición (seg):</span>
                                            <input
                                                type="number"
                                                className="w-20 border rounded px-2 py-1"
                                                value={q.segundo_aparicion}
                                                onChange={e => updatePregunta(idx, { segundo_aparicion: Number(e.target.value) })}
                                            />
                                        </div>

                                        {/* Options Editor Inline */}
                                        <div className="border-l-2 border-gray-100 pl-4 mt-2">
                                            {q.tipo === 'texto' ? (
                                                <div className="text-gray-400 italic text-sm">Respuesta libre.</div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {q.opciones.map((opt, oIdx) => (
                                                        <div key={oIdx} className="flex items-center gap-2">
                                                            <input
                                                                type={q.tipo === 'seleccion' ? 'checkbox' : 'radio'}
                                                                name={`Correct-${idx}`}
                                                                checked={opt.correcta}
                                                                onChange={e => {
                                                                    const newOpts = [...q.opciones];
                                                                    newOpts[oIdx].correcta = e.target.checked;
                                                                    if (q.tipo === 'verdadero_falso') {
                                                                        newOpts.forEach((o, i) => { if (i !== oIdx) o.correcta = false; });
                                                                    }
                                                                    updatePregunta(idx, { opciones: newOpts });
                                                                }}
                                                                className="w-4 h-4 text-blue-600"
                                                            />
                                                            <input
                                                                type="text"
                                                                className="flex-1 text-sm border-0 bg-gray-50 rounded px-2 py-1"
                                                                value={opt.texto}
                                                                onChange={e => {
                                                                    const newOpts = [...q.opciones];
                                                                    newOpts[oIdx].texto = e.target.value;
                                                                    updatePregunta(idx, { opciones: newOpts });
                                                                }}
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    const newOpts = [...q.opciones];
                                                                    newOpts.splice(oIdx, 1);
                                                                    updatePregunta(idx, { opciones: newOpts });
                                                                }}
                                                                className="text-gray-400 hover:text-red-500"
                                                            >
                                                                x
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {(q.tipo === 'seleccion') && (
                                                        <button
                                                            onClick={() => updatePregunta(idx, { opciones: [...q.opciones, { id: Date.now(), texto: '', correcta: false }] })}
                                                            className="text-xs text-blue-500 hover:underline"
                                                        >
                                                            + Agregar Opción
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {data.preguntas.length === 0 && (
                        <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                            Empieza agregando una pregunta arriba
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EvaluacionBuilder;
