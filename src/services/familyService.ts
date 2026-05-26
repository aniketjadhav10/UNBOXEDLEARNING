import { api } from './api';
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
  display_name?: string;
  is_active?: boolean;
}

export interface FamilyInvitation {
  id: string;
  family_id: string;
  email: string;
  code: string;
  role: 'parent';
  is_used: boolean;
  created_at: string;
  expires_at: string;
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
  return data as unknown as ProfileWithFamily;
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
  
  return (data ?? []).map((row: any) => ({
    member_id: row.id ?? row.member_id,
    member_family_id: row.family_id ?? row.member_family_id ?? '',
    member_user_id: row.user_id ?? row.member_user_id,
    member_role: row.role ?? row.member_role,
    member_email: row.email ?? row.member_email,
    display_name: row.display_name,
    is_active: row.is_active,
  })) as FamilyMember[];
}

export async function addParentToFamily(email: string) {
  const { data, error } = await supabase
    .rpc('add_parent_to_my_family', { parent_email: email })
    .single();

  if (error) throw error;
  return data as FamilyMember;
}

export async function listFamilyInvitations() {
  const { data, error } = await supabase.rpc('list_my_family_invitations');
  if (error) throw error;
  return (data ?? []) as FamilyInvitation[];
}

export async function sendFamilyInvite(email: string) {
  try {
    return await api.sendFamilyInvite(email);
  } catch (err: any) {
    // If the serverless endpoint is 404 (Vite-only dev server running without Vercel CLI),
    // fallback to executing the Supabase RPC directly from the browser!
    const isNetworkOr404 = 
      err.message.includes('404') || 
      err.message.includes('Not Found') || 
      err.message.includes('failed') || 
      err.message.includes('Failed to fetch');

    if (isNetworkOr404) {
      console.warn('Vercel serverless API not found (running Vite only). Falling back to direct Supabase RPC.');
      
      // Generate code locally in browser
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let localCode = 'UL-';
      for (let i = 0; i < 6; i++) {
        localCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      const { data, error } = await supabase
        .rpc('create_family_invitation', {
          invite_email: email,
          invite_code: localCode
        });
        
      if (error) throw error;
      
      return {
        success: true,
        code: localCode,
        email,
        emailSent: false,
        smtpError: 'SMTP bypassed (direct Supabase browser fallback)',
        invitation: data
      };
    }
    throw err;
  }
}

export async function joinFamilyWithCode(code: string) {
  const { data, error } = await supabase
    .rpc('join_family_with_code', { joining_code: code })
    .single();

  if (error) throw error;
  return data as { family_id: string; family_name: string; role: string };
}
