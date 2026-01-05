import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const BillingDashboard = () => {
    // State
    const [pendingDispense, setPendingDispense] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null); // This acts as 'Draft Bill' context
    const [extraItems, setExtraItems] = useState([]); // Consultation, procedures

    const [newItemName, setNewItemName] = useState('Consultation Fee');
    const [newItemPrice, setNewItemPrice] = useState('500');

    const [loading, setLoading] = useState(false);
    const [paymentMode, setPaymentMode] = useState('cash');

    useEffect(() => {
        fetchReadyForBilling();
    }, []);

    // 1. FETCH Dispensed Items not yet billed
    const fetchReadyForBilling = async () => {
        // Logic: Get dispensed items where prescriptions are NOT linked to a bill yet?
        // Simplifying for MVP: Show all dispensing logs. 
        // In Prod: Need a flag in dispense table `is_billed`.

        const { data, error } = await supabase
            .from('pharmacy_dispense')
            .select(`
                *,
                prescriptions!inner(id, patient_id),
                patients:prescriptions(patients(id, name, age, gender)),
                medicines(name),
                inventory(mrp)
            `)
            .eq('status', 'dispensed');

        if (error) {
            console.error(error);
            return;
        }

        // Group by Patient ID
        const grouped = {};
        data.forEach(item => {
            const uid = item.prescriptions?.patient_id;
            if (!grouped[uid]) {
                grouped[uid] = {
                    patient_id: uid,
                    patient_name: item.patients?.patients?.name,
                    mobile: item.patients?.patients?.mobile,
                    items: []
                };
            }

            // Add Medicine Items
            grouped[uid].items.push({
                type: 'medicine',
                name: item.medicines?.name,
                qty: item.quantity,
                price: item.inventory?.mrp || 0,
                total: (item.quantity) * (item.inventory?.mrp || 0)
            });
        });

        setPendingDispense(Object.values(grouped));
    };

    // 2. ADD EXTRA CHARGES (Consultation)
    const addCharge = () => {
        if (!newItemName || !newItemPrice) return;
        setExtraItems([...extraItems, {
            type: 'consultation',
            name: newItemName,
            qty: 1,
            price: parseFloat(newItemPrice),
            total: parseFloat(newItemPrice)
        }]);
        setNewItemName('Consultation Fee'); // Reset to default
    };

    // 3. FINAL CALCULATION
    const calculateTotal = () => {
        if (!selectedPatient) return 0;
        const medTotal = selectedPatient.items.reduce((sum, item) => sum + item.total, 0);
        const extraTotal = extraItems.reduce((sum, item) => sum + item.total, 0);
        return medTotal + extraTotal;
    };

    // 4. GENERATE BILL & PAYMENT
    const handleGenerateBill = async () => {
        if (!selectedPatient) return;
        setLoading(true);

        const totalAmt = calculateTotal();

        try {
            // A. Create Bill Header
            const { data: bill, error: billError } = await supabase
                .from('bills')
                .insert([{
                    patient_id: selectedPatient.patient_id,
                    total_amount: totalAmt,
                    status: 'paid' // Assuming full payment
                }])
                .select()
                .single();

            if (billError) throw billError;

            // B. Add Bill Items (Medicines + Extra)
            const allItems = [
                ...selectedPatient.items.map(i => ({ ...i, item_type: 'medicine' })),
                ...extraItems.map(i => ({ ...i, item_type: 'consultation' }))
            ];

            const dbItems = allItems.map(item => ({
                bill_id: bill.id,
                item_name: item.name,
                item_type: item.item_type, // 'medicine' or 'consultation'
                quantity: item.qty,
                unit_price: item.price
            }));

            const { error: itemsError } = await supabase
                .from('bill_items')
                .insert(dbItems);

            if (itemsError) throw itemsError;

            // C. Add Payment Record
            const { error: payError } = await supabase
                .from('payments')
                .insert([{
                    bill_id: bill.id,
                    amount: totalAmt,
                    payment_mode: paymentMode
                }]);

            if (payError) throw payError;

            // D. Print
            printInvoice(bill.invoice_no, selectedPatient.patient_name, allItems, totalAmt);

            alert("Payment Successful! Invoice Generated.");

            // Cleanup
            setSelectedPatient(null);
            setExtraItems([]);
            fetchReadyForBilling(); // Refresh list

        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const printInvoice = (invId, name, items, total) => {
        const printWindow = window.open('', '', 'width=800,height=600');
        printWindow.document.write(`
            <html>
                <body style="font-family: monospace; padding: 20px;">
                    <h2 style="text-align:center;">HOSPITAL RECEIPT</h2>
                    <p>Bill No: #${invId}</p>
                    <p>Patient: ${name}</p>
                    <p>Date: ${new Date().toLocaleString()}</p>
                    <hr/>
                    <table style="width:100%">
                        ${items.map(i => `
                            <tr>
                                <td>${i.name}</td>
                                <td align="right">x${i.qty}</td>
                                <td align="right">${i.price}</td>
                                <td align="right"><b>${i.total}</b></td>
                            </tr>
                        `).join('')}
                    </table>
                    <hr/>
                    <h3 style="text-align:right;">TOTAL: Rs ${total}</h3>
                    <p style="text-align:center;">PAID VIA ${paymentMode.toUpperCase()}</p>
                </body>
            </html>
        `);
    };

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* LEFT: Pending Queue */}
            <div className="w-1/3 bg-white border-r h-screen overflow-y-auto">
                <div className="p-4 bg-yellow-600 text-white font-bold">Ready for Billing</div>
                {pendingDispense.map((group, idx) => (
                    <div
                        key={idx}
                        onClick={() => { setSelectedPatient(group); setExtraItems([]); }}
                        className={`p-4 border-b cursor-pointer hover:bg-yellow-50 ${selectedPatient?.patient_id === group.patient_id ? 'bg-yellow-100 border-l-4 border-yellow-600' : ''}`}
                    >
                        <h3 className="font-bold">{group.patient_name}</h3>
                        <p className="text-xs text-gray-500">{group.items.length} Medicines Pending</p>
                    </div>
                ))}
                {pendingDispense.length === 0 && <p className="p-4 text-gray-400">No pending items.</p>}
            </div>

            {/* RIGHT: Billing Screen */}
            <div className="w-2/3 p-8">
                {selectedPatient ? (
                    <div className="bg-white shadow rounded-lg p-6 max-w-2xl mx-auto">
                        <h2 className="text-xl font-bold border-b pb-2 mb-4">Generate Bill: {selectedPatient.patient_name}</h2>

                        {/* 1. Medicines List (Auto) */}
                        <div className="mb-6">
                            <h3 className="text-sm font-bold text-gray-500 mb-2">PHARMACY ITEMS</h3>
                            <table className="w-full text-sm">
                                <tbody>
                                    {selectedPatient.items.map((item, i) => (
                                        <tr key={i} className="border-b">
                                            <td className="py-2">{item.name}</td>
                                            <td className="py-2 text-right">x{item.qty}</td>
                                            <td className="py-2 text-right">₹{item.price}</td>
                                            <td className="py-2 text-right font-medium">₹{item.total}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* 2. Add Extra Charges */}
                        <div className="mb-6 bg-gray-50 p-4 rounded text-sm">
                            <h3 className="font-bold text-gray-500 mb-2">ADD CHARGES</h3>
                            <div className="flex gap-2">
                                <input className="border p-1 w-full" value={newItemName} onChange={e => setNewItemName(e.target.value)} />
                                <input className="border p-1 w-24" type="number" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} />
                                <button onClick={addCharge} className="bg-blue-600 text-white px-3 rounded font-bold">+</button>
                            </div>
                            <div className="mt-2">
                                {extraItems.map((item, i) => (
                                    <div key={i} className="flex justify-between text-blue-800 border-b border-gray-200 py-1">
                                        <span>{item.name}</span>
                                        <span>₹{item.total}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 3. Total & Pay */}
                        <div className="flex justify-between items-center text-2xl font-bold border-t pt-4 mb-6">
                            <span>TOTAL PAYABLE</span>
                            <span>₹{calculateTotal()}</span>
                        </div>

                        <div className="flex justify-end gap-2">
                            <select className="border p-2 rounded" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                                <option value="cash">Cash</option>
                                <option value="upi">UPI</option>
                                <option value="card">Card</option>
                            </select>
                            <button
                                onClick={handleGenerateBill}
                                disabled={loading}
                                className="bg-green-600 text-white font-bold py-2 px-8 rounded shadow hover:bg-green-700"
                            >
                                {loading ? 'Processing...' : 'ACCEPT PAYMENT'}
                            </button>
                        </div>

                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">Select Patient to Bill</div>
                )}
            </div>
        </div>
    );
};

export default BillingDashboard;
