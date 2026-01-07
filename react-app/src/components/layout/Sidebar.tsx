import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Truck, GraduationCap, ClipboardCheck, ArrowLeftRight, FlaskConical, X, Calendar, FileText, LogOut } from 'lucide-react';
import classNames from 'classnames';
import { useAuth } from '../../contexts/AuthProvider';

const Sidebar = ({ isOpen, toggleSidebar }: { isOpen: boolean; toggleSidebar: () => void }) => {
    const location = useLocation();
    const { logout } = useAuth();

    const menuItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { name: 'Portería', icon: ArrowLeftRight, path: '/porteria' },
        { name: 'Inventario (Port)', icon: ClipboardCheck, path: '/porteria/inventario' },
        { name: 'Báscula', icon: Truck, path: '/bascula' },
        { name: 'Agronomía', icon: Users, path: '/agronomia/dashboard' },
        { name: 'Fecha Corte', icon: Calendar, path: '/agronomia/fecha-corte' },
        { name: 'Capacitaciones', icon: GraduationCap, path: '/capacitaciones/dashboard' },
        { name: 'Programación Cap.', icon: Calendar, path: '/capacitaciones/programacion' },
        { name: 'Sesiones Cap.', icon: Calendar, path: '/capacitaciones/sesiones' },
        { name: 'Configuración Cap.', icon: Users, path: '/capacitaciones/config' },
        { name: 'Consultas/Reportes', icon: FileText, path: '/capacitaciones/reportes' },
        { name: 'Lab. Tanques', icon: FlaskConical, path: '/laboratorio/tanques' },
        { name: 'Lab. Calidad', icon: FlaskConical, path: '/laboratorio/calidad' },
        { name: 'Programación', icon: Calendar, path: '/logistica/programacion' },
        { name: 'Remisión', icon: FileText, path: '/logistica/remision' },
        { name: 'Evaluaciones', icon: ClipboardCheck, path: '/evaluaciones' },
        { name: 'Gestión Usuarios', icon: Users, path: '/admin/gestion' },
    ];

    const handleLogout = async () => {
        try {
            await logout();
            window.location.href = '/login';
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={classNames(
                    "fixed inset-0 z-20 bg-black/50 transition-opacity lg:hidden",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={toggleSidebar}
            />

            {/* Sidebar Container */}
            <aside
                className={classNames(
                    "fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex items-center justify-between h-16 px-6 bg-slate-950 flex-shrink-0">
                    <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-transparent">
                        OSM Panel
                    </span>
                    <button onClick={toggleSidebar} className="lg:hidden text-gray-400 hover:text-white" aria-label="Close sidebar">
                        <X size={24} />
                    </button>
                </div>

                <nav className="p-4 space-y-1 overflow-y-auto flex-1 custom-scrollbar">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={classNames(
                                    "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors group",
                                    isActive
                                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                )}
                            >
                                <Icon size={20} className={classNames("mr-3", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 bg-slate-950 flex-shrink-0 border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-400 hover:bg-slate-800 hover:text-red-300 rounded-lg transition-colors group"
                    >
                        <LogOut size={20} className="mr-3 text-red-400 group-hover:text-red-300" />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
