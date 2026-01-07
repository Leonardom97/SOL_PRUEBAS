import { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckSquare, Square, Shield } from 'lucide-react';
import api from '../../services/api';

interface PermissionConfig {
    key: string;
    roles: string[];
}

const AVAILABLE_ROLES = [
    "administrador",
    "agronomico",
    "asist_agronomico",
    "supervisor_agronomico",
    "aux_agronomico",
    "sup_logistica1",
    "sup_logistica2",
    "editor_logistica1",
    "editor_logistica2",
    "sup_produccion",
    "editor_produccion",
    "sup_logi_y_transporte",
    "sup_topografo"
];

const ROLE_LABELS: Record<string, string> = {
    "administrador": "Administrador",
    "agronomico": "Agronómico",
    "supervisor_agronomico": "Sup. Agronómico",
    "asist_agronomico": "Asist. Agronómico",
    "aux_agronomico": "Aux. Agronómico",
    "sup_logistica1": "Sup. Logística 1",
    "sup_logistica2": "Sup. Logística 2",
    "editor_logistica1": "Editor Logística 1",
    "editor_logistica2": "Editor Logística 2",
    "sup_produccion": "Sup. Producción",
    "editor_produccion": "Editor Producción",
    "sup_logi_y_transporte": "Sup. Logi y Transporte",
    "sup_topografo": "Sup. Topógrafo"
};

const TAB_INFO: Record<string, { label: string; icon: string }> = {
    "cosecha-fruta": { label: "Recoleccion Fruta", icon: "chalkboard-teacher" },
    "mantenimientos": { label: "Mantenimientos", icon: "users" },
    "oficios-varios-palma": { label: "Oficios Varios Palmas", icon: "clipboard-check" },
    "ct-cal-labores": { label: "Calidad Labores", icon: "tasks" },
    "fertilizacion-organica": { label: "Fertilizacion Organica", icon: "warehouse" },
    "monitoreos-generales": { label: "Monitoreos Generales", icon: "table" },
    "ct-cal-sanidad": { label: "Calidad Sanidad", icon: "leaf" },
    "nivel-freatico": { label: "Nivel Freático", icon: "water" },
    "monitoreo-trampas": { label: "Monitoreo Trampas", icon: "bug" },
    "compactacion": { label: "Compactación", icon: "compress" },
    "plagas": { label: "Plagas", icon: "skull-crossbones" },
    "ct-cal-trampas": { label: "Calidad Trampas", icon: "clipboard-list" },
    "reporte-lote-monitoreo": { label: "Reporte Lote Monitoreo", icon: "file-alt" },
    "coberturas": { label: "Coberturas", icon: "layer-group" },
    "ct-polinizacion-flores": { label: "Calidad Polinización Flores", icon: "spa" },
    "aud-cosecha": { label: "Auditoría Cosecha", icon: "search" },
    "aud-fertilizacion": { label: "Auditoría Fertilización", icon: "search-plus" },
    "aud-mantenimiento": { label: "Auditoría Mantenimiento", icon: "wrench" },
    "aud-perdidas": { label: "Auditoría Pérdidas", icon: "exclamation-triangle" },
    "aud-vagones": { label: "Auditoría Vagones", icon: "truck" },
    "labores-diarias": { label: "Labores Diarias", icon: "calendar-day" },
    "polinizacion": { label: "Polinización", icon: "seedling" },
    "resiembra": { label: "Resiembra", icon: "redo" },
    "salida-vivero": { label: "Salida Vivero", icon: "sign-out-alt" },
    "siembra-nueva": { label: "Siembra Nueva", icon: "plus-circle" },
    "aud-maquinaria": { label: "Auditoría Maquinaria", icon: "tractor" },
    "compostaje": { label: "Compostaje", icon: "recycle" },
    "erradicaciones": { label: "Erradicaciones", icon: "trash" }
};

const AgronomiaPermisos = () => {
    const [config, setConfig] = useState<PermissionConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadPermissions();
    }, []);

    const loadPermissions = async () => {
        setLoading(true);
        try {
            const res = await api.get('/m_agronomia/assets/php/manage_tab_permissions.php');
            const data: PermissionConfig[] = Array.isArray(res.data) ? res.data : [];

            // Normalize data: ensure all keys in TAB_INFO exist in config
            const mergedConfig: PermissionConfig[] = Object.keys(TAB_INFO).map(key => {
                const existing = data.find(c => c.key === key);
                return existing ? { ...existing } : { key, roles: [] };
            });

            setConfig(mergedConfig);
        } catch (error) {
            console.error('Error loading permissions:', error);
            alert('Error cargando la configuración.');
        } finally {
            setLoading(false);
        }
    };

    const toggleRole = (key: string, role: string) => {
        setConfig(prevConfig => {
            return prevConfig.map(item => {
                if (item.key !== key) return item;

                const hasRole = item.roles.includes(role);
                const newRoles = hasRole
                    ? item.roles.filter(r => r !== role)
                    : [...item.roles, role];

                return { ...item, roles: newRoles };
            });
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await api.post('/m_agronomia/assets/php/manage_tab_permissions.php', config);
            if (res.data.success) {
                alert('Permisos guardados correctamente.');
            } else {
                alert('Error al guardar: ' + (res.data.message || 'Desconocido'));
            }
        } catch (error) {
            console.error('Error saving permissions:', error);
            alert('Error de red al guardar.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up pb-10">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Shield className="text-green-600" />
                        Gestión de Permisos
                    </h2>
                    <p className="text-gray-500">Configura el acceso a las pestañas y formularios de Agronomía por rol.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={loadPermissions}
                        disabled={loading || saving}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} /> Recargar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading || saving}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md flex items-center gap-2"
                    >
                        {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                        Guardar Cambios
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-700 uppercase font-bold tracking-wider border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 w-16 text-center">Icono</th>
                                <th className="px-6 py-4 w-64">Pestaña / Módulo</th>
                                <th className="px-6 py-4">Roles Permitidos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="text-center py-12 text-gray-500">
                                        <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                                        Cargando configuración...
                                    </td>
                                </tr>
                            ) : config.map((item) => {
                                const info = TAB_INFO[item.key] || { label: item.key, icon: 'circle' };
                                return (
                                    <tr key={item.key} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 text-center text-gray-400 group-hover:text-green-600">
                                            {/* We can't easily map FA icons to Lucide, so using generic or similar if possible. 
                                                For now just showing a consistent generic icon or trying to map a few common ones if valuable.
                                                Using key to vary color or just generic Shield for now.
                                            */}
                                            <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-lg text-slate-600 font-bold">
                                                {info.label.substring(0, 2).toUpperCase()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800">{info.label}</div>
                                            <div className="text-xs text-gray-400 font-mono mt-1">{item.key}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                {AVAILABLE_ROLES.map(role => {
                                                    const isChecked = item.roles.includes(role);
                                                    return (
                                                        <label
                                                            key={role}
                                                            className={`
                                                                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all border
                                                                ${isChecked
                                                                    ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                                                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                                                }
                                                            `}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className="hidden"
                                                                checked={isChecked}
                                                                onChange={() => toggleRole(item.key, role)}
                                                            />
                                                            {isChecked ? <CheckSquare size={14} /> : <Square size={14} />}
                                                            {ROLE_LABELS[role] || role}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AgronomiaPermisos;
