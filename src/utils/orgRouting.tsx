import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * Hook to get current user's organization slug
 * Returns null if super_admin or no organization
 */
export function useOrgSlug() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return orgSlug || null;
}

/**
 * Auto-redirect component for non-super-admin users
 * Detects user's organization and redirects to /:orgSlug/path
 */
export function OrgRedirect({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { orgSlug } = useParams<{ orgSlug: string }>();

  useEffect(() => {
    const checkAndRedirect = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // Get user data
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();

        if (!userData) return;

        // Super admins don't need org slug
        if (userData.role === 'super_admin') {
          return;
        }

        // If user has organization but URL doesn't have slug, redirect
        if (userData.organizationId && !orgSlug) {
          // Get organization to find slug
          const orgDoc = await getDoc(doc(db, 'organizations', userData.organizationId));
          const orgData = orgDoc.data();

          if (orgData?.slug) {
            const currentPath = window.location.pathname;
            navigate(`/${orgData.slug}${currentPath}`, { replace: true });
          }
        }
      } catch (error) {
        console.error('Error checking organization:', error);
      }
    };

    // Check on auth state change
    const unsubscribe = onAuthStateChanged(auth, checkAndRedirect);
    return () => unsubscribe();
  }, [navigate, orgSlug]);

  return <>{children}</>;
}
