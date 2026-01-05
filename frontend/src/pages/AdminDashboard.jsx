import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [dateRange, setDateRange] = useState('today'); // 'today', 'week', 'month'
    const [loading, setLoading] = useState(false);

    // Stats State
    const [stats, setStats] = useState({
        totalRevenue: 0,
        opdCount: 0,
        ipdCount: 0,
        pharmacySales: 0
    });

    // Lists
    const [lowStock, setLowStock] = useState([]);
    const [recentAdmissions, setRecentAdmissions] = useState([]);
    const [topDoctors, setTopDoctors] = useState([]); // Mock for MVP agg

    useEffect(() => {
        fetchAdminData();
    }, [dateRange]);

    const getDateFilter = () => {
        const today = new Date();
        if (dateRange === 'week') {
            today.setDate(today.getDate() - 7);
        } else if (dateRange === 'month') {
            today.setMonth(today.getMonth() - 1);
        } else {
            // 'today' - set to beginning of today
            today.setHours(0, 0, 0, 0);
        }
        return today.toISOString();
    };

    const fetchAdminData = async () => {
        setLoading(true);
        const sinceDate = getDateFilter();

        try {
            // 1. REVENUE (Total Payments)
            const { data: payData } = await supabase
                .from('payments')
                .select('amount, payment_mode')
                .gte('paid_at', sinceDate);

            const revenue = payData?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;

            // 2. OPD TOKENS (Appointments)
            const { count: opd } = await supabase
                .from('appointments')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', sinceDate);

            // 3. IPD ADMISSIONS
            const { count: ipd } = await supabase
                .from('admissions')
                .select('*', { count: 'exact', head: true })
                .gte('admit_date', sinceDate);

            // 4. LOW STOCK (Inventory Risk) - Not date dependent
            const { data: stock } = await supabase
                .from('inventory')
                .select('quantity, medicines(name), batch_no, expiry')
                .lt('quantity', 20) // Threshold 20
                .order('quantity');

            // 5. DOCTOR STATS (Top 5 Doctors by OPD load)
            // Note: GroupBy is complex in client-side Supabase, usually done via RPC.
            // Simplified: Fetch all appointments, aggregate locally.
            const { data: allAppts } = await supabase
                .from('appointments')
                .select('doctor_id')
                .gte('created_at', sinceDate);

            const docMap = {};
            allAppts?.forEach(a => {
                docMap[a.doctor_id] = (docMap[a.doctor_id] || 0) + 1;
            });
            // Ideally map ID to Name here.

            setStats({
                totalRevenue: revenue,
                opdCount: opd || 0,
                ipdCount: ipd || 0,
                pharmacySales: 0 // Ideally query bill_items type='medicine'
            });

            setLowStock(stock || []);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b shadow-sm p-4 flex justify-between items-center px-8">
                <h1 className="text-2xl font-bold text-gray-800">Admin Command Center</h1>
                <div className="flex items-center gap-4">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-1 bg-gray-50 text-sm"
                    >
                        <option value="today">Today</option>
                        <option value="week">Last 7 Days</option>
                        <option value="month">Last 30 Days</option>
                    </select>
                    <button onClick={() => navigate('/dashboard')} className="text-blue-600 font-bold hover:underline">Exit</button>
                </div>
            </div>

            {/* Dashboard Content */}
            <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-6">

                {/* 1. METRIC CARDS */}
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                    <p className="text-xs font-bold text-gray-500 uppercase">Total Revenue</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">₹{stats.totalRevenue.toLocaleString()}</p>
                    <p className="text-xs text-green-600 mt-1">Via {dateRange}</p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                    <p className="text-xs font-bold text-gray-500 uppercase">OPD Patients</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{stats.opdCount}</p>
                    <p className="text-xs text-blue-600 mt-1">Visits</p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
                    <p className="text-xs font-bold text-gray-500 uppercase">IPD Admissions</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{stats.ipdCount}</p>
                    <p className="text-xs text-red-600 mt-1">New Admits</p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
                    <p className="text-xs font-bold text-gray-500 uppercase">Low Stock Alerts</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{lowStock.length}</p>
                    <p className="text-xs text-yellow-600 mt-1">Items below threshold</p>
                </div>

                {/* 2. MAIN REPORTS SECTION */}
                <div className="col-span-1 md:col-span-2 bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">⚠️ Critical Inventory (Stock risk)</h2>
                    <div className="overflow-auto h-64">
                        <table className="w-full text-sm text-left">
                            <thead className="text-gray-500 bg-gray-50">
                                <tr>
                                    <th className="p-2">Medicine</th>
                                    <th className="p-2">Batch</th>
                                    <th className="p-2">Expiry</th>
                                    <th className="p-2 text-right">Qty</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lowStock.map((item, idx) => (
                                    <tr key={idx} className="border-b">
                                        <td className="p-2 font-medium">{item.medicines?.name || 'Unknown'}</td>
                                        <td className="p-2 text-xs">{item.batch_no}</td>
                                        <td className="p-2 text-xs text-red-500">{item.expiry}</td>
                                        <td className="p-2 text-right font-bold text-red-600">{item.quantity}</td>
                                    </tr>
                                ))}
                                {lowStock.length === 0 && <tr><td colSpan="4" className="p-4 text-center text-green-500">Stock Healthy!</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="col-span-1 md:col-span-2 bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">📊 Financial Overview</h2>
                    <div className="flex items-center justify-center h-64 bg-gray-50 rounded border border-dashed border-gray-300 text-gray-400">
                        {/* Placeholder for Chart.js / Recharts */}
                        <p>Chart Component Integration Planned (Next Step)</p>
                    </div>
                    {/* <button className="mt-4 text-blue-600 hover:underline text-sm font-bold">Download Full Report (CSV)</button> */}
                </div>

            </div>
        </div>
    );
};

export default AdminDashboard;
