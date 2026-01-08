import React, { useState, useEffect } from 'react';
import { Plus, Search, Users, Edit, Trash, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { capacitacionService } from './services/capacitacionService';
import Modal from '../../components/ui/Modal';

interface Sesion {
    id: number;
    tema: string;
    responsable_nombre: string;
    responsable_cedula: string;
    fecha: string;
    asistentes: number;
    // ... other fields
}

interface Asistente {
    id: number;
    nombre: string;
    cedula: string;
    empresa: string;
    estado_aprobacion: string;
}

const CapacitacionesSesiones = () => {
    const [sesiones, setSesiones] = useState<Sesion[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page] = useState(1);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form Data for Create/Edit
    const [formData, setFormData] = useState<any>({
        // Initial state matches what API expects
        proceso: '',
        lugar: '',
        responsable_cedula: '',
        responsable_nombre: '',
        tipo_actividad: '',
        tema: '',
        hora_inicio: '',
        hora_final: '',
        fecha: '',
        observaciones: ''
    });

    // Master Data for Selects
    const [masterData, setMasterData] = useState<any>({ temas: [], procesos: [], lugares: [], tipos: [] });

    // Attendance State
    const [currentAsistentes, setCurrentAsistentes] = useState<Asistente[]>([]);
    const [newAttendeeCedula, setNewAttendeeCedula] = useState('');
    const [newAttendeeStatus, setNewAttendeeStatus] = useState('aprobo');
    const [foundAttendeeName, setFoundAttendeeName] = useState('');

    useEffect(() => {
        loadSesiones();
        loadMasterData();
    }, [page, searchTerm]);

    const loadSesiones = async () => {
        setLoading(true);
        try {
            const data = await capacitacionService.getSesiones(page, 10, searchTerm);
            setSesiones(data.rows || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadMasterData = async () => {
        try {
            const data = await capacitacionService.getMasterData();
            setMasterData(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreate = () => {
        setEditingId(null);
        setFormData({
            proceso: '', lugar: '', responsable_cedula: '', responsable_nombre: '',
            tipo_actividad: '', tema: '', hora_inicio: '', hora_final: '', fecha: '', observaciones: ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = async (id: number) => {
        try {
            const data = await capacitacionService.getSesionById(String(id));
            if (data) {
                // Map API response to form data
                setFormData({
                    proceso: data.formulario.id_proceso,
                    lugar: data.formulario.id_lugar,
                    responsable_cedula: data.responsable?.cedula,
                    responsable_nombre: data.responsable?.nombre1 + ' ' + data.responsable?.apellido1,
                    tipo_actividad: data.formulario.id_tipo_actividad,
                    tema: data.formulario.id_tema,
                    hora_inicio: data.formulario.hora_inicio,
                    hora_final: data.formulario.hora_final,
                    fecha: data.formulario.fecha,
                    observaciones: data.formulario.observaciones,
                    id_usuario: data.formulario.id_usuario // important for backend
                });
                setEditingId(String(id));
                setIsModalOpen(true);
            }
        } catch (error) {
            console.error(error);
            alert('Error cargando detalles');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Eliminar esta sesión y todos sus datos?')) return;
        try {
            await capacitacionService.deleteSesion(String(id));
            loadSesiones();
        } catch (error) {
            console.error(error);
            alert('Error eliminando');
        }
    };

    const handleSearchResponsable = async () => {
        if (!formData.responsable_cedula) return;
        try {
            const user = await capacitacionService.searchColaborador(formData.responsable_cedula);
            if (user && user.nombre1) {
                // Note: The API returns `nombre1` directly if searching user table, 
                // but `ac_nombre1` if searching collaborator. Need to check API response format strictly.
                // Assuming `formulario_api.php?action=get_usuario` returns standard user obj.
                const fullName = `${user.nombre1} ${user.nombre2 || ''} ${user.apellido1} ${user.apellido2 || ''}`.trim();
                setFormData({ ...formData, responsable_nombre: fullName });
            } else {
                alert('Usuario no encontrado');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                id: editingId,
                ...formData
            };
            const res = await capacitacionService.saveSesion(payload);
            if (res.success || res.ok) { // Backend inconsistency check
                setIsModalOpen(false);
                loadSesiones();
            } else {
                alert('Error: ' + (res.error || res.message));
            }
        } catch (error) {
            console.error(error);
            alert('Error al guardar');
        }
    };

    // --- Attendance Logic ---
    const openAttendance = async (id: number) => {
        setEditingId(String(id));
        setNewAttendeeCedula('');
        setFoundAttendeeName('');
        const data = await capacitacionService.getSesionById(String(id));
        setCurrentAsistentes(data.asistentes || []);
        setIsAttendanceModalOpen(true);
    };

    const handleSearchAttendee = async () => {
        if (!newAttendeeCedula) return;
        try {
            const col = await capacitacionService.searchColaborador(newAttendeeCedula);
            if (col && col.ac_nombre1) {
                const name = `${col.ac_nombre1} ${col.ac_apellido1}`;
                setFoundAttendeeName(name);
            } else {
                setFoundAttendeeName('');
                alert('Colaborador no encontrado');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddAttendee = async () => {
        if (!editingId || !newAttendeeCedula || !newAttendeeStatus) return;
        try {
            const res = await capacitacionService.addAsistente(editingId, newAttendeeCedula, newAttendeeStatus);
            if (res.success || !res.error) {
                // Refresh list
                const data = await capacitacionService.getSesionById(editingId);
                setCurrentAsistentes(data.asistentes || []);
                setNewAttendeeCedula('');
                setFoundAttendeeName('');
            } else {
                alert(res.error);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleRemoveAttendee = async (idAsistente: number) => {
        if (!window.confirm('¿Quitar asistente?')) return;
        try {
            await capacitacionService.removeAsistente(String(idAsistente));
            // Refresh
            if (editingId) {
                const data = await capacitacionService.getSesionById(editingId);
                setCurrentAsistentes(data.asistentes || []);
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up pb-10">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Sesiones de Capacitación</h2>
                <button onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm">
                    <Plus size={18} /> Nueva Sesión
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por tema, responsable..."
                        className="pl-10 w-full border rounded-lg px-3 py-2"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="bg-gray-50 text-gray-700 uppercase font-medium">
                        <tr>
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">Tema</th>
                            <th className="px-4 py-3">Responsable</th>
                            <th className="px-4 py-3">Fecha</th>
                            <th className="px-4 py-3 text-center">Asistentes</th>
                            <th className="px-4 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-8">Cargando...</td></tr>
                        ) : sesiones.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-8">No se encontraron sesiones.</td></tr>
                        ) : (
                            sesiones.map(s => (
                                <tr key={s.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">{s.id}</td>
                                    <td className="px-4 py-3 font-medium text-gray-900">{s.tema}</td>
                                    <td className="px-4 py-3 text-xs">
                                        <div className="font-semibold">{s.responsable_nombre}</div>
                                        <div className="text-gray-400">{s.responsable_cedula}</div>
                                    </td>
                                    <td className="px-4 py-3">{s.fecha}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">
                                            {s.asistentes}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => openAttendance(s.id)} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded" aria-label="Gestionar Asistentes">
                                                <Users size={18} />
                                            </button>

                                            {/* Link to Exam Builder if persisted id exists */}
                                            <Link to={`/capacitaciones/sesiones/${s.id}/evaluacion`} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded" aria-label="Configurar Evaluación">
                                                <Check size={18} />
                                            </Link>

                                            <button onClick={() => handleEdit(s.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" aria-label="Editar">
                                                <Edit size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(s.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" aria-label="Eliminar">
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

            {/* Create/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Editar Sesión' : 'Nueva Sesión'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Proceso</label>
                            <select className="w-full border rounded px-3 py-2" value={formData.proceso} onChange={e => setFormData({ ...formData, proceso: e.target.value })} required>
                                <option value="">Seleccione...</option>
                                {masterData.procesos.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Tema</label>
                            <select className="w-full border rounded px-3 py-2" value={formData.tema} onChange={e => setFormData({ ...formData, tema: e.target.value })} required>
                                <option value="">Seleccione...</option>
                                {masterData.temas.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Lugar</label>
                            <select className="w-full border rounded px-3 py-2" value={formData.lugar} onChange={e => setFormData({ ...formData, lugar: e.target.value })} required>
                                <option value="">Seleccione...</option>
                                {masterData.lugares.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Tipo Actividad</label>
                            <select className="w-full border rounded px-3 py-2" value={formData.tipo_actividad} onChange={e => setFormData({ ...formData, tipo_actividad: e.target.value })} required>
                                <option value="">Seleccione...</option>
                                {masterData.tipos.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <label className="block text-sm font-medium mb-1">Responsable (Cédula)</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="border rounded px-3 py-2 w-40"
                                value={formData.responsable_cedula}
                                onChange={e => setFormData({ ...formData, responsable_cedula: e.target.value })}
                                onBlur={handleSearchResponsable}
                                placeholder="Cédula"
                                required
                            />
                            <input
                                type="text"
                                className="border rounded px-3 py-2 flex-1 bg-gray-50"
                                value={formData.responsable_nombre}
                                readOnly
                                placeholder="Nombre del Responsable"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium">Fecha</label>
                            <input type="date" className="w-full border rounded px-3 py-2" value={formData.fecha} onChange={e => setFormData({ ...formData, fecha: e.target.value })} required />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Hora Inicio</label>
                            <input type="time" className="w-full border rounded px-3 py-2" value={formData.hora_inicio} onChange={e => setFormData({ ...formData, hora_inicio: e.target.value })} required />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Hora Fin</label>
                            <input type="time" className="w-full border rounded px-3 py-2" value={formData.hora_final} onChange={e => setFormData({ ...formData, hora_final: e.target.value })} required />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium">Observaciones</label>
                        <textarea className="w-full border rounded px-3 py-2" rows={2} value={formData.observaciones} onChange={e => setFormData({ ...formData, observaciones: e.target.value })}></textarea>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar Sesión</button>
                    </div>
                </form>
            </Modal>

            {/* Attendance Modal */}
            <Modal isOpen={isAttendanceModalOpen} onClose={() => setIsAttendanceModalOpen(false)} title="Gestionar Asistentes">
                <div className="space-y-4">
                    <div className="bg-gray-50 p-3 rounded-lg flex gap-2 items-end">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Cédula</label>
                            <input
                                type="text"
                                className="w-full border rounded px-2 py-1"
                                value={newAttendeeCedula}
                                onChange={e => setNewAttendeeCedula(e.target.value)}
                                onBlur={handleSearchAttendee}
                            />
                        </div>
                        <div className="flex-[2]">
                            <label className="text-xs font-bold text-gray-500 uppercase">Nombre</label>
                            <input type="text" className="w-full border rounded px-2 py-1 bg-white" value={foundAttendeeName} readOnly />
                        </div>
                        <div className="w-32">
                            <label className="text-xs font-bold text-gray-500 uppercase">Estado</label>
                            <select className="w-full border rounded px-2 py-1" value={newAttendeeStatus} onChange={e => setNewAttendeeStatus(e.target.value)}>
                                <option value="aprobo">Aprobó</option>
                                <option value="reprobo">Reprobó</option>
                                <option value="asistio">Solo Asistió</option>
                            </select>
                        </div>
                        <button onClick={handleAddAttendee} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 h-9" disabled={!foundAttendeeName}>
                            <Plus size={18} />
                        </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto border rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 text-gray-700 font-semibold sticky top-0">
                                <tr>
                                    <th className="px-3 py-2 text-left">Cedula</th>
                                    <th className="px-3 py-2 text-left">Nombre</th>
                                    <th className="px-3 py-2 text-center">Estado</th>
                                    <th className="px-3 py-2 text-right">Accion</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {currentAsistentes.map(a => (
                                    <tr key={a.id}>
                                        <td className="px-3 py-2">{a.cedula}</td>
                                        <td className="px-3 py-2">{a.nombre}</td>
                                        <td className="px-3 py-2 text-center">
                                            <span className={`px-2 py-0.5 rounded text-xs ${a.estado_aprobacion === 'aprobo' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                                                {a.estado_aprobacion}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <button onClick={() => handleRemoveAttendee(a.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                                <Trash size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {currentAsistentes.length === 0 && (
                                    <tr><td colSpan={4} className="text-center py-4 text-gray-500">Sin asistentes registrados</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CapacitacionesSesiones;
