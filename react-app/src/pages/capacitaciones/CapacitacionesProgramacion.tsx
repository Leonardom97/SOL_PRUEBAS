import { useState, useEffect } from 'react';
import { Plus, Upload, X, Edit, Trash } from 'lucide-react';
import api from '../../services/api';
import Modal from '../../components/ui/Modal';
import * as XLSX from 'xlsx';

interface Programacion {
    id: number;
    cargo_nombre: string;
    sub_area_nombre?: string;
    tema_nombre: string;
    frecuencia_meses: number;
    rol_capacitador_nombre: string;
    fecha_proxima_capacitacion: string;
    fecha_notificacion_previa?: string;
    colaboradores_pendientes: number;
    id_cargo: number | string;
    sub_area: string;
    id_tema: number | string;
    id_rol_capacitador: number | string;
}

interface Option {
    id: number | string;
    name: string;
}

const CapacitacionesProgramacion = () => {
    const [programaciones, setProgramaciones] = useState<Programacion[]>([]);
    const [filteredData, setFilteredData] = useState<Programacion[]>([]);
    const [loading, setLoading] = useState(true);

    // Aux Data
    const [cargos, setCargos] = useState<Option[]>([]);
    const [temas, setTemas] = useState<Option[]>([]);
    const [roles, setRoles] = useState<Option[]>([]);
    const [subAreas, setSubAreas] = useState<Option[]>([]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Programacion | null>(null);
    const [formData, setFormData] = useState({
        id_cargo: '',
        sub_area: '',
        id_tema: '',
        frecuencia_meses: 12,
        id_rol_capacitador: '',
        fecha_proxima_capacitacion: ''
    });

    // Filters
    const [filters, setFilters] = useState({
        cargo: '',
        tema: '',
        rol: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        let res = [...programaciones];
        if (filters.cargo) res = res.filter(p => p.id_cargo == filters.cargo);
        if (filters.tema) res = res.filter(p => p.id_tema == filters.tema);
        if (filters.rol) res = res.filter(p => p.id_rol_capacitador == filters.rol);
        setFilteredData(res);
    }, [filters, programaciones]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [progRes, cargoRes, temaRes, rolRes, subAreaRes] = await Promise.all([
                api.get('/m_capacitaciones/assets/php/programacion_api.php?action=list'),
                api.get('/m_capacitaciones/assets/php/programacion_api.php?action=get_cargos'),
                api.get('/m_capacitaciones/assets/php/programacion_api.php?action=get_temas'),
                api.get('/m_capacitaciones/assets/php/programacion_api.php?action=get_roles'),
                api.get('/m_capacitaciones/assets/php/programacion_api.php?action=get_sub_areas')
            ]);

            if (progRes.data.success) {
                setProgramaciones(progRes.data.data);
                setFilteredData(progRes.data.data);
            }
            if (cargoRes.data.success) setCargos(cargoRes.data.data.map((c: { id: number; cargo: string }) => ({ id: c.id, name: c.cargo })));
            if (temaRes.data.success) setTemas(temaRes.data.data.map((t: { id: number; nombre: string }) => ({ id: t.id, name: t.nombre })));
            if (rolRes.data.success) setRoles(rolRes.data.data.map((r: { id: number; nombre: string }) => ({ id: r.id, name: r.nombre })));
            if (subAreaRes.data.success) setSubAreas(subAreaRes.data.data.map((s: { id_area: string; sub_area: string }) => ({ id: s.id_area, name: s.sub_area })));

        } catch (error) {
            console.error('Error loading data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (item: Programacion) => {
        setEditingItem(item);
        setFormData({
            id_cargo: String(item.id_cargo),
            sub_area: item.sub_area || '',
            id_tema: String(item.id_tema),
            frecuencia_meses: item.frecuencia_meses,
            id_rol_capacitador: String(item.id_rol_capacitador),
            fecha_proxima_capacitacion: item.fecha_proxima_capacitacion
        });
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingItem(null);
        setFormData({
            id_cargo: '',
            sub_area: '',
            id_tema: '',
            frecuencia_meses: 12,
            id_rol_capacitador: '',
            fecha_proxima_capacitacion: ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Está seguro de eliminar esta programación?')) return;
        try {
            const res = await api.post(`/m_capacitaciones/assets/php/programacion_api.php?action=delete&id=${id}`);
            if (res.data.success) {
                loadData();
            } else {
                alert('Error al eliminar: ' + res.data.error);
            }
        } catch (err) {
            console.error(err);
            alert('Error al conectar con el servidor');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const action = editingItem ? 'update' : 'create';
            const payload = {
                ...formData,
                id: editingItem?.id
            };

            const res = await api.post(`/m_capacitaciones/assets/php/programacion_api.php?action=${action}`, payload);

            if (res.data.success) {
                setIsModalOpen(false);
                loadData();
            } else {
                alert('Error: ' + res.data.error);
            }
        } catch (err) {
            console.error(err);
            alert('Error al guardar');
        }
    };

    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            // Simple parsing - usually requires strict validation matching backend exp
            const data = XLSX.utils.sheet_to_json(ws);
            console.log('Importing', data);
            // Implement bulk import logic when backend matches
            alert('Importación básica leída. Implementación de envío pendiente.');
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="space-y-6 animate-fade-in-up pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Programación de Capacitaciones</h2>
                <div className="flex gap-2">
                    <label className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition cursor-pointer">
                        <Upload size={18} /> Importar Excel
                        <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
                    </label>
                    <button onClick={handleCreate} className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition">
                        <Plus size={18} /> Nueva Programación
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
                <select className="form-select" value={filters.cargo} onChange={e => setFilters(prev => ({ ...prev, cargo: e.target.value }))}>
                    <option value="">Cargo: Todos</option>
                    {cargos.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="form-select" value={filters.tema} onChange={e => setFilters(prev => ({ ...prev, tema: e.target.value }))}>
                    <option value="">Tema: Todos</option>
                    {temas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select className="form-select" value={filters.rol} onChange={e => setFilters(prev => ({ ...prev, rol: e.target.value }))}>
                    <option value="">Rol: Todos</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <button onClick={() => setFilters({ cargo: '', tema: '', rol: '' })} className="text-gray-500 hover:text-gray-700 font-medium flex items-center justify-center gap-2">
                    <X size={18} /> Limpiar
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="bg-gray-50 text-gray-700 uppercase font-medium">
                            <tr>
                                <th className="px-4 py-3">Cargo</th>
                                <th className="px-4 py-3">Sub Área</th>
                                <th className="px-4 py-3">Tema</th>
                                <th className="px-4 py-3">Frecuencia</th>
                                <th className="px-4 py-3">Próxima</th>
                                <th className="px-4 py-3 text-center">Pendientes</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={7} className="text-center py-8">Cargando...</td></tr>
                            ) : filteredData.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-8">No hay programaciones.</td></tr>
                            ) : (
                                filteredData.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">{item.cargo_nombre}</td>
                                        <td className="px-4 py-3">{item.sub_area_nombre || '-'}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{item.tema_nombre}</td>
                                        <td className="px-4 py-3">{item.frecuencia_meses} meses</td>
                                        <td className="px-4 py-3">
                                            {item.fecha_proxima_capacitacion ? new Date(item.fecha_proxima_capacitacion).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.colaboradores_pendientes > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                                {item.colaboradores_pendientes}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                                                    <Trash size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? 'Editar Programación' : 'Nueva Programación'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                        <select required className="form-select w-full" value={formData.id_cargo} onChange={e => setFormData({ ...formData, id_cargo: e.target.value })}>
                            <option value="">Seleccione...</option>
                            {cargos.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sub Área</label>
                        <select required className="form-select w-full" value={formData.sub_area} onChange={e => setFormData({ ...formData, sub_area: e.target.value })}>
                            <option value="">Seleccione...</option>
                            {subAreas.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tema</label>
                        <select required className="form-select w-full" value={formData.id_tema} onChange={e => setFormData({ ...formData, id_tema: e.target.value })}>
                            <option value="">Seleccione...</option>
                            {temas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Rol Capacitador</label>
                        <select required className="form-select w-full" value={formData.id_rol_capacitador} onChange={e => setFormData({ ...formData, id_rol_capacitador: e.target.value })}>
                            <option value="">Seleccione...</option>
                            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia (Meses)</label>
                            <input type="number" required min="1" className="form-input w-full" value={formData.frecuencia_meses} onChange={e => setFormData({ ...formData, frecuencia_meses: Number(e.target.value) })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Próxima Fecha</label>
                            <input type="date" required className="form-input w-full" value={formData.fecha_proxima_capacitacion} onChange={e => setFormData({ ...formData, fecha_proxima_capacitacion: e.target.value })} />
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-2 border-t border-gray-100 mt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Guardar</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default CapacitacionesProgramacion;
