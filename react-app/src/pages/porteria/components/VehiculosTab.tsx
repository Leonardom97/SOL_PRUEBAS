import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Loader2 } from 'lucide-react';
import api from '../../../services/api';
import Modal from '../../../components/ui/Modal';

interface Vehiculo {
    id: string;
    placa: string;
    tipo_vehiculo: string;
    empresa: string;
    propio_externo: string;
    soat_fecha_vencimiento: string;
    tecnomecanica_fecha_vencimiento: string;
    poliza_terceros_fecha_vencimiento: string;
    area_perteneciente: string;
    estado_vehiculo: string;
}

export default function VehiculosTab() {
    const [data, setData] = useState<Vehiculo[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Vehiculo | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/m_porteria/assets/php/porteria_api.php?action=get_vehiculos');
            if (res.data && res.data.data) {
                setData(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching vehiculos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);
        const formData = new FormData(e.currentTarget);
        const submitData = Object.fromEntries(formData.entries());

        // For consistency with legacy, keep id in data if editing
        if (editingItem) {
            submitData.id = editingItem.id;
        }

        try {
            const res = await api.post('/m_porteria/assets/php/porteria_api.php?action=save_vehiculo', submitData);
            if (res.data.status === 'success') {
                setIsModalOpen(false);
                fetchData();
            } else {
                alert('Error: ' + res.data.message);
            }
        } catch (error) {
            console.error('Error saving vehiculo:', error);
            alert('Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const checkExpiration = (dateStr: string) => {
        if (!dateStr || dateStr === '0000-00-00') return 'none';
        const date = new Date(dateStr);
        const now = new Date();
        const diffTime = date.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'expired';
        if (diffDays < 30) return 'warning';
        return 'ok';
    };

    const getExpirationClass = (status: string) => {
        switch (status) {
            case 'expired': return 'text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded';
            case 'warning': return 'text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded';
            default: return 'text-gray-600';
        }
    };

    const filteredData = data.filter(item =>
        item.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.empresa?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <div className="relative w-full max-w-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={16} className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por placa o empresa..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
                >
                    <Plus size={16} /> Nuevo Vehículo
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3">Placa</th>
                            <th className="px-4 py-3">Tipo</th>
                            <th className="px-4 py-3">Empresa</th>
                            <th className="px-4 py-3">Estado</th>
                            <th className="px-4 py-3">Venc. SOAT</th>
                            <th className="px-4 py-3">Venc. Tecno</th>
                            <th className="px-4 py-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="text-center py-8">Cargando...</td></tr>
                        ) : filteredData.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-8 text-gray-500">No se encontraron vehículos.</td></tr>
                        ) : (
                            filteredData.map((item) => (
                                <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">{item.placa}</td>
                                    <td className="px-4 py-3 capitalize">{item.tipo_vehiculo}</td>
                                    <td className="px-4 py-3">{item.empresa || '-'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.estado_vehiculo === 'activo' ? 'bg-green-100 text-green-800' :
                                            item.estado_vehiculo === 'mantenimiento' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {item.estado_vehiculo}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={getExpirationClass(checkExpiration(item.soat_fecha_vencimiento))}>
                                            {item.soat_fecha_vencimiento || '-'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={getExpirationClass(checkExpiration(item.tecnomecanica_fecha_vencimiento))}>
                                            {item.tecnomecanica_fecha_vencimiento || '-'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                                            className="text-blue-600 hover:text-blue-800 p-1"
                                            title="Editar"
                                        >
                                            <Edit size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingItem ? 'Editar Vehículo' : 'Nuevo Vehículo'}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Placa</label>
                            <input
                                type="text"
                                name="placa"
                                defaultValue={editingItem?.placa}
                                className="mt-1 block w-full rounded-md border-gray-300 border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm uppercase"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tipo</label>
                            <select
                                name="tipo_vehiculo"
                                defaultValue={editingItem?.tipo_vehiculo || 'pequeno'}
                                className="mt-1 block w-full rounded-md border-gray-300 border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            >
                                <option value="pequeno">Pequeño</option>
                                <option value="camioneta">Camioneta</option>
                                <option value="camion">Camión</option>
                                <option value="tractomula">Tractomula</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Empresa</label>
                            <input
                                type="text"
                                name="empresa"
                                defaultValue={editingItem?.empresa}
                                className="mt-1 block w-full rounded-md border-gray-300 border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Propiedad</label>
                            <select
                                name="propio_externo"
                                defaultValue={editingItem?.propio_externo || 'externo'}
                                className="mt-1 block w-full rounded-md border-gray-300 border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            >
                                <option value="propio">Propio</option>
                                <option value="externo">Externo</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Estado</label>
                            <select
                                name="estado_vehiculo"
                                defaultValue={editingItem?.estado_vehiculo || 'activo'}
                                className="mt-1 block w-full rounded-md border-gray-300 border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            >
                                <option value="activo">Activo</option>
                                <option value="inactivo">Inactivo</option>
                                <option value="mantenimiento">Mantenimiento</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Área</label>
                            <select
                                name="area_perteneciente"
                                defaultValue={editingItem?.area_perteneciente || 'operativa'}
                                className="mt-1 block w-full rounded-md border-gray-300 border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            >
                                <option value="logistica">Logística</option>
                                <option value="administrativa">Administrativa</option>
                                <option value="operativa">Operativa</option>
                            </select>
                        </div>

                        <div className="col-span-2 mt-2">
                            <h4 className="text-sm font-semibold text-blue-600 border-b pb-1 mb-2">Vencimientos</h4>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">SOAT</label>
                            <input
                                type="date"
                                name="soat_fecha_vencimiento"
                                defaultValue={editingItem?.soat_fecha_vencimiento}
                                className="mt-1 block w-full rounded-md border-gray-300 border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tecnomecánica</label>
                            <input
                                type="date"
                                name="tecnomecanica_fecha_vencimiento"
                                defaultValue={editingItem?.tecnomecanica_fecha_vencimiento}
                                className="mt-1 block w-full rounded-md border-gray-300 border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Póliza 3ros</label>
                            <input
                                type="date"
                                name="poliza_terceros_fecha_vencimiento"
                                defaultValue={editingItem?.poliza_terceros_fecha_vencimiento}
                                className="mt-1 block w-full rounded-md border-gray-300 border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:bg-blue-400 flex items-center gap-2"
                        >
                            {saving && <Loader2 size={16} className="animate-spin" />}
                            {editingItem ? 'Actualizar' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
