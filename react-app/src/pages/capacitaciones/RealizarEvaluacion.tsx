import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, AlertTriangle, CheckCircle } from 'lucide-react';
import ReactPlayer from 'react-player';
import SignatureCanvas from 'react-signature-canvas';
import { capacitacionService } from './services/capacitacionService';
import { useAuth } from '../../contexts/AuthProvider';
import api from '../../services/api';

const Player = ReactPlayer as any;

const RealizarEvaluacion = () => {
    const { id_header, id_formulario } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);

    // Media State
    const [playing, setPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [maxTimeAllowed, setMaxTimeAllowed] = useState(0); // For strict gating
    const playerRef = useRef<any>(null);

    // Question State
    const [visibleQuestions, setVisibleQuestions] = useState<Set<number>>(new Set());
    const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
    const [confirmedQuestions, setConfirmedQuestions] = useState<Set<number>>(new Set());
    const [answers, setAnswers] = useState<{ [key: string]: any }>({});

    // Signature State
    const [showSignature, setShowSignature] = useState(false);
    const [signMode, setSignMode] = useState<'draw' | 'type'>('draw');
    const [typedSignature, setTypedSignature] = useState('');
    const sigPadRef = useRef<SignatureCanvas>(null);

    useEffect(() => {
        loadEvaluacion();
    }, [id_header, id_formulario]);

    const loadEvaluacion = async () => {
        try {
            const res = await capacitacionService.getEvaluacion(Number(id_header), Number(id_formulario));
            if (res) {
                setData(res);
            } else {
                setError('No se pudo cargar la evaluación');
            }
        } catch (err) {
            setError('Error de conexión');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Media Logic
    const handleProgress = (state: any) => {
        const time = state.playedSeconds;
        setCurrentTime(time);

        // Strict Blocking
        if (time > maxTimeAllowed + 2) {
            playerRef.current?.seekTo(maxTimeAllowed, 'seconds');
            setPlaying(false);
            return;
        }

        // Check Gates
        checkGates(time);
    };

    const checkGates = (time: number) => {
        if (!data?.preguntas) return;

        let foundGate = false;
        data.preguntas.forEach((p: any) => {
            const trigger = parseFloat(String(p.segundo_aparicion || 0));
            if (time >= trigger && !visibleQuestions.has(p.id)) {
                // Show Question
                setVisibleQuestions(prev => new Set(prev).add(p.id));

                // Soft Pause
                if (!answeredQuestions.has(p.id)) {
                    setMaxTimeAllowed(trigger);
                    // Pause slightly after trigger to let user hear context
                    setTimeout(() => setPlaying(false), 500);
                    foundGate = true;
                }
            }
        });

        // Extend Max Time if all visible are confirmed
        if (!foundGate && !isBlocked()) {
            let nextGate = duration || 99999;
            data.preguntas.forEach((p: any) => {
                const t = parseFloat(String(p.segundo_aparicion || 0));
                if (t > maxTimeAllowed && t < nextGate) nextGate = t;
            });
            setMaxTimeAllowed(nextGate === 99999 ? duration : nextGate);
        }
    };

    const isBlocked = () => {
        for (let id of Array.from(visibleQuestions)) {
            if (!confirmedQuestions.has(id)) return true;
        }
        return false;
    };

    // Answer Logic
    const handleAnswerChange = (qId: number, value: any) => {
        setAnswers(prev => ({ ...prev, [qId]: value }));
        setAnsweredQuestions(prev => new Set(prev).add(qId));
    };

    const confirmAnswer = (qId: number) => {
        setConfirmedQuestions(prev => new Set(prev).add(qId));
        // Resume play if safely possible
        setTimeout(() => {
            if (!isBlocked() && data?.multimedia.tipo !== 'none') {
                setPlaying(true);
            }
        }, 500);
    };

    // Submit Logic
    const handleInitialSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowSignature(true);
    };

    const handleFinalSubmit = async () => {
        if (signMode === 'draw' && sigPadRef.current?.isEmpty()) {
            alert('Por favor firme para continuar');
            return;
        }
        if (signMode === 'type' && !typedSignature.trim()) {
            alert('Por favor escriba su nombre');
            return;
        }

        const signatureData = signMode === 'draw'
            ? sigPadRef.current?.toDataURL()
            : `typed:${typedSignature}`;

        const formData = new FormData();
        formData.append('id_header', String(id_header));
        formData.append('id_formulario', String(id_formulario));
        formData.append('firma', signatureData || '');

        Object.keys(answers).forEach(key => {
            formData.append(`q_${key}`, answers[key]);
        });

        const currentUser = user as any;
        formData.append('id_colaborador', currentUser?.id);

        try {
            const res = await api.post('m_capacitaciones/assets/php/evaluacion_api.php?action=save_answers', formData);
            if (res.data.success) {
                alert('Evaluación guardada correctamente');
                navigate('/evaluaciones');
            } else {
                alert('Error: ' + res.data.error);
            }
        } catch (err) {
            console.error(err);
            alert('Error al guardar');
        }
    };

    if (loading) return <div>Cargando evaluación...</div>;
    if (error) return <div className="text-red-500">Error: {error}</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                <h1 className="text-lg font-bold">{data?.header.titulo}</h1>
                <div className="text-sm opacity-80">
                    {confirmedQuestions.size} / {data?.preguntas.length} Resueltas
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Media Panel */}
                <div className={`transition-all duration-300 ${visibleQuestions.size > confirmedQuestions.size ? 'w-full md:w-2/3' : 'w-full'} bg-black relative flex items-center justify-center`}>
                    {data?.multimedia.tipo === 'youtube' || data?.multimedia.tipo === 'video' ? (
                        <Player
                            ref={playerRef}
                            url={data.multimedia.ruta_archivo}
                            width="100%"
                            height="100%"
                            playing={playing}
                            controls={false}
                            onProgress={handleProgress}
                            onDuration={setDuration}
                            progressInterval={250}
                        />
                    ) : (
                        <div className="text-white">Sin Multimedia</div>
                    )}

                    {/* Controls Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center gap-4 text-white">
                        <button onClick={() => !isBlocked() && setPlaying(!playing)} className="p-2 hover:bg-white/20 rounded-full">
                            {playing ? <Pause size={24} /> : <Play size={24} />}
                        </button>
                        <div className="flex-1 h-2 bg-gray-600 rounded-full overflow-hidden relative">
                            <div className="absolute left-0 top-0 bottom-0 bg-blue-500" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}></div>
                        </div>
                        <span className="text-sm font-mono">{Math.floor(currentTime)}s / {Math.floor(duration)}s</span>
                    </div>
                </div>

                {/* Questions Overlay / Sidebar */}
                {visibleQuestions.size > confirmedQuestions.size && (
                    <div className="absolute right-0 top-0 bottom-0 w-full md:w-1/3 bg-white shadow-2xl overflow-y-auto p-6 z-20 animate-slide-in-right">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><AlertTriangle className="text-orange-500" /> Preguntas Pendientes</h3>
                        <form onSubmit={handleInitialSubmit}>
                            {data?.preguntas.filter((p: any) => visibleQuestions.has(p.id) && !confirmedQuestions.has(p.id)).map((p: any) => (
                                <div key={p.id} className="mb-6 p-4 border border-gray-200 rounded-lg shadow-sm">
                                    <div className="font-semibold text-gray-800 mb-2">{p.enunciado}</div>

                                    {(p.tipo === 'seleccion' || p.tipo === 'verdadero_falso') && p.opciones?.map((opt: any) => (
                                        <div key={opt.id} className="form-check mb-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name={`q_${p.id}`}
                                                    value={opt.id}
                                                    className="form-radio text-blue-600 w-5 h-5"
                                                    onChange={() => handleAnswerChange(p.id, opt.id)}
                                                />
                                                <span>{opt.texto}</span>
                                            </label>
                                        </div>
                                    ))}

                                    {p.tipo === 'abierta' && (
                                        <textarea
                                            className="form-textarea w-full rounded-md border-gray-300"
                                            onChange={(e) => handleAnswerChange(p.id, e.target.value)}
                                        ></textarea>
                                    )}

                                    {answeredQuestions.has(p.id) && (
                                        <button
                                            type="button"
                                            onClick={() => confirmAnswer(p.id)}
                                            className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                                        >
                                            Confirmar y Continuar
                                        </button>
                                    )}
                                </div>
                            ))}
                        </form>
                    </div>
                )}
            </div>

            {/* Final Submit Button if Finished */}
            {!isBlocked() && confirmedQuestions.size === data?.preguntas.length && (
                <div className="absolute bottom-20 right-10 z-30 animate-bounce">
                    <button onClick={() => setShowSignature(true)} className="bg-green-600 text-white px-6 py-3 rounded-full shadow-lg font-bold flex items-center gap-2 text-lg hover:bg-green-700">
                        <CheckCircle /> Finalizar Evaluación
                    </button>
                </div>
            )}

            {/* Signature Modal */}
            {showSignature && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                        <h3 className="text-xl font-bold mb-4">Firmar Evaluación</h3>

                        <div className="flex gap-4 mb-4">
                            <button onClick={() => setSignMode('draw')} className={`flex-1 py-2 rounded-lg border ${signMode === 'draw' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200'}`}>Dibujar</button>
                            <button onClick={() => setSignMode('type')} className={`flex-1 py-2 rounded-lg border ${signMode === 'type' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200'}`}>Escribir</button>
                        </div>

                        {signMode === 'draw' ? (
                            <div className="border border-gray-300 rounded-lg bg-gray-50 mb-4 h-40">
                                <SignatureCanvas
                                    ref={sigPadRef}
                                    canvasProps={{ className: 'w-full h-full' }}
                                />
                            </div>
                        ) : (
                            <input
                                type="text"
                                className="w-full border p-3 rounded-lg mb-4 text-xl font-handwriting"
                                placeholder="Escribe tu nombre..."
                                value={typedSignature}
                                onChange={e => setTypedSignature(e.target.value)}
                            />
                        )}

                        <div className="flex justify-between gap-4">
                            {signMode === 'draw' && (
                                <button onClick={() => sigPadRef.current?.clear()} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">Borrar</button>
                            )}
                            <div className="flex gap-2 ml-auto">
                                <button onClick={() => setShowSignature(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
                                <button onClick={handleFinalSubmit} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Enviar Todo</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RealizarEvaluacion;
