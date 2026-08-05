import { supabase } from './supabase';
import { request } from './api';

export interface ChatSession {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'model';
  content: string;
  created_at: string;
}

export const chatService = {
  /** Fetch all chat sessions for the current user */
  async getSessions(): Promise<ChatSession[]> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching chat sessions:', error);
      throw error;
    }
    return data || [];
  },

  /** Create a new chat session */
  async createSession(title: string = 'New Chat'): Promise<ChatSession> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({ user_id: user.id, title })
      .select()
      .single();

    if (error) {
      console.error('Error creating chat session:', error);
      throw error;
    }
    return data;
  },

  /** Update session title */
  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    const { error } = await supabase
      .from('chat_sessions')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', sessionId);
    if (error) throw error;
  },

  /** Delete a session */
  async deleteSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId);
    if (error) throw error;
  },

  /** Delete all sessions for current user */
  async deleteAllSessions(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('user_id', user.id);
    if (error) throw error;
  },

  /** Fetch messages for a specific session */
  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
    return data || [];
  },

  /** Send a message to the AI and save it */
  async sendMessage(sessionId: string, messages: { role: string; content: string }[], curriculumContext: boolean = false): Promise<string> {
    // Send to our /api/ai/chat endpoint
    // The endpoint will handle saving messages to the DB and responding
    const response = await request<{ success: boolean; text: string }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        messages,
        curriculumContext
      })
    });

    if (!response.success) {
       throw new Error('Failed to get AI response');
    }

    // Touch the session to update its updated_at timestamp
    supabase.from('chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId);

    return response.text;
  }
};
