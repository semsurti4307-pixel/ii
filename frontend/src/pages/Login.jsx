import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldPlus, Lock, Mail, ArrowRight } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            navigate('/dashboard');

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-card border border-slate-100 overflow-hidden">

                {/* BRAND HEADER */}
                <div className="bg-slate-900 p-8 text-center text-white">
                    <div className="flex justify-center mb-3">
                        <div className="bg-blue-600 p-2 rounded-lg">
                            <ShieldPlus size={32} className="text-white" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">CLINOVA</h1>
                    <p className="text-blue-200 text-sm mt-1">Hospital Management System</p>
                </div>

                {/* FORM SECTION */}
                <div className="p-8">
                    <form onSubmit={handleLogin} className="space-y-5">
                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded border border-red-100">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Email Address</label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-3 top-2.5 text-slate-400" />
                                <input
                                    type="email"
                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Password</label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-3 top-2.5 text-slate-400" />
                                <input
                                    type="password"
                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
                            {!loading && <ArrowRight size={18} />}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-xs text-slate-400">
                            Don't have an access ID?{' '}
                            <Link to="/register" className="text-blue-600 hover:underline font-semibold">Contact Admin</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
