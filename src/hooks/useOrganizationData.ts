import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, getDocs, query, where, DocumentData } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { getOrgIdFromSlug, isSuperAdmin } from '@/lib/orgHelpers';

/**
 * Hook to fetch data with automatic organization filtering
 * Automatically filters by organizationId from URL for non-super-admins
 */
export function useOrganizationData<T = DocumentData>(
  collectionName: string,
  userRole?: string,
  additionalFilters?: { field: string; operator: any; value: any }[]
) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchData();
  }, [collectionName, orgSlug, userRole]);

  const fetchData = async () => {
    try {
      setLoading(true);
      let queryRef;

      // Get organization ID
      const orgId = await getOrgIdFromSlug(orgSlug);

      // Super admin or no org: show all data
      if (!orgId || isSuperAdmin(userRole)) {
        queryRef = collection(db, collectionName);
        
        // Apply additional filters if provided
        if (additionalFilters && additionalFilters.length > 0) {
          const constraints = additionalFilters.map(f => where(f.field, f.operator, f.value));
          queryRef = query(queryRef, ...constraints);
        }
      } else {
        // Filter by organization
        const constraints = [where('organizationId', '==', orgId)];
        
        // Add additional filters
        if (additionalFilters) {
          constraints.push(...additionalFilters.map(f => where(f.field, f.operator, f.value)));
        }
        
        queryRef = query(collection(db, collectionName), ...constraints);
      }

      const snapshot = await getDocs(queryRef);
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];

      setData(results);
      setError(null);
    } catch (err) {
      console.error(`Error fetching ${collectionName}:`, err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch: fetchData };
}
