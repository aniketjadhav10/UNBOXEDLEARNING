import { supabase } from './supabase';

export interface UserMemory {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export const memoryService = {
  /** Fetch all memories for the current user */
  async getMemories(): Promise<UserMemory[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_memories')
      .select('id, user_id, content, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user memories:', error);
      throw error;
    }
    return data || [];
  },

  /** Delete a specific memory */
  async deleteMemory(memoryId: string): Promise<void> {
    const { error } = await supabase
      .from('user_memories')
      .delete()
      .eq('id', memoryId);
      
    if (error) {
      console.error('Error deleting user memory:', error);
      throw error;
    }
  }
};
