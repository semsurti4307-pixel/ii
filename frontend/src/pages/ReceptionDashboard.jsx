import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Users } from 'lucide-react';

const ReceptionDashboard = () => {
    const [patients, setPatients] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [searchMobile, setSearchMobile] = useState('');
    const [existingPatient, setExistingPatient] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        age: '',
        gender: 'Male',
        mobile: '',
        symptoms: '',
        doctorId: ''
    });

    useEffect(() => {
        fetchDoctors();
        fetchTodayAppointments();

        // Realtime subscription for new appointments
        const channel = supabase
            .channel('realtime appointments')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'appointments' }, payload => {
                console.log('New appointment!', payload);
                fetchTodayAppointments();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchDoctors = async () => {
        // Fetch profiles with role 'doctor'
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'doctor');

        if (error) console.error('Error fetching doctors:', error);
        else setDoctors(data || []);
    };

    const fetchTodayAppointments = async () => {
        // Get appointments for today
        const { data, error } = await supabase
            .from('appointments')
            .select('*, patients(name, age, gender, mobile)')
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching appointments:', error);
        else setPatients(data || []);
    };

    const handleSearchPatient = async (e) => {
        e.preventDefault();
        if (!searchMobile) return alert("Enter mobile number to search");
        setSearching(true);
        setExistingPatient(null);

        try {
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .eq('mobile', searchMobile)
                .single(); // Assuming mobile is unique roughly or we take first match logic

            if (data) {
                setExistingPatient(data);
                // Pre-fill form (except symptoms & doctor)
                setFormData({
                    ...formData,
                    name: data.name,
                    age: data.age,
                    gender: data.gender,
                    mobile: data.mobile,
                    symptoms: '' // Clear symptoms for new visit
                });
                alert("Patient Found! Creating new token for existing patient.");
            } else {
                alert("No patient found. Please fill details for new registration.");
                // Reset form but keep mobile
                setFormData({
                    name: '',
                    age: '',
                    gender: 'Male',
                    mobile: searchMobile,
                    symptoms: '',
                    doctorId: ''
                });
            }
        } catch (err) {
            console.log("Search error (likely not found):", err.message);
            // If .single() fails because 0 rows, it throws error. Treat as not found.
            alert("No patient found. Registering as NEW.");
            setFormData({
                name: '',
                age: '',
                gender: 'Male',
                mobile: searchMobile,
                symptoms: '',
                doctorId: ''
            });
        } finally {
            setSearching(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let patientId = existingPatient?.id;

            // 1. If NOT existing patient, Insert New
            if (!patientId) {
                const { data: patientData, error: patientError } = await supabase
                    .from('patients')
                    .insert([{
                        name: formData.name,
                        age: formData.age,
                        gender: formData.gender,
                        mobile: formData.mobile,
                        symptoms: existingPatient ? existingPatient.symptoms : formData.symptoms
                    }])
                    .select()
                    .single();

                if (patientError) throw patientError;
                patientId = patientData.id;
            } else {
                const { error: updateError } = await supabase
                    .from('patients')
                    .update({
                        age: formData.age,
                        symptoms: formData.symptoms
                    })
                    .eq('id', patientId);
                if (updateError) console.warn("Could not update patient details", updateError);
            }

            // 2. Generate Daily Token Number for Doctor
            // Get today's start timestamp
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayISO = today.toISOString();

            // Count existing appointments for this doctor today
            const { count, error: countError } = await supabase
                .from('appointments')
                .select('*', { count: 'exact', head: true })
                .eq('doctor_id', formData.doctorId)
                .gte('created_at', todayISO);

            if (countError) throw countError;

            // Increment count for new token
            const nextToken = (count || 0) + 1;

            // 3. Create Appointment/Token
            const { error: appointmentError } = await supabase
                .from('appointments')
                .insert([{
                    patient_id: patientId,
                    doctor_id: formData.doctorId || null,
                    status: 'waiting',
                    token_number: nextToken
                }]);

            if (appointmentError) throw appointmentError;

            // Reset Form and Refresh
            setExistingPatient(null);
            setSearchMobile('');
            setFormData({
                name: '',
                age: '',
                gender: 'Male',
                mobile: '',
                symptoms: '',
                doctorId: ''
            });
            fetchTodayAppointments();
            alert(`Token #${nextToken} Generated Successfully!`);

        } catch (error) {
            console.error('Error registering patient:', error);
            alert('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-bold text-gray-900">Reception Desk</h1>
                </div>
            </header>
            <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* LEFT: Registration Form */}
                    <div className="bg-white p-6 rounded-lg shadow">

                        {/* Search Bar */}
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <h3 className="text-sm font-bold text-blue-800 mb-2">Search Existing Patient</h3>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Enter Mobile Number"
                                    className="flex-grow rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    value={searchMobile}
                                    onChange={(e) => setSearchMobile(e.target.value)}
                                />
                                <button
                                    onClick={handleSearchPatient}
                                    disabled={searching}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-blue-700"
                                >
                                    {searching ? '...' : 'Search'}
                                </button>
                            </div>
                        </div>

                        <h2 className="text-xl font-bold mb-4 text-gray-700">
                            {existingPatient ? 'New Appointment (Old Patient)' : 'New Patient Registration'}
                        </h2>

                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Patient Name</label>
                                    <input
                                        required
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        disabled={!!existingPatient} // Disable name edit if existing
                                        className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${existingPatient ? 'bg-gray-100' : ''}`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Age</label>
                                    <input required type="number" name="age" value={formData.age} onChange={handleInputChange} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Gender</label>
                                    <select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleInputChange}
                                        disabled={!!existingPatient}
                                        className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${existingPatient ? 'bg-gray-100' : ''}`}
                                    >
                                        <option>Male</option>
                                        <option>Female</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                                    <input required type="text" name="mobile" value={formData.mobile} onChange={handleInputChange} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Symptoms / Purpose</label>
                                    <textarea name="symptoms" value={formData.symptoms} onChange={handleInputChange} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" rows="2"></textarea>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Assign Doctor</label>
                                    <select name="doctorId" value={formData.doctorId} onChange={handleInputChange} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                                        <option value="">-- Select Doctor --</option>
                                        {doctors.map(doc => (
                                            <option key={doc.id} value={doc.id}>{doc.full_name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="mt-6">
                                <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                    {loading ? 'Processing...' : (existingPatient ? 'Generate Token (Old Patient)' : 'Register & Generate Token')}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* RIGHT: Live Token Board */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-bold mb-4 text-green-600">Today's Tokens (Live)</h2>
                        <div className="overflow-y-auto max-h-[600px]">
                            {patients.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                                    <div className="bg-blue-100 p-3 rounded-full mb-3">
                                        <Users className="text-blue-500" size={32} />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900">No Patients Found</h3>
                                    <p className="text-sm text-gray-500 max-w-sm mt-1">
                                        No appointments have been made for today yet.
                                    </p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-gray-200">
                                    {patients.map((apt) => (
                                        <li key={apt.id} className="py-4 flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{apt.patients?.name || 'Unknown'}</p>
                                                <p className="text-xs text-gray-500">
                                                    {apt.patients?.gender}, {apt.patients?.age} | {apt.patients?.mobile}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">Symptoms: {apt.patients?.symptoms}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Token #{apt.token_number}
                                                </span>
                                                <p className="text-xs text-gray-500 mt-1 uppercase font-bold">{apt.status}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ReceptionDashboard;
