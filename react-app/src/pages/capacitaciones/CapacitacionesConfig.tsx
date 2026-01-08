import React, { useState, useEffect } from 'react';
import { Plus, Edit, ToggleLeft, ToggleRight, Save } from 'lucide-react';
import { capacitacionService } from './services/capacitacionService';
import Modal from '../../components/ui/Modal';

interface CatalogItem {
    id: number;
    nombre: string;
    activo?: boolean | number;
}

const CapacitacionesConfig = () => {
    // Data States
    const [temas, setTemas] = useState<CatalogItem[]>([]);
    const [procesos, setProcesos] = useState<CatalogItem[]>([]);
    const [lugares, setLugares] = useState<CatalogItem[]>([]);
    const [tipos, setTipos] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtered/Active Tab state
    const [activeTab, setActiveTab] = useState<'tema' | 'proceso' | 'lugar' | 'tactividad'>('tema');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
    const [itemName, setItemName] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await capacitacionService.getMasterData();
            setTemas(data.temas);
            setProcesos(data.procesos);
            setLugares(data.lugares);
            setTipos(data.tipos);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingItem(null);
        setItemName('');
        setIsModalOpen(true);
    };

    const handleEdit = (item: CatalogItem) => {
        setEditingItem(item);
        setItemName(item.nombre);
        setIsModalOpen(true);
    };

    const handleToggleStatus = async (item: CatalogItem, type: 'tema' | 'proceso' | 'lugar' | 'tactividad') => {
        if (!confirm(`¿${isActive(item) ? 'Inactivar' : 'Activar'} este registro?`)) return;
        try {
            const action = isActive(item) ? 'inactivar' : 'activar';
            const res = await capacitacionService.saveMasterData(type, action, { id: item.id });
            if (res.success) {
                // Update local state without reload
                updateLocalState(type, item.id, { activo: action === 'activar' });
            } else {
                alert('Error: ' + res.error);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const action = editingItem ? 'update' : 'add';
            const payload = {
                id: editingItem?.id,
                nombre: itemName
            };
            const res = await capacitacionService.saveMasterData(activeTab, action, payload);

            if (res.success) {
                setIsModalOpen(false);
                loadData(); // Reload to get updated IDs and lists
            } else {
                alert('Error: ' + res.error);
            }
        } catch (e) {
            console.error(e);
            alert('Error al guardar');
        }
    };

    const updateLocalState = (type: string, id: number, changes: Partial<CatalogItem>) => {
        const updater = (prev: CatalogItem[]) => prev.map(i => i.id === id ? { ...i, ...changes } : i);
        if (type === 'tema') setTemas(updater);
        if (type === 'proceso') setProcesos(updater);
        if (type === 'lugar') setLugares(updater);
        if (type === 'tactividad') setTipos(updater);
    };

    const isActive = (item: CatalogItem) => {
        if (typeof item.activo === 'boolean') return item.activo;
        return item.activo === 1; // Sometimes comes as 1/0
    };

    const renderList = (data: CatalogItem[], type: 'tema' | 'proceso' | 'lugar' | 'tactividad') => {
        if (loading) return <div className="text-center py-8">Cargando...</div>;
        if (data.length === 0) return <div className="text-center py-8 text-gray-500">No hay registros</div>;

        return (
            <div className="bg-white rounded-lg shadow border overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 uppercase">
                        <tr>
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">Nombre</th>
                            <th className="px-4 py-3 text-center">Estado</th>
                            <th className="px-4 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 w-16">{item.id}</td>
                                <td className="px-4 py-3 font-medium text-gray-900">{item.nombre}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${isActive(item) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {isActive(item) ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleToggleStatus(item, type)} className={`p-1.5 rounded transition ${isActive(item) ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`} title={isActive(item) ? 'Inactivar' : 'Activar'} aria-label={isActive(item) ? 'Inactivar' : 'Activar'}>
                                            {isActive(item) ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                        </button>
                                        <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition" aria-label="Editar">
                                            <Edit size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const getTabLabel = (tab: string) => {
        if (tab === 'tema') return 'Temas';
        if (tab === 'proceso') return 'Procesos';
        if (tab === 'lugar') return 'Lugares';
        if (tab === 'tactividad') return 'Tipos de Actividad';
        return '';
    };

    return (
        <div className="space-y-6 animate-fade-in-up pb-10">
            <h2 className="text-2xl font-bold text-gray-800">Configuración de Maestros</h2>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Sidebar / Tabs */}
                <div className="w-full md:w-64 flex flex-col gap-2">
                    {(['tema', 'proceso', 'lugar', 'tactividad'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-3 text-left rounded-lg font-medium transition-colors ${activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border border-transparent hover:border-gray-200'}`}
                        >
                            {getTabLabel(tab)}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-semibold text-gray-700">{getTabLabel(activeTab)}</h3>
                        <button onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm transition">
                            <Plus size={18} /> Agregar
                        </button>
                    </div>

                    {activeTab === 'tema' && renderList(temas, 'tema')}
                    {activeTab === 'proceso' && renderList(procesos, 'proceso')}
                    {activeTab === 'lugar' && renderList(lugares, 'lugar')}
                    {activeTab === 'tactividad' && renderList(tipos, 'tactividad')}
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingItem ? 'Editar' : 'Agregar'} ${getTabLabel(activeTab)}`}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                        <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            required
                            placeholder={`Nombre del ${activeTab === 'tactividad' ? 'tipo' : activeTab}...`}
                        />
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                            <Save size={18} /> Guardar
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default CapacitacionesConfig;
