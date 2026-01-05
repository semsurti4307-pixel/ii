import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const checkUser = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (mounted) {
                    if (session?.user) {
                        setUser(session.user);
                        fetchRole(session.user.id); // Don't await strictly to show UI faster
                    }
                }
            } catch (err) {
                console.error("Auth Check Error:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        checkUser();

        const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;
            if (session?.user) {
                setUser(session.user);
                fetchRole(session.user.id);
            } else {
                setUser(null);
                setRole(null);
            }
            setLoading(false);
        });

        return () => {
            mounted = false;
            listener.subscription.unsubscribe();
        };
    }, []);

    const fetchRole = async (userId) => {
        // Using metadata from Auth first (fastest), then fallback to DB if needed
        // Since we saved role in metadata during signup, lets try that first
        // But for "Step 1" rigor, we should fetch from profiles table as requested

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single();

            if (data?.role) {
                setRole(data.role);
            } else {
                // Fallback if profile missing (shouldn't happen if Step 1 followed)
                console.warn("Profile/Role missing for user");
            }
        } catch (err) {
            console.error("Error fetching role:", err);
        }
    };

    return (
        <AuthContext.Provider value={{ user, role, loading }}>
            {!loading ? children : <div className="h-screen flex items-center justify-center">Loading Hospital ERP...</div>}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
