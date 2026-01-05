const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes (Simple placeholder as Supabase handles most logic directly from frontend usually, 
// but we might keep backend for admin tasks later)
app.get('/', (req, res) => {
    res.send('Hospital ERP Backend (Managed by Supabase)');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
