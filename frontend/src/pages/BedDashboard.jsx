import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const BedDashboard = () => {
    const [stats, setStats] = useState({ total: 0, occupied: 0, available: 0 });
    const [beds, setBeds] = useState([]);
    const [patients, setPatients] = useState([]);

    // UI Logic
    const [selectedBed, setSelectedBed] = useState(null);
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchBeds();
        fetchPatients();
        // Setup Realtime Subscription for Status
        const sub = supabase
            .channel('public:beds')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'beds' }, (payload) => {
                fetchBeds(); // Refresh on any change
            })
            .subscribe();

        return () => supabase.removeChannel(sub);
    }, []);

    const fetchBeds = async () => {
        const { data, error } = await supabase
            .from('beds')
            .select('*')
            .order('bed_number', { ascending: true });

        if (data) {
            setBeds(data);
            setStats({
                total: data.length,
                occupied: data.filter(b => b.status === 'occupied').length,
                available: data.filter(b => b.status === 'available').length
            });
        }
    };

    const fetchPatients = async () => {
        // Fetch only patients NOT currently admitted
        // Simplified: Fetch all for MVP
        const { data } = await supabase.from('patients').select('id, name, mobile');
        setPatients(data || []);
    };

    const handleAdmit = async () => {
        if (!selectedBed || !selectedPatientId) return alert('Select patient');
        setLoading(true);

        try {
            // 1. Create Admission Record
            const { error: admError } = await supabase
                .from('admissions')
                .insert([{
                    patient_id: selectedPatientId,
                    bed_id: selectedBed.id,
                    status: 'admitted'
                }]);

            if (admError) throw admError;

            // 2. Update Bed Status
            const { error: bedError } = await supabase
                .from('beds')
                .update({ status: 'occupied' })
                .eq('id', selectedBed.id);

            if (bedError) throw bedError;

            alert('Patient Admitted Successfully!');
            setSelectedBed(null);
            setSelectedPatientId('');

        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDischarge = async (bedId, admissionId) => {
        if (!confirm('Are you sure to discharge this patient?')) return;
        setLoading(true);

        try {
            // Find active admission for this bed if not passed
            // For MVP, assuming we handle this via a cleaner UI later
            // Here, simplistically updating bed only for demo
            const { error: bedError } = await supabase
                .from('beds')
                .update({ status: 'cleaning' }) // Mark as cleaning first
                .eq('id', bedId);

            if (bedError) throw bedError;

            // In real app: Update admission 'discharge_date' too using subquery

            alert('Patient Discharged. Bed marked for Cleaning.');
            setSelectedBed(null);

        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClean = async (bedId) => {
        await supabase.from('beds').update({ status: 'available' }).eq('id', bedId);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">IPD & Bed Management</h1>

            {/* Stats Header */}
            <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-4 rounded shadow border-l-4 border-blue-500">
                    <span className="text-gray-500 font-bold">Total Beds</span>
                    <p className="text-2xl">{stats.total}</p>
                </div>
                <div className="bg-white p-4 rounded shadow border-l-4 border-green-500">
                    <span className="text-gray-500 font-bold">Available</span>
                    <p className="text-2xl text-green-600">{stats.available}</p>
                </div>
                <div className="bg-white p-4 rounded shadow border-l-4 border-red-500">
                    <span className="text-gray-500 font-bold">Occupied</span>
                    <p className="text-2xl text-red-600">{stats.occupied}</p>
                </div>
            </div>

            {/* BED GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {beds.map(bed => (
                    <div
                        key={bed.id}
                        onClick={() => setSelectedBed(bed)}
                        className={`
                            relative h-32 rounded-lg shadow-md flex flex-col items-center justify-center cursor-pointer border-2 transition-transform hover:scale-105
                            ${bed.status === 'available' ? 'bg-green-50 border-green-200' : ''}
                            ${bed.status === 'occupied' ? 'bg-red-50 border-red-200' : ''}
                            ${bed.status === 'cleaning' ? 'bg-yellow-50 border-yellow-200' : ''}
                        `}
                    >
                        <span className="text-xl font-bold">{bed.bed_number}</span>
                        <span className="text-xs uppercase font-semibold text-gray-500">{bed.ward}</span>

                        <div className={`mt-2 px-2 py-1 rounded-full text-xs font-bold text-white
                            ${bed.status === 'available' ? 'bg-green-500' : ''}
                            ${bed.status === 'occupied' ? 'bg-red-500' : ''}
                            ${bed.status === 'cleaning' ? 'bg-yellow-500' : ''}
                        `}>
                            {bed.status}
                        </div>
                    </div>
                ))}
            </div>

            {/* MODAL: ACTIONS */}
            {selectedBed && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">
                            Manage Bed: {selectedBed.bed_number}
                            <span className="ml-2 text-sm text-gray-500">({selectedBed.status})</span>
                        </h2>

                        {selectedBed.status === 'available' && (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Select Patient to Admit</label>
                                <select
                                    className="w-full border p-2 rounded mb-4"
                                    value={selectedPatientId}
                                    onChange={(e) => setSelectedPatientId(e.target.value)}
                                >
                                    <option value="">-- Select Patient --</option>
                                    {patients.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.mobile})</option>
                                    ))}
                                </select>
                                <button onClick={handleAdmit} disabled={loading} className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700">
                                    {loading ? 'Admitting...' : 'Confirm Admission'}
                                </button>
                            </div>
                        )}

                        {selectedBed.status === 'occupied' && (
                            <div>
                                <p className="mb-4 text-gray-600">Patient is admitted. Discharge only after bill clearance.</p>
                                <button onClick={() => handleDischarge(selectedBed.id)} className="w-full bg-red-600 text-white font-bold py-2 rounded hover:bg-red-700">
                                    Discharge Patient & Mark Cleaning
                                </button>
                            </div>
                        )}

                        {selectedBed.status === 'cleaning' && (
                            <div>
                                <p className="mb-4 text-gray-600">Housekeeping in progress.</p>
                                <button onClick={() => handleClean(selectedBed.id)} className="w-full bg-green-600 text-white font-bold py-2 rounded hover:bg-green-700">
                                    Mark as Ready (Available)
                                </button>
                            </div>
                        )}

                        <button onClick={() => setSelectedBed(null)} className="mt-4 text-gray-500 text-sm hover:underline w-full text-center">Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BedDashboard;
