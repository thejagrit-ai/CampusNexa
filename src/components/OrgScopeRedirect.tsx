import { useEffect, useState } from 'react';
import { Navigate, useParams, useLocation } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';

/**
 * Wrapper that auto-redirects non-super-admin users to org-scoped URLs
 * Example: /dashboard → /pec/dashboard
 */
export function OrgScopeRedirect({ children }: { children: React.ReactNode }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const location = useLocation();
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOrgRedirect = async () => {
      const user = auth.currentUser;
      
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();

        if (!userData) {
          setLoading(false);
          return;
        }

        // Super admin doesn't need org slug
        if (userData.role === 'super_admin') {
          setLoading(false);
          return;
        }

        // If user has org but URL doesn't have slug, redirect
        if (userData.organizationId && !orgSlug) {
          const orgDoc = await getDoc(doc(db, 'organizations', userData.organizationId));
          const orgData = orgDoc.data();

          if (orgData?.slug) {
            // Redirect to org-scoped URL
            setRedirectTo(`/${orgData.slug}${location.pathname}`);
          }
        }
      } catch (error) {
        console.error('Error checking organization redirect:', error);
      } finally {
        setLoading(false);
      }
    };

    checkOrgRedirect();
  }, [orgSlug, location.pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
