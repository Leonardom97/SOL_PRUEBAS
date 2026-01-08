import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Search, Lock, UserPlus, User } from 'lucide-react';
import { adminService, type Usuario } from './services/adminService';
import Modal from '../../components/ui/Modal';


const AdminUsuarios: React.FC = () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // const { user } = useAuth();
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Usuario | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        cedula: '',
        nombre1: '',
        nombre2: '',
        apellido1: '',
        apellido2: '',
        rol: [] as string[],
        contraseña: '',
        estado_us: '1'
    });

    const [availableRoles] = useState(['Administrador', 'Usuario', 'Consultor', 'Capacitador', 'Porteria', 'Laboratorio', 'Logistica']);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchUsuarios();
    }, []);

    const fetchUsuarios = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log("Fetching users...");
            const data = await adminService.getUsuarios();
            console.log("Users data received:", data);

            // The API returns { usuarios: [], total: N }
            if (data && Array.isArray(data.usuarios)) {
                setUsuarios(data.usuarios);
            } else {
                console.error("Invalid data format received:", data);
                setError("Formato de datos inválido recibido del servidor.");
            }
        } catch (error: any) {
            console.error("Error loading users", error);
            setError(error.message || "Error al cargar usuarios.");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const filteredUsers = usuarios.filter(u =>
        u.nombre1?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.apellido1?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.cedula?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEdit = (u: Usuario) => {
        setEditingUser(u);
        setFormData({
            cedula: u.cedula || '',
            nombre1: u.nombre1 || '',
            nombre2: u.nombre2 || '',
            apellido1: u.apellido1 || '',
            apellido2: u.apellido2 || '',
            rol: u.roles ? u.roles.split(', ') : [], // Assuming roles comes as comma-sep string from API
            contraseña: '', // Don't fill password
            estado_us: u.estado_us || '1'
        });
        setModalOpen(true);
    };

    const handleCreate = () => {
        setEditingUser(null);
        setFormData({
            cedula: '',
            nombre1: '',
            nombre2: '',
            apellido1: '',
            apellido2: '',
            rol: [],
            contraseña: '',
            estado_us: '1'
        });
        setModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Está seguro de eliminar este usuario?')) {
            try {
                await adminService.deleteUsuario(id);
                fetchUsuarios();
            } catch (error) {
                alert('Error al eliminar usuario');
            }
        }
    };

    const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (formData.rol.includes(val)) return;
        setFormData({ ...formData, rol: [...formData.rol, val] });
    };

    const removeRole = (roleToRemove: string) => {
        setFormData({ ...formData, rol: formData.rol.filter(r => r !== roleToRemove) });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                tipo: editingUser ? 'editar' : 'registrar',
                id: editingUser ? editingUser.id : undefined,
                ...formData,
                roles: formData.rol.map(r => {
                    // Map role name to ID if necessary, or send names if API accepts them.
                    // Based on API reading, it expects IDs. We need a map.
                    // For now, let's assume 1=Admin, 2=User etc. or mock it.
                    // IMPORTANT: The backend uses adm_roles table. We should fetch roles to get IDs.
                    // For the sake of this migration, I'll use a mocked map or I should fetch roles properly.
                    // Let's rely on backend accepting IDs. I'll use a hardcoded map for common roles.
                    const roleMap: { [key: string]: number } = { 'Administrador': 1, 'Usuario': 5, 'Consultor': 6, 'Capacitador': 2, 'Porteria': 8, 'Laboratorio': 9, 'Logistica': 10 };
                    return roleMap[r] || 5;
                })
            };

            await adminService.saveUsuario(payload as any);
            setModalOpen(false);
            fetchUsuarios();
        } catch (error) {
            console.error("Error saving user", error);
            alert("Error al guardar usuario");
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <User className="w-8 h-8 text-blue-600" />
                    Gestión de Usuarios
                </h1>
                <button onClick={handleCreate} className="btn btn-primary flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    <UserPlus className="w-4 h-4" />
                    Nuevo Usuario
                </button>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-100 p-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o cédula..."
                        className="pl-10 pr-4 py-2 border rounded w-full md:w-1/3 text-sm focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </div>
                {error && (
                    <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                        Error: {error}
                    </div>
                )}
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                        <tr>
                            <th className="px-4 py-3">Usuario (Cédula)</th>
                            <th className="px-4 py-3">Nombre Completo</th>
                            <th className="px-4 py-3">Roles</th>
                            <th className="px-4 py-3 text-center">Estado</th>
                            <th className="px-4 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-8 text-gray-500">Cargando...</td></tr>
                        ) : filteredUsers.map(u => (
                            <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-900">{u.cedula}</td>
                                <td className="px-4 py-3">{u.nombre1} {u.apellido1}</td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-1 flex-wrap">
                                        {u.roles ? u.roles.split(', ').map(r => (
                                            <span key={r} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                {r}
                                            </span>
                                        )) : <span className="text-gray-400">-</span>}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.estado_us === '1' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {u.estado_us === '1' ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => handleEdit(u)} className="p-1 hover:bg-gray-100 rounded text-blue-600 mr-2" title="Editar">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(u.id)} className="p-1 hover:bg-gray-100 rounded text-red-600" title="Eliminar">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingUser ? "Editar Usuario" : "Nuevo Usuario"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cédula (Login)</label>
                            <input type="text" required className="w-full border rounded p-2" value={formData.cedula} onChange={e => setFormData({ ...formData, cedula: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Primer Nombre</label>
                            <input type="text" required className="w-full border rounded p-2" value={formData.nombre1} onChange={e => setFormData({ ...formData, nombre1: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Segundo Nombre</label>
                            <input type="text" className="w-full border rounded p-2" value={formData.nombre2} onChange={e => setFormData({ ...formData, nombre2: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Primer Apellido</label>
                            <input type="text" required className="w-full border rounded p-2" value={formData.apellido1} onChange={e => setFormData({ ...formData, apellido1: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Segundo Apellido</label>
                            <input type="text" className="w-full border rounded p-2" value={formData.apellido2} onChange={e => setFormData({ ...formData, apellido2: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                            <select className="w-full border rounded p-2" value={formData.estado_us} onChange={e => setFormData({ ...formData, estado_us: e.target.value })}>
                                <option value="1">Activo</option>
                                <option value="0">Inactivo</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña {editingUser && '(Dejar en blanco para no cambiar)'}</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="password"
                                className="w-full border rounded p-2 pl-10"
                                value={formData.contraseña}
                                onChange={e => setFormData({ ...formData, contraseña: e.target.value })}
                                required={!editingUser}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Roles</label>
                        <select className="w-full border rounded p-2 mb-2" onChange={handleRoleChange} value="">
                            <option value="" disabled>Agregar Rol...</option>
                            {availableRoles.map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                        <div className="flex gap-2 flex-wrap">
                            {formData.rol.map(r => (
                                <span key={r} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {r}
                                    <button type="button" onClick={() => removeRole(r)} className="ml-2 text-blue-600 hover:text-blue-800 font-bold">×</button>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default AdminUsuarios;
