import { getDocs, collection } from 'firebase/firestore';
import { db } from '@/config/firebase';

/**
 * Get organization ID from URL slug
 * @param orgSlug - Organization slug from URL params
 * @returns Organization ID or null if not found
 */
export async function getOrgIdFromSlug(orgSlug: string | undefined): Promise<string | null> {
  if (!orgSlug) return null;
  
  try {
    const orgsSnapshot = await getDocs(collection(db, 'organizations'));
    const org = orgsSnapshot.docs.find(doc => doc.data().slug === orgSlug);
    return org ? org.id : null;
  } catch (error) {
    console.error('Error fetching organization:', error);
    return null;
  }
}

/**
 * Check if user is super admin who can see all data
 */
export function isSuperAdmin(userRole: string | undefined): boolean {
  return userRole === 'super_admin';
}
