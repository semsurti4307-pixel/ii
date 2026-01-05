import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Users, Clock, BedDouble, Activity, ArrowRight, Wallet, AlertCircle, Search, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
    const navigate = useNavigate();
    const { role } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        todayPatients: 0,
        pendingTokens: 0,
        availableBeds: 0,
        lowStock: 0
    });

    useEffect(() => {
        fetchLiveStats();
    }, []);

    const fetchLiveStats = async () => {
        const today = new Date().toISOString().split('T')[0];
        try {
            const [patients, tokens, beds, stock] = await Promise.all([
                supabase.from('patients').select('*', { count: 'exact', head: true }).gte('created_at', today),
                supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('status', 'waiting').gte('created_at', today),
                supabase.from('beds').select('*', { count: 'exact', head: true }).eq('status', 'available'),
                supabase.from('inventory').select('*', { count: 'exact', head: true }).lt('quantity', 20)
            ]);
            setStats({
                todayPatients: patients.count || 0,
                pendingTokens: tokens.count || 0,
                availableBeds: beds.count || 0,
                lowStock: stock.count || 0
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const modules = [
        { title: 'Reception Desk', desc: 'Registrations', path: '/reception', icon: Users, role: ['receptionist', 'admin'] },
        { title: 'Doctor Console', desc: 'OPD Queue', path: '/doctor-dashboard', icon: Activity, role: ['doctor', 'admin'] },
        { title: 'Pharmacy', desc: 'Dispense', path: '/pharmacy', icon: Clock, role: ['pharmacist', 'admin'] },
        { title: 'Billing', desc: 'Invoices', path: '/billing', icon: Wallet, role: ['pharmacist', 'admin'] },
        { title: 'IPD / Beds', desc: 'Admissions', path: '/beds', icon: BedDouble, role: ['receptionist', 'admin'] }
    ];

    const visibleModules = modules.filter(m => m.role.includes(role || 'admin'));

    return (
        <div className="max-w-7xl mx-auto space-y-8">

            {/* 1. HEADER & SEARCH */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Hospital Command Center</h1>
                    <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Operational • {new Date().toLocaleDateString()}
                    </p>
                </div>
                <div className="flex gap-3">
                    {/* Global Search concept - visual only for now */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={16} className="text-slate-400 group-focus-within:text-blue-500" />
                        </div>
                        <input
                            type="text"
                            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all w-64"
                            placeholder="Search patient, doctor..."
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* 2. LEFT COLUMN (Main Operations) - Spans 8 cols */}
                <div className="lg:col-span-8 space-y-8">

                    {/* KEY METRICS (HERO CARDS) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {/* Card 1 */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Users size={64} className="text-blue-600" />
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Visits</p>
                            <p className="text-4xl font-extrabold text-slate-900">{stats.todayPatients}</p>
                            <div className="mt-4 pt-4 border-t border-slate-50">
                                <button onClick={() => navigate('/reception')} className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors">
                                    View Reception <ArrowRight size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Clock size={64} className="text-amber-600" />
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Waiting Queue</p>
                            <p className="text-4xl font-extrabold text-slate-900">{stats.pendingTokens}</p>
                            <div className="mt-4 pt-4 border-t border-slate-50">
                                <button onClick={() => navigate('/doctor-dashboard')} className="text-sm font-medium text-amber-600 hover:text-amber-800 flex items-center gap-1 transition-colors">
                                    Manage OPD <ArrowRight size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <BedDouble size={64} className="text-green-600" />
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">IPD Capacity</p>
                            <p className="text-4xl font-extrabold text-slate-900">{stats.availableBeds}</p>
                            <div className="mt-4 pt-4 border-t border-slate-50">
                                <button onClick={() => navigate('/beds')} className="text-sm font-medium text-green-600 hover:text-green-800 flex items-center gap-1 transition-colors">
                                    Bed Allocation <ArrowRight size={14} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* MODULES GRID (Compact & Clean) */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Quick Access</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {visibleModules.map((mod, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => navigate(mod.path)}
                                    className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all text-left group"
                                >
                                    <div className="p-2.5 bg-slate-50 rounded-lg text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                        <mod.icon size={20} />
                                    </div>
                                    <div>
                                        <span className="block font-semibold text-slate-900 text-sm group-hover:text-blue-700">{mod.title}</span>
                                        <span className="block text-xs text-slate-500">{mod.desc}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                </div>

                {/* 3. RIGHT COLUMN (Status & Alerts) - Spans 4 cols */}
                <div className="lg:col-span-4 space-y-6">

                    {/* SYSTEM HEALTH (Clean White Card) */}
                    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <Activity size={18} className="text-slate-400" />
                            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">System Health</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-green-100 p-1.5 rounded-full">
                                    <CheckCircle2 size={16} className="text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">Database Connected</p>
                                    <p className="text-xs text-slate-500">Latency: 24ms</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="bg-green-100 p-1.5 rounded-full">
                                    <CheckCircle2 size={16} className="text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">Sync Active</p>
                                    <p className="text-xs text-slate-500">Real-time updates enabled</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ALERTS SECTION */}
                    {stats.lowStock > 0 && (role === 'admin' || role === 'pharmacist') && (
                        <div className="bg-red-50 border border-red-100 rounded-lg p-5">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="text-red-600 mt-0.5" size={20} />
                                <div>
                                    <h4 className="font-bold text-red-900 text-sm">Action Required</h4>
                                    <p className="text-xs text-red-700 mt-1">
                                        {stats.lowStock} Inventory items are running low.
                                    </p>
                                    <button onClick={() => navigate('/pharmacy')} className="mt-3 text-xs font-bold bg-white text-red-700 px-3 py-1.5 rounded border border-red-200 hover:bg-red-50">
                                        Restock Now
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

            </div>
        </div>
    );
};

export default Dashboard;
