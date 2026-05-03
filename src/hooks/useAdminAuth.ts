import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const skipAdminAuth = import.meta.env.VITE_SKIP_ADMIN_AUTH === 'true';

export function useAdminAuth() {
  const [loading, setLoading] = useState(!skipAdminAuth);
  const [isAdmin, setIsAdmin] = useState(skipAdminAuth);

  useEffect(() => {
    if (skipAdminAuth) return;

    let mounted = true;

    async function checkAdmin() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        if (mounted) {
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (mounted) {
        setIsAdmin(Boolean(data?.is_admin) && !error);
        setLoading(false);
      }
    }

    checkAdmin();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      setLoading(true);
      checkAdmin();
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { loading, isAdmin };
}
