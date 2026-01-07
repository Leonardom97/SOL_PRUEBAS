import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../services/api';

interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'user';
    avatar?: string;
    permissions?: string[];
    colaboradorInfo?: any;
    cedula?: string;
}

interface AuthContextType {
    user: User | null;
    login: (role: 'admin' | 'user', credentials: Record<string, string>) => Promise<void>;
    logout: () => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const checkSession = async () => {
        try {
            // Using the real endpoint
            const res = await api.get('/php/verificar_sesion.php');
            if (res.data.success) {
                // Map PHP response to User object
                const role = res.data.tipo_usuario === 'admin' ? 'admin' : 'user';
                const userData: User = {
                    id: res.data.usuario_id || res.data.usuario,
                    name: res.data.nombre + (res.data.apellido ? ' ' + res.data.apellido : ''),
                    email: res.data.cedula || res.data.usuario,
                    cedula: res.data.cedula,
                    role: role,
                    avatar: role === 'admin'
                        ? "https://ui-avatars.com/api/?name=" + encodeURIComponent(res.data.nombre) + "&background=0D8ABC&color=fff"
                        : "https://ui-avatars.com/api/?name=" + encodeURIComponent(res.data.nombre) + "&background=random",
                    permissions: res.data.roles ? res.data.roles.map((r: any) => r.nombre) : [],
                    colaboradorInfo: res.data.colaborador_info
                };
                setUser(userData);
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error("Session check failed, user likely not logged in");
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkSession();
    }, []);

    const login = async (role: 'admin' | 'user', credentials: Record<string, string>) => {
        try {
            setLoading(true);
            const endpoint = role === 'admin' ? '/php/login_admin.php' : '/php/login_colaborador.php';

            // Prepare FormData (application/x-www-form-urlencoded) because PHP Login scripts expect $_POST
            const params = new URLSearchParams();
            if (role === 'admin') {
                params.append('Ingreso_user', credentials.username || credentials.email); // Handle both keys
                params.append('password', credentials.password);
            } else {
                params.append('Ingreso_cedula', credentials.username || credentials.email);
                params.append('Password_colaborador', credentials.password);
            }

            let res = await api.post(endpoint, params.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            if (!res.data.success && res.data.concurrent_session) {
                console.warn("Concurrent session detected. Forcing login...");
                params.append('force_login', 'true');
                res = await api.post(endpoint, params.toString(), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
            }

            if (res.data.success) {
                // After successful login, check session to get full user details
                await checkSession();
            } else {
                throw new Error(res.data.message || 'Error de autenticación');
            }
        } catch (error: any) {
            console.error("Login failed", error);
            // Enhance error message if possible
            const msg = error.response?.data?.message || error.message || 'Error al iniciar sesión';
            throw new Error(msg);
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await api.get('/php/logout.php');
            setUser(null);
            // Optionally redirect to login or reload to clear states
            // window.location.href = '/login';
        } catch (error) {
            console.error("Logout failed", error);
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
