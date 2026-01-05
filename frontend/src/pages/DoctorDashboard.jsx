import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Search, Clock, Save, FileText, User, Calendar, Plus, Trash2, Printer, CheckCircle } from 'lucide-react';

const DoctorDashboard = () => {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [medicinesList, setMedicinesList] = useState([]); // Master list for dropdown
    const [loading, setLoading] = useState(false);

    // History State
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Prescription Form State
    const [diagnosis, setDiagnosis] = useState('');
    const [prescribedMeds, setPrescribedMeds] = useState([
        { name: '', dosage: '', duration: '' }
    ]);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (showHistory && selectedPatient) {
            fetchPatientHistory();
        }
    }, [showHistory, selectedPatient]);

    useEffect(() => {
        fetchAppointments();
        fetchMedicines();

        // Realtime subscription for new appointments
        const channel = supabase
            .channel('doctor-appts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'appointments' }, () => {
                fetchAppointments();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchPatientHistory = async () => {
        if (!selectedPatient) return;
        setHistoryLoading(true);
        const { data, error } = await supabase
            .from('prescriptions')
            .select('*')
            .eq('patient_id', selectedPatient.patient_id)
            .order('created_at', { ascending: false })
            .limit(5); // Last 5 visits

        if (error) console.error("History fetch error:", error);
        else setHistory(data || []);
        setHistoryLoading(false);
    };

    const fetchAppointments = async () => {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('appointments')
            .select('*, patients(name, age, gender, mobile, symptoms)')
            .eq('status', 'waiting')
            .gte('created_at', today)
            .order('token_number', { ascending: true });

        if (error) console.error("Error fetching queue:", error);
        else setAppointments(data || []);
    };

    const fetchMedicines = async () => {
        const { data } = await supabase.from('medicines').select('name');
        setMedicinesList(data || []);
    };

    const handleSelectPatient = (apt) => {
        setSelectedPatient(apt);
        setDiagnosis('');
        setPrescribedMeds([{ name: '', dosage: '', duration: '' }]);
        setNotes('');
        setShowHistory(false); // Reset history view
        setHistory([]);
    };

    const handleMedChange = (index, field, value) => {
        const newMeds = [...prescribedMeds];
        newMeds[index][field] = value;
        setPrescribedMeds(newMeds);
    };

    const addMedRow = () => {
        setPrescribedMeds([...prescribedMeds, { name: '', dosage: '', duration: '' }]);
    };

    const removeMedRow = (index) => {
        const newMeds = prescribedMeds.filter((_, i) => i !== index);
        setPrescribedMeds(newMeds);
    };

    const handleSavePrescription = async () => {
        if (!diagnosis) return alert("Please enter a diagnosis.");
        setLoading(true);

        try {
            // 1. Create Prescription Header
            const { data: rxData, error: rxError } = await supabase
                .from('prescriptions')
                .insert([{
                    appointment_id: selectedPatient.id,
                    patient_id: selectedPatient.patient_id,
                    doctor_id: user.id, // Assuming doc is logged in
                    diagnosis: diagnosis,
                    notes: notes
                }])
                .select()
                .single();

            if (rxError) throw rxError;

            // 2. Add Medicines
            const medInserts = prescribedMeds
                .filter(m => m.name.trim() !== '')
                .map(m => ({
                    prescription_id: rxData.id,
                    medicine_name: m.name,
                    dosage: m.dosage,
                    duration: m.duration
                }));

            if (medInserts.length > 0) {
                const { error: medError } = await supabase
                    .from('prescription_medicines')
                    .insert(medInserts);
                if (medError) throw medError;
            }

            // 3. Mark Appointment as Completed
            const { error: updateError } = await supabase
                .from('appointments')
                .update({ status: 'completed' })
                .eq('id', selectedPatient.id);

            if (updateError) throw updateError;

            alert("Prescription Saved Successfully!");
            fetchAppointments(); // Refresh Queue
            setSelectedPatient(null);

        } catch (error) {
            console.error("Error saving Rx:", error);
            alert("Failed to save: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex bg-slate-100 p-4 h-[calc(100vh-64px)] overflow-hidden gap-4">

            {/* LEFT PANEL: WAITING QUEUE */}
            <div className="w-1/3 bg-white rounded-xl shadow-card border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <User size={18} className="text-blue-600" />
                        Waiting Queue ({appointments.length})
                    </h2>
                    <button onClick={fetchAppointments} className="text-xs text-blue-600 hover:underline">Refresh</button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {appointments.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <Clock size={40} className="mx-auto mb-2 opacity-50" />
                            <p>No patients waiting.</p>
                        </div>
                    ) : (
                        appointments.map((apt) => (
                            <div
                                key={apt.id}
                                onClick={() => handleSelectPatient(apt)}
                                className={`p-4 rounded-lg cursor-pointer border transition-all ${selectedPatient?.id === apt.id
                                    ? 'bg-blue-50 border-blue-500 shadow-md transform scale-[1.02]'
                                    : 'bg-white border-slate-100 hover:border-blue-300 hover:shadow-sm'
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-slate-900">{apt.patients?.name}</h3>
                                        <p className="text-xs text-slate-500">{apt.patients?.gender}, {apt.patients?.age} yrs</p>
                                    </div>
                                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
                                        #{apt.token_number}
                                    </span>
                                </div>
                                <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                                    <Clock size={12} />
                                    <span>{new Date(apt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT PANEL: CLINICAL WORKSPACE */}
            <div className="flex-1 bg-white rounded-xl shadow-card border border-slate-200 flex flex-col overflow-hidden">
                {selectedPatient ? (
                    <>
                        {/* PATIENT HEADER (Premium Gradient) */}
                        <div className="p-6 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-full bg-white border-2 border-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl shadow-sm">
                                    {selectedPatient.patients?.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight capitalize">
                                        {selectedPatient.patients?.name}
                                    </h1>
                                    <p className="text-sm text-slate-500 mt-1 flex items-center gap-3 font-medium">
                                        <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                                            {selectedPatient.patients?.gender}, {selectedPatient.patients?.age} Yrs
                                        </span>
                                        <span className="text-slate-300">|</span>
                                        <span>+91 {selectedPatient.patients?.mobile}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="text-right bg-white p-2 px-4 rounded-lg border border-blue-100 shadow-sm">
                                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">OPD Token</p>
                                <p className="text-3xl font-extrabold text-blue-600">#{selectedPatient.token_number}</p>
                            </div>
                        </div>

                        {/* HISTORY SECTION (Collapsible) */}
                        <div className="px-6 py-2 bg-slate-50 border-b border-slate-100">
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className="text-xs font-bold text-blue-600 flex items-center gap-2 hover:underline"
                            >
                                <Clock size={14} />
                                {showHistory ? "Hide Medical History" : "View Patient History"}
                            </button>

                            {showHistory && (
                                <div className="mt-3 space-y-3 mb-2">
                                    {historyLoading ? (
                                        <p className="text-xs text-slate-400">Loading history...</p>
                                    ) : history.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic">No previous records found.</p>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {history.map(record => (
                                                <div key={record.id} className="bg-white p-3 rounded border border-slate-200 shadow-sm text-sm">
                                                    <div className="flex justify-between mb-1">
                                                        <span className="font-bold text-slate-700">{new Date(record.created_at).toLocaleDateString()}</span>
                                                        <span className="text-xs text-slate-400">Visited</span>
                                                    </div>
                                                    <p className="text-slate-600 font-medium line-clamp-1">{record.diagnosis}</p>
                                                    {record.notes && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{record.notes}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* PRESCRIPTION FORM */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">

                            {/* CHIEF COMPLAINT ALERT (New) */}
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                                <div className="p-1 bg-amber-100 rounded text-amber-600 mt-0.5">
                                    <FileText size={16} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-amber-800 uppercase tracking-wide">Chief Complaint / Symptoms</h4>
                                    <p className="text-slate-700 font-medium mt-1">
                                        {selectedPatient.patients?.symptoms || "No specific symptoms recorded."}
                                    </p>
                                </div>
                            </div>

                            {/* Diagnosis Section */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
                                    <FileText size={18} className="text-blue-500" />
                                    Clinical Diagnosis
                                </label>
                                <textarea
                                    className="w-full bg-slate-50 border-0 rounded-xl p-4 text-slate-700 shadow-inner focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all resize-none font-medium text-base placeholder:text-slate-400"
                                    rows="3"
                                    placeholder="Type diagnosis here (e.g. Acute Viral Fever, Hypertension)..."
                                    value={diagnosis}
                                    onChange={(e) => setDiagnosis(e.target.value)}
                                ></textarea>
                            </div>

                            {/* Medicines Section */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
                                        <Plus size={18} className="text-blue-500" />
                                        Rx / Medicines
                                    </label>
                                    <button onClick={addMedRow} className="text-xs flex items-center gap-1 text-blue-700 font-bold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-100">
                                        <Plus size={14} /> Add Medicine
                                    </button>
                                </div>

                                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs tracking-wider">
                                            <tr>
                                                <th className="p-4 pl-5">Medicine Name</th>
                                                <th className="p-4">Dosage (Freq)</th>
                                                <th className="p-4">Duration</th>
                                                <th className="p-4 w-12 text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {prescribedMeds.map((med, idx) => (
                                                <tr key={idx} className="group hover:bg-blue-50/50 transition-colors">
                                                    <td className="p-3 pl-5">
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                placeholder="Search or type medicine..."
                                                                className="w-full bg-slate-50 border border-transparent focus:bg-white focus:border-blue-300 rounded-lg px-3 py-2 outline-none font-medium text-slate-700 transition-all placeholder:font-normal"
                                                                value={med.name}
                                                                onChange={(e) => handleMedChange(idx, 'name', e.target.value)}
                                                                list="med-list"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <input
                                                            type="text"
                                                            placeholder="1-0-1 (M-N-E)"
                                                            className="w-full bg-slate-50 border border-transparent focus:bg-white focus:border-blue-300 rounded-lg px-3 py-2 outline-none transition-all placeholder:text-slate-400"
                                                            value={med.dosage}
                                                            onChange={(e) => handleMedChange(idx, 'dosage', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. 5 Days"
                                                            className="w-full bg-slate-50 border border-transparent focus:bg-white focus:border-blue-300 rounded-lg px-3 py-2 outline-none transition-all placeholder:text-slate-400"
                                                            value={med.duration}
                                                            onChange={(e) => handleMedChange(idx, 'duration', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <button
                                                            onClick={() => removeMedRow(idx)}
                                                            className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all"
                                                            title="Remove Row"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <datalist id="med-list">
                                        {medicinesList.map((m, i) => <option key={i} value={m.name} />)}
                                    </datalist>
                                </div>
                                {prescribedMeds.length === 0 && (
                                    <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        <p className="text-sm">No medicines added.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ACTION FOOTER */}
                        <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                            <button className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
                                <Printer size={18} /> Print Record
                            </button>
                            <button
                                onClick={handleSavePrescription}
                                disabled={loading}
                                className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center gap-2 transform hover:-translate-y-0.5"
                            >
                                {loading ? 'Saving...' : <><CheckCircle size={18} /> Complete & Send to Pharmacy</>}
                            </button>
                        </div>
                    </>
                ) : (
                    /* EMPTY STATE (IDLE MODE) */
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-slate-50/50">
                        <div className="bg-white p-8 rounded-full mb-6 shadow-sm border border-slate-100">
                            <FileText size={64} className="text-blue-100" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-600">No Patient Selected</h3>
                        <p className="max-w-xs text-center mt-2 text-slate-400">Select a patient from the waiting queue list to start the clinical consultation.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DoctorDashboard;
