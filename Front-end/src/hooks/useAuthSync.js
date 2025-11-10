import { useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import useUserStore from '../store/userStore';
import { getUserData } from '../API/API';

export function useAuthSync() {
  const { setUser, clearUser, setLoading } = useUserStore();
  const auth = getAuth();

  useEffect(() => {
    setLoading(true);
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // get user data from backend
          const response = await getUserData(firebaseUser.uid);
          
          // Backend returns nested { user: {...} } structure
          const userData = response.user || response;
          
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            ...userData, // username, role_id, first_name, last_name vs.
          });
        } catch (error) {
          console.error('Failed to fetch user data:', error);
          // if token is expired or invalid, no access to user data, clear user state
          clearUser();
        }
      } else {
        // Logout or session expired
        clearUser();
      }
    });

    return () => unsubscribe();
  }, [auth, setUser, clearUser, setLoading]);
}

