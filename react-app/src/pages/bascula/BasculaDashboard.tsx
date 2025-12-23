import { useState } from 'react';
import { Scale } from 'lucide-react';
import WeightIndicator from './components/WeightIndicator';
import WeighingForm from './components/WeighingForm';
import RecentWeighings from './components/RecentWeighings';
import { Link } from 'react-router-dom';

export default function BasculaDashboard() {
    const [weight, setWeight] = useState(0);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleSuccess = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Scale className="text-blue-600" />
                        Operación de Pesaje
                    </h1>
                    <p className="text-gray-600">Gestión de entrada y salida de vehículos</p>
                </div>
                <div>
                    <Link to="/bascula/reportes" className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors shadow-sm">
                        Ver Reportes
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Indicator & Recent (Takes 4 cols on massive screens, 12 on mobile) */}
                <div className="lg:col-span-4 space-y-6">
                    <WeightIndicator onWeightRead={setWeight} />
                    <div className="h-[500px]">
                        <RecentWeighings refreshTrigger={refreshTrigger} />
                    </div>
                </div>

                {/* Right Column: Main Form (Takes 8 cols) */}
                <div className="lg:col-span-8 h-full">
                    <WeighingForm onSuccess={handleSuccess} currentWeight={weight} />
                </div>
            </div>
        </div>
    );
}
