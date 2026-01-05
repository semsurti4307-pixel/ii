import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import {
    LayoutDashboard,
    UserPlus,
    Stethoscope,
    Pill,
    CreditCard,
    BedDouble,
    BarChart3,
    LogOut,
    Menu,
    X,
    ShieldPlus
} from 'lucide-react';

const MainLayout = () => {
    const { user, role } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    // Navigation Items Configuration
    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'doctor', 'reception', 'pharmacist'] },
        { name: 'Reception', path: '/reception', icon: UserPlus, roles: ['admin', 'reception'] },
        { name: 'Doctor', path: '/doctor-dashboard', icon: Stethoscope, roles: ['admin', 'doctor'] },
        { name: 'Pharmacy', path: '/pharmacy', icon: Pill, roles: ['admin', 'pharmacist'] },
        { name: 'Billing', path: '/billing', icon: CreditCard, roles: ['admin', 'pharmacist'] },
        { name: 'IPD / Beds', path: '/beds', icon: BedDouble, roles: ['admin', 'reception'] },
        { name: 'Reports', path: '/admin', icon: BarChart3, roles: ['admin'] },
    ];

    // Filter based on Role
    const allowedNav = navItems.filter(item => item.roles.includes(role || ''));

    const NavLink = ({ item, mobile = false }) => {
        const isActive = location.pathname === item.path;
        return (
            <button
                onClick={() => { navigate(item.path); if (mobile) setIsMobileOpen(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full text-sm font-medium
                    ${isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }
                `}
            >
                <item.icon size={20} />
                <span>{item.name}</span>
            </button>
        );
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">

            {/* SIDEBAR (Desktop) */}
            <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 shadow-xl z-20">
                {/* Brand Logo area */}
                <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800">
                    <div className="bg-blue-600 p-1.5 rounded-lg">
                        <ShieldPlus className="text-white" size={24} />
                    </div>
                    <span className="text-xl font-bold tracking-wide text-white">CLINOVA</span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Menu</p>
                    {allowedNav.map(item => <NavLink key={item.path} item={item} />)}
                </nav>

                {/* User Profile Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-900">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-blue-200 font-bold uppercase text-xs">
                            {role?.[0] || 'U'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                            <p className="text-xs text-slate-400 capitalize">{role}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        <LogOut size={16} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* MOBILE HEADER & CONTENT */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Header */}
                <header className="md:hidden bg-slate-900 text-white flex items-center justify-between px-4 h-16 shadow-md z-20">
                    <div className="flex items-center gap-2">
                        <ShieldPlus className="text-blue-500" size={24} />
                        <span className="font-bold text-lg">CLINOVA</span>
                    </div>
                    <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="p-2">
                        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </header>

                {/* Mobile Drawer */}
                {isMobileOpen && (
                    <div className="md:hidden fixed inset-0 bg-slate-900 z-10 pt-20 px-4 space-y-2">
                        {allowedNav.map(item => <NavLink key={item.path} item={item} mobile={true} />)}
                        <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-4 text-red-400 mt-8 border-t border-slate-700">
                            <LogOut size={20} /> Logout
                        </button>
                    </div>
                )}

                {/* MAIN CONTENT SCROLLABLE AREA */}
                <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
