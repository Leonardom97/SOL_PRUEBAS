import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, IdCard, ArrowRight, Eye, EyeOff } from 'lucide-react';
import classNames from 'classnames';
import { useAuth } from '../contexts/AuthProvider';

type LoginType = 'colaborador' | 'admin';

const LoginPage = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [loginType, setLoginType] = useState<LoginType>('colaborador');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCredentials(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // Map Valid LoginType to AuthProvider expected role
            const role = loginType === 'colaborador' ? 'user' : 'admin';

            // Construct credentials object based on type
            // AuthProvider expects specific keys depending on the implementation
            // Usually 'email'/'password' map key names. 
            // Previous implementations showed mapping happens in AuthProvider or here.
            // Let's pass the raw credentials with keys matching form inputs.
            // "email" input holds Username/Cedula. "password" input holds Password.

            await login(role, {
                username: credentials.email, // Passing as generic username
                password: credentials.password
            });

            navigate('/dashboard');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error al iniciar sesión. Verifique sus credenciales.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl overflow-hidden p-8 animate-fade-in-up">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Bienvenido de nuevo</h2>
                <p className="text-slate-300">Selecciona tu tipo de ingreso</p>
            </div>

            {/* Toggle */}
            <div className="flex bg-slate-800/50 p-1 rounded-xl mb-8 relative">
                <div
                    className={classNames(
                        "absolute top-1 bottom-1 w-[calc(50%-4px)] bg-blue-600 rounded-lg transition-all duration-300 ease-out shadow-lg",
                        loginType === 'colaborador' ? "left-1" : "left-[calc(50%+4px)]"
                    )}
                />
                <button
                    onClick={() => setLoginType('colaborador')}
                    className={classNames(
                        "flex-1 py-2 text-sm font-medium z-10 transition-colors relative text-center",
                        loginType === 'colaborador' ? "text-white" : "text-slate-400 hover:text-white"
                    )}
                >
                    Colaboradores
                </button>
                <button
                    onClick={() => setLoginType('admin')}
                    className={classNames(
                        "flex-1 py-2 text-sm font-medium z-10 transition-colors relative text-center",
                        loginType === 'admin' ? "text-white" : "text-slate-400 hover:text-white"
                    )}
                >
                    Administradores
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        {loginType === 'colaborador' ? 'Cédula de Ciudadanía' : 'Usuario Administrativo'}
                    </label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            {loginType === 'colaborador' ? (
                                <IdCard className="h-5 w-5 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                            ) : (
                                <User className="h-5 w-5 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                            )}
                        </div>
                        <input
                            type="text"
                            name="email"
                            value={credentials.email}
                            onChange={handleChange}
                            required
                            className="block w-full pl-10 pr-3 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                            placeholder={loginType === 'colaborador' ? 'Ingrese su cédula' : 'Ingrese su usuario'}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Contraseña
                    </label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                        </div>
                        <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={credentials.password}
                            onChange={handleChange}
                            required
                            className="block w-full pl-10 pr-10 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                        >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center py-3 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold shadow-lg shadow-blue-500/30 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            Ingresar <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-8 text-center">
                <p className="text-xs text-slate-500">
                    © OSM 2025 - Sistema de Gestión
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
