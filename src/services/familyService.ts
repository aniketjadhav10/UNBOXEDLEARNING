import { supabase } from './supabase';

export interface Family {
  id: string;
  name: string;
  created_by: string;
}

export interface ProfileWithFamily {
  id: string;
  display_name: string | null;
  family_id: string | null;
  is_admin?: boolean;
  families?: Family | null;
}

export interface FamilyMember {
  member_id: string;
  member_family_id: string;
  member_user_id: string;
  member_role: 'owner' | 'parent';
  member_email: string;
}

export async function getMyProfile() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error('Please sign in to manage your family.');
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, family_id, is_admin, families(id, name, created_by)')
    .eq('id', userData.user.id)
    .single();

  if (error) throw error;
  return data as ProfileWithFamily;
}

export async function createFamily(name: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error('Please sign in with Google before creating a family workspace.');
  }

  const { data: family, error: familyError } = await supabase
    .rpc('create_family_workspace', { family_name: name })
    .single();

  if (familyError) throw familyError;

  return family as Family;
}

export async function listFamilyMembers() {
  const { data, error } = await supabase.rpc('list_my_family_members');
  if (error) throw error;
  return (data ?? []) as FamilyMember[];
}

export async function addParentToFamily(email: string) {
  const { data, error } = await supabase
    .rpc('add_parent_to_my_family', { parent_email: email })
    .single();

  if (error) throw error;
  return data as FamilyMember;
}
