# 🏥 CLINOVA - System Workflow Guide (End-to-End)

This guide explains the complete lifecycle of a patient in the Clinova ERP system. Use this sequence for demos and testing.

---

## 🔄 The "Patient Journey" (High Level)
1.  **Reception:** Patient Entry & Token Generation.
2.  **Doctor:** Consultation & Prescription (Rx).
3.  **Pharmacy:** Medicine Dispensing (Inventory Check).
4.  **Billing:** Invoice Generation & Payment.
5.  **IPD (Optional):** Admission & Bed Allocation.
6.  **Admin:** Monitoring & Reports.

---

## 👤 Step 1: RECEPTION (The Entry Point)
*Role: Receptionist*

1.  **Login:** Use Receptionist credentials.
2.  **Search/Register:**
    *   Enter Mobile Number.
    *   If New: Fill Name, Age, Gender, Symptoms.
    *   If Old: Data auto-fills.
3.  **Generate Token:**
    *   Select Doctor from dropdown.
    *   Click **"Generate Token"**.
    *   *Result:* Token #1 is created and sent to the Doctor's Queue.

---

## 🩺 Step 2: DOCTOR (Diagnosis)
*Role: Doctor*

1.  **Dashboard:** Doctor sees "Waiting Queue".
2.  **Select Patient:** Click on the patient with `Status: Waiting`.
3.  **Consultation:**
    *   View Patient Details & Symptoms.
    *   **Prescribe Medicine:** Select Medicine Name, Dosage (e.g., 1-0-1), Duration.
    *   **Diagnosis Note:** Type "Viral Fever" etc.
4.  **Finish:** Click **"Save Prescription & Finish"**.
    *   *Result:* Patient moves to Pharmacy Queue.

---

## 💊 Step 3: PHARMACY (Dispensing)
*Role: Pharmacist*

1.  **Queue View:** Pharmacist sees "Pending Prescriptions" list.
2.  **Action:** Click on the Patient Name.
3.  **Check Stock:** System shows requested meds vs Available Batch Stock.
4.  **Dispense:** Click **"Dispense Medicines"**.
    *   *System Logic:* Stock is deducted from Inventory (FIFO).
    *   *Result:* Patient moves to Billing Queue.

---

## 💰 Step 4: BILLING (Payment)
*Role: Pharmacist / Admin*

1.  **Billing Dashboard:** See "Ready for Billing" list.
2.  **Create Invoice:**
    *   Medicines are auto-added from Pharmacy.
    *   Add **Consultation Fee** (e.g., ₹500).
    *   Add **Room Charges** (if IPD).
3.  **Payment:**
    *   See Total Amount.
    *   Select Mode (Cash/UPI).
    *   Click **"Mark Paid & Print"**.

---

## 🛏️ Step 5: IPD / BED MANAGEMENT (Optional)
*Role: Receptionist / Admin*

1.  **Admission:**
    *   Go to **"Beds"** tab.
    *   Click on a **Green (Available)** Bed.
    *   Select Patient -> Click "Admit".
    *   *Result:* Bed turns **Red (Occupied)** in real-time.
2.  **Discharge:**
    *   Click on **Red (Occupied)** Bed.
    *   Click "Discharge Patient".
    *   *Result:* Bed turns **Yellow (Cleaning)** or **Green**.

---

## 📊 Step 6: ADMIN COMMAND CENTER
*Role: Admin*

1.  **Dashboard:** View Live Stats (Revenue, Today's Count).
2.  **Inventory Alerts:** Check "Low Stock" warnings.
3.  **Reports:** Filter data by Date (Today/Week) to analyze hospital performance.

---

*Use this flow to demonstrate the full power of CLINOVA.*
