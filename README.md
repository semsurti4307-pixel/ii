 CLINOVA 

---

## 🛠️ Tech Stack (The Modern Suite)
-   **Frontend:** React (Vite) + Tailwind CSS (Custom Design System).
-   **Backend:** Supabase (PostgreSQL + Auth + Edge Network).
-   **State Management:** Context API + Real-time Subscriptions.
-   **Security:** Row Level Security (RLS) Policies on Postgres.
-   **Icons:** Lucide React (Professional Iconography).

---

## 🔥 Key Modules & Features

### 1. 🖥️ Command Center (Dashboard)
-   **Real-time Cockpit:** Live counters for Patients, Queue, and Bed Occpancy.
-   **Actionable Insights:** Low stock alerts and direct "Manage" actions.
-   **System Health:** Live DB connection and Sync status indicators.

### 2. 🩺 Doctor Console (OPD)
-   **Live Queue:** Auto-updated patient list.
-   **Digital Rx:** Prescribe medicines with strength, dosage, and duration.
-   **Security:** Doctors can *only* edit their own prescriptions.

### 3. 💊 Smart Pharmacy
-   **Inventory Intelligence:** Automated stock deduction (FIFO Batch Logic).
-   **Expiry Alerts:** Visual cues for expiring medicines.
-   **Dispense Queue:** Connected directly to Doctor's prescriptions.

### 4. 🛏️ IPD & Bed Management
-   **Visual Map:** Color-coded bed status (🟢 Available, 🔴 Occupied).
-   **Cycle:** Admission → Occupancy → Discharge → Cleaning.

### 5. 🔐 Enterprise Security
-   **Role-Based Access Control (RBAC):**
    -   `Reception`: Read-Only Medical Data, Write-Only Registration.
    -   `Doctor`: Full Patient Write Access.
    -   `Admin`: Full Analytics Access.
-   **Data Isolation:** Implemented via Postgres Policies, not just UI hiding.

---

## ⚙️ Installation & Setup

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/your-username/clinova-erp.git
    cd clinova-erp
    ```

2.  **Install Dependencies**
    ```bash
    cd frontend
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in `/frontend`:
    ```env
    VITE_SUPABASE_URL=your_project_url
    VITE_SUPABASE_ANON_KEY=your_anon_key
    ```

4.  **Run Locally**
    ```bash
    npm run dev
    ```

---

## 🛡️ Database Schema (Simplified)
-   `profiles`: Users & Roles.
-   `patients`: Core medical records.
-   `appointments`: Token system & Status.
-   `prescriptions` & `prescription_medicines`: Normalized Rx data.
-   `inventory` & `pharmacy_dispense`: Batch-wise stock tracking.
-   `beds` & `admissions`: IPD lifecycle.

---

## 👨‍💻 Developer Notes
This project demonstrates:
1.  **Architecture**: Clean separation of concerns (Logic vs UI).
2.  **Performance**: optimistic UI updates and indexed queries.
3.  **Product Thinking**: Dashboard designed for decision making, not just viewing.

---

*© 2024 Clinova Systems. Built for High-Performance Healthcare.*
