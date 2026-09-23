import { supabase } from '@/config/supabase';
import type { UserRole } from '@/types';

export interface IdentityProfile {
  id: string;
  organization_id: string | null;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  status: 'active' | 'suspended';
  profile_complete: boolean;
  created_at: string;
  updated_at: string;
}

/** Native Supabase identity API, used during the staged authentication cutover. */
export async function loadIdentityProfile(): Promise<IdentityProfile | null> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) return null;
  const { data, error } = await supabase.from('profiles').select('*')
    .eq('id', sessionData.session.user.id).single();
  if (error) throw error;
  if (data.status !== 'active') throw new Error('Your account is suspended. Contact your college administrator.');
  return data as IdentityProfile;
}

export async function signUpIdentity(email: string, password: string, fullName: string) {
  if (!fullName.trim()) throw new Error('Full name is required.');
  if (fullName.trim().length > 200) throw new Error('Full name must be 200 characters or fewer.');
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(), password,
    // Role and organization are assigned by trusted administration, never by signup input.
    options: { data: { full_name: fullName.trim() } },
  });
  if (error) throw error;
  return { user: data.user, requiresEmailConfirmation: !data.session };
}

export async function signInIdentity(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  try {
    const profile = await loadIdentityProfile();
    if (!profile) throw new Error('Your account profile could not be loaded.');
    return profile;
  } catch (error) {
    await supabase.auth.signOut({ scope: 'local' });
    throw error;
  }
}

export async function signOutIdentity() {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
}

export async function updateOwnIdentityProfile(fullName: string, avatarUrl: string | null) {
  const profile = await loadIdentityProfile();
  if (!profile) throw new Error('Sign in to edit your profile.');
  if (!fullName.trim() || fullName.trim().length > 200) throw new Error('Enter a name between 1 and 200 characters.');
  if (avatarUrl && new URL(avatarUrl).protocol !== 'https:') throw new Error('Photograph URL must use HTTPS.');
  const { data, error } = await supabase.from('profiles')
    .update({ full_name: fullName.trim(), avatar_url: avatarUrl })
    .eq('id', profile.id).select('*').single();
  if (error) throw error;
  return data as IdentityProfile;
}
