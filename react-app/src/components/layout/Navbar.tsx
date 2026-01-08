import { Menu, LogOut, User } from 'lucide-react';

interface NavbarProps {
    toggleSidebar: () => void;
}

const Navbar = ({ toggleSidebar }: NavbarProps) => {
    return (
        <header className="bg-white shadow-sm border-b border-gray-100 h-16 sticky top-0 z-10 flex items-center justify-between px-4 lg:px-8">
            <div className="flex items-center">
                <button
                    onClick={toggleSidebar}
                    className="p-2 mr-4 text-gray-600 rounded-lg hover:bg-gray-100 lg:hidden"
                    aria-label="Toggle Sidebar"
                >
                    <Menu size={20} />
                </button>
                <h1 className="text-xl font-semibold text-gray-800 hidden sm:block">
                    Bienvenido
                </h1>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-50 transition-colors cursor-pointer group">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        <User size={18} />
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 hidden md:block">
                        Usuario
                    </span>
                </div>
                <button className="p-2 text-gray-500 hover:text-red-600 transition-colors" title="Cerrar Sesión" aria-label="Cerrar Sesión">
                    <LogOut size={20} />
                </button>
            </div>
        </header>
    );
};

export default Navbar;
