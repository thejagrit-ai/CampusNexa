import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import type { Organization } from '@/types';

interface OrganizationContextType {
  organization: Organization | null;
  isLoading: boolean;
  refreshOrganization: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrganization = async (orgId: string) => {
    try {
      const orgDoc = await getDoc(doc(db, 'organizations', orgId));
      if (orgDoc.exists()) {
        setOrganization({ id: orgDoc.id, ...orgDoc.data() } as Organization);
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
    }
  };

  const refreshOrganization = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      if (userData?.organizationId) {
        await fetchOrganization(userData.organizationId);
      }
    } catch (error) {
      console.error('Error refreshing organization:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true);
      
      if (!user) {
        setOrganization(null);
        setIsLoading(false);
        return;
      }

      try {
        // Get user document to find organizationId
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();

        if (userData?.organizationId) {
          await fetchOrganization(userData.organizationId);
        }
      } catch (error) {
        console.error('Error loading organization:', error);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <OrganizationContext.Provider value={{ organization, isLoading, refreshOrganization }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
}

// Helper hook to get current organization ID
export function useOrganizationId(): string | null {
  const { organization } = useOrganization();
  return organization?.id || null;
}
