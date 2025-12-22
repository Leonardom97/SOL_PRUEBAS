import { useState } from 'react';
import { Truck, User } from 'lucide-react';
import VehiculosTab from './components/VehiculosTab';
import ConductoresTab from './components/ConductoresTab';

export default function Inventario() {
    const [activeTab, setActiveTab] = useState<'vehiculos' | 'conductores'>('vehiculos');

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Inventario Portería</h1>
                    <p className="text-gray-600">Gestión de base de datos de vehículos y conductores.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                <div className="flex border-b border-gray-100">
                    <button
                        onClick={() => setActiveTab('vehiculos')}
                        className={`flex-1 py-4 text-center font-medium text-sm flex items-center justify-center gap-2 transition-colors relative
                            ${activeTab === 'vehiculos' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}
                        `}
                    >
                        <Truck size={18} />
                        Vehículos
                        {activeTab === 'vehiculos' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('conductores')}
                        className={`flex-1 py-4 text-center font-medium text-sm flex items-center justify-center gap-2 transition-colors relative
                            ${activeTab === 'conductores' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}
                        `}
                    >
                        <User size={18} />
                        Conductores
                        {activeTab === 'conductores' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                        )}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[500px]">
                {activeTab === 'vehiculos' ? <VehiculosTab /> : <ConductoresTab />}
            </div>
        </div>
    );
}
