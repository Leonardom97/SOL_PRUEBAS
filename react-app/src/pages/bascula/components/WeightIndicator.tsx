import { useState, useEffect, useRef } from 'react';
import { Scale, RefreshCw, RotateCcw, Play, Square, Wifi } from 'lucide-react';
import { basculaService, type WeighingData } from '../services/basculaService';

export default function WeightIndicator({ onWeightRead }: { onWeightRead?: (weight: number) => void }) {
    const [weight, setWeight] = useState<number>(0);
    const [stable, setStable] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(false);
    const [continuousMode, setContinuousMode] = useState<boolean>(false);
    const intervalRef = useRef<any>(null);

    const readWeight = async () => {
        try {
            setLoading(true);
            const data: WeighingData = await basculaService.readWeight();
            setWeight(data.weight);
            setStable(data.stable);
            if (onWeightRead) onWeightRead(data.weight);
        } catch (error) {
            console.error('Error reading weight', error);
        } finally {
            setLoading(false);
        }
    };

    const tareScale = async () => {
        try {
            setLoading(true);
            await basculaService.tareScale();
            // Wait a bit before reading again
            setTimeout(readWeight, 1000);
        } catch (error) {
            alert('Error al tarar la báscula');
        } finally {
            setLoading(false);
        }
    };

    const toggleContinuous = () => {
        if (continuousMode) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setContinuousMode(false);
        } else {
            setContinuousMode(true);
            readWeight(); // Read immediately
            intervalRef.current = setInterval(() => {
                basculaService.readWeight().then(data => {
                    setWeight(data.weight);
                    setStable(data.stable);
                    if (onWeightRead) onWeightRead(data.weight);
                }).catch(console.error);
            }, 1000);
        }
    };

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Scale className="text-blue-600" />
                    Indicador de Peso
                </h3>
                <div className={`w-3 h-3 rounded-full ${stable ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} title={stable ? 'Estable' : 'Inestable'}></div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-center relative overflow-hidden">
                <div className="text-5xl font-mono font-bold text-gray-800 tracking-wider">
                    {weight} <span className="text-xl text-gray-500">kg</span>
                </div>
                <div className="absolute bottom-2 right-4 flex items-center gap-1 text-xs text-gray-400">
                    <Wifi size={12} /> Connected
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <button
                    onClick={readWeight}
                    disabled={loading || continuousMode}
                    className="flex flex-col items-center justify-center gap-1 py-3 px-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    <RefreshCw size={18} className={loading && !continuousMode ? 'animate-spin' : ''} />
                    <span className="text-xs font-medium">Leer Peso</span>
                </button>
                <button
                    onClick={tareScale}
                    disabled={loading || continuousMode}
                    className="flex flex-col items-center justify-center gap-1 py-3 px-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                    <RotateCcw size={18} />
                    <span className="text-xs font-medium">Tarar</span>
                </button>
                <button
                    onClick={toggleContinuous}
                    className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-lg transition-colors text-white ${continuousMode ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}
                >
                    {continuousMode ? <Square size={18} /> : <Play size={18} />}
                    <span className="text-xs font-medium">{continuousMode ? 'Detener' : 'Continuo'}</span>
                </button>
            </div>
        </div>
    );
}
