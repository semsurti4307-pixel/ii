import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const PharmacyDashboard = () => {
    const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' or 'queue'
    const [prescriptions, setPrescriptions] = useState([]);
    const [selectedRx, setSelectedRx] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(false);

    // Form inputs for adding stock
    const [newMedName, setNewMedName] = useState('');
    const [newBatch, setNewBatch] = useState('');
    const [newExpiry, setNewExpiry] = useState('');
    const [newQty, setNewQty] = useState('');
    const [newMrp, setNewMrp] = useState('');

    useEffect(() => {
        if (activeTab === 'inventory') fetchInventory();
        else fetchQueue();
    }, [activeTab]);

    // --- 1. INVENTORY LOGIC ---
    const fetchInventory = async () => {
        const { data, error } = await supabase
            .from('inventory')
            .select('*, medicines(name, strength, unit)')
            .order('expiry', { ascending: true });

        if (error) console.error(error);
        else setInventory(data || []);
    };

    const handleAddStock = async () => {
        if (!newMedName || !newBatch || !newQty) return alert("Fill all details");
        setLoading(true);

        try {
            // A. Check if Medicine exists in Master, else Create
            let medId;
            const { data: existingMed } = await supabase
                .from('medicines')
                .select('id')
                .ilike('name', newMedName)
                .single();

            if (existingMed) {
                medId = existingMed.id;
            } else {
                const { data: newMed, error: medError } = await supabase
                    .from('medicines')
                    .insert([{ name: newMedName, strength: '500mg', unit: 'tab' }])
                    .select()
                    .single();

                if (medError) throw medError;
                medId = newMed.id;
            }

            // B. Add to Inventory
            const { error: invError } = await supabase
                .from('inventory')
                .insert([{
                    medicine_id: medId,
                    batch_no: newBatch,
                    expiry: newExpiry,
                    quantity: parseInt(newQty),
                    mrp: parseFloat(newMrp)
                }]);

            if (invError) throw invError;

            alert('Stock Added Successfully!');
            fetchInventory();
            setNewMedName(''); setNewBatch(''); setNewQty('');

        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // --- 2. DISPENSE LOGIC ---
    const fetchQueue = async () => {
        // Fetch prescriptions created today
        const today = new Date().toISOString().split('T')[0];
        const { data: rxData, error } = await supabase
            .from('prescriptions')
            .select(`
                *,
                patients (name, age, gender),
                prescription_medicines (*)
            `)
            .gte('created_at', today)
            // Filter logic needed here: show only those NOT fully dispensed
            // For now, simple list
            .order('created_at', { ascending: false });

        if (error) console.error(error);
        else setPrescriptions(rxData || []);
    };

    const handleDispense = async () => {
        if (!selectedRx) return;
        setLoading(true);

        try {
            // For each prescribed medicine, find a batch and deduct stock
            // This is complex logic. SIMPLIFIED for prototype:
            // Assuming 1st matching batch has enough stock. (Real app needs batch selector)

            for (const med of selectedRx.prescription_medicines) {
                // Find medicine ID by name (fuzzy match)
                const { data: medMaster } = await supabase
                    .from('medicines')
                    .select('id')
                    .ilike('name', med.medicine_name)
                    .single();

                if (!medMaster) {
                    console.warn(`Medicine ${med.medicine_name} not found in inventory.`);
                    continue; // Skip if unknown medicine
                }

                // Find First Active Batch with Quantity
                const { data: batch } = await supabase
                    .from('inventory')
                    .select('*')
                    .eq('medicine_id', medMaster.id)
                    .gt('quantity', 0)
                    .order('expiry', { ascending: true }) // FIFO
                    .limit(1)
                    .single();

                if (batch) {
                    // 1. Deduct Stock
                    await supabase
                        .from('inventory')
                        .update({ quantity: batch.quantity - 1 }) // Deducting 1 unit/strip for now
                        .eq('id', batch.id);

                    // 2. Log Dispense
                    await supabase
                        .from('pharmacy_dispense')
                        .insert([{
                            prescription_id: selectedRx.id,
                            medicine_id: medMaster.id,
                            batch_id: batch.id,
                            quantity: 1,
                            status: 'dispensed'
                        }]);
                }
            }

            alert('Medicines Dispensed & Stock Updated!');
            setSelectedRx(null);
            fetchQueue();

        } catch (error) {
            alert('Dispense Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {/* Top Bar */}
            <div className="bg-purple-800 text-white p-4 flex justify-between items-center shadow-md">
                <h1 className="text-xl font-bold">Pharmacy Module</h1>
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`px-4 py-2 rounded ${activeTab === 'inventory' ? 'bg-white text-purple-800 font-bold' : 'bg-purple-700 hover:bg-purple-600'}`}
                    >
                        Inventory (Stock)
                    </button>
                    <button
                        onClick={() => setActiveTab('queue')}
                        className={`px-4 py-2 rounded ${activeTab === 'queue' ? 'bg-white text-purple-800 font-bold' : 'bg-purple-700 hover:bg-purple-600'}`}
                    >
                        Queue (Dispense)
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-grow p-6">

                {/* --- TAB 1: INVENTORY --- */}
                {activeTab === 'inventory' && (
                    <div className="flex gap-6">
                        {/* Add Stock Form */}
                        <div className="w-1/3 bg-white p-6 rounded-lg shadow h-fit">
                            <h2 className="text-lg font-bold text-gray-700 mb-4">Add New Stock</h2>
                            <div className="space-y-4">
                                <input className="w-full p-2 border rounded" placeholder="Medicine Name (e.g. Dolo 650)" value={newMedName} onChange={e => setNewMedName(e.target.value)} />
                                <div className="flex gap-2">
                                    <input className="w-1/2 p-2 border rounded" placeholder="Batch No" value={newBatch} onChange={e => setNewBatch(e.target.value)} />
                                    <input type="date" className="w-1/2 p-2 border rounded" value={newExpiry} onChange={e => setNewExpiry(e.target.value)} />
                                </div>
                                <div className="flex gap-2">
                                    <input type="number" className="w-1/2 p-2 border rounded" placeholder="Qty" value={newQty} onChange={e => setNewQty(e.target.value)} />
                                    <input type="number" className="w-1/2 p-2 border rounded" placeholder="MRP" value={newMrp} onChange={e => setNewMrp(e.target.value)} />
                                </div>
                                <button onClick={handleAddStock} disabled={loading} className="w-full bg-green-600 text-white font-bold py-2 rounded hover:bg-green-700">
                                    {loading ? 'Adding...' : '+ Add to Inventory'}
                                </button>
                            </div>
                        </div>

                        {/* Stock Table */}
                        <div className="w-2/3 bg-white p-6 rounded-lg shadow overflow-auto">
                            <h2 className="text-lg font-bold text-gray-700 mb-4">Current Stock</h2>
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3">Medicine</th>
                                        <th className="px-4 py-3">Batch</th>
                                        <th className="px-4 py-3">Expiry</th>
                                        <th className="px-4 py-3">Qty</th>
                                        <th className="px-4 py-3">MRP</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inventory.map(item => (
                                        <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900">{item.medicines?.name}</td>
                                            <td className="px-4 py-3">{item.batch_no}</td>
                                            <td className={`px-4 py-3 ${new Date(item.expiry) < new Date() ? 'text-red-600 font-bold' : ''}`}>{item.expiry}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-white text-xs ${item.quantity < 10 ? 'bg-red-500' : 'bg-green-500'}`}>
                                                    {item.quantity}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">₹{item.mrp}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- TAB 2: QUEUE (DISPENSE) --- */}
                {activeTab === 'queue' && (
                    <div className="flex gap-6 h-[calc(100vh-140px)]">
                        {/* List */}
                        <div className="w-1/3 bg-white border rounded shadow overflow-y-auto">
                            <div className="p-3 bg-gray-100 font-bold border-b">Prescriptions</div>
                            <ul>
                                {prescriptions.map(rx => (
                                    <li
                                        key={rx.id}
                                        onClick={() => setSelectedRx(rx)}
                                        className={`p-4 border-b cursor-pointer hover:bg-purple-50 ${selectedRx?.id === rx.id ? 'bg-purple-100 border-l-4 border-purple-600' : ''}`}
                                    >
                                        <div className="font-bold">{rx.patients?.name}</div>
                                        <div className="text-xs text-gray-500">Dr. {rx.doctor_id} • {new Date(rx.created_at).toLocaleTimeString()}</div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Detail */}
                        <div className="w-2/3 bg-white border rounded shadow p-6">
                            {selectedRx ? (
                                <>
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-800">Dispense Medicines</h2>
                                            <p className="text-gray-500">Patient: {selectedRx.patients?.name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold bg-yellow-100 text-yellow-800 px-2 py-1 rounded">PENDING</p>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <h3 className="font-bold mb-2">Prescribed Items:</h3>
                                        <div className="bg-gray-50 p-4 rounded border">
                                            {selectedRx.prescription_medicines?.map((med, i) => (
                                                <div key={i} className="flex justify-between border-b last:border-0 py-2">
                                                    <span className="font-medium">{med.medicine_name}</span>
                                                    <span className="text-gray-600">{med.dose} ({med.duration})</span>
                                                    {/* Future: Show Stock Status here */}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleDispense}
                                        disabled={loading}
                                        className="w-full py-3 bg-purple-600 text-white font-bold rounded hover:bg-purple-700 shadow-lg"
                                    >
                                        {loading ? 'Processing...' : 'CONFIRM DISPENSE (Auto-Deduct Stock)'}
                                    </button>
                                </>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400">Select a prescription</div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default PharmacyDashboard;
