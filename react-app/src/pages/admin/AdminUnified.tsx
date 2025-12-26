import { useState } from 'react';
import { Users, UserCog } from 'lucide-react';
import AdminUsuarios from './AdminUsuarios';
import AdminColaboradores from './AdminColaboradores';
import classNames from 'classnames';

const AdminUnified = () => {
    const [activeTab, setActiveTab] = useState<'usuarios' | 'colaboradores'>('usuarios');

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Gestión de Personal</h1>
                        <p className="text-gray-500 text-sm">Administración de usuarios del sistema y colaboradores</p>
                    </div>

                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('usuarios')}
                            className={classNames(
                                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                                activeTab === 'usuarios'
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <UserCog size={18} />
                            Usuarios Administrativos
                        </button>
                        <button
                            onClick={() => setActiveTab('colaboradores')}
                            className={classNames(
                                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                                activeTab === 'colaboradores'
                                    ? "bg-white text-indigo-600 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <Users size={18} />
                            Colaboradores
                        </button>
                    </div>
                </div>
            </div>

            <div className="animate-fade-in-up">
                {activeTab === 'usuarios' ? (
                    <AdminUsuarios />
                ) : (
                    <AdminColaboradores />
                )}
            </div>
        </div>
    );
};

export default AdminUnified;
