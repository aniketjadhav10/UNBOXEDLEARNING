import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chatService } from './chatService';
import { supabase } from './supabase';
import { request } from './api';

// Mock Supabase
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

// Mock api request
vi.mock('./api', () => ({
  request: vi.fn(),
}));

describe('Chat Service', () => {
  let mockSelect: any;
  let mockOrder: any;
  let mockInsert: any;
  let mockUpdate: any;
  let mockDelete: any;
  let mockEq: any;
  let mockSingle: any;

  beforeEach(() => {
    vi.resetAllMocks();

    mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    mockSingle = vi.fn().mockResolvedValue({ data: { id: 'session-123' }, error: null });
    
    mockSelect = vi.fn().mockReturnValue({
      order: mockOrder,
      eq: mockEq,
      single: mockSingle,
    });

    mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    mockDelete = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    });

    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-1' } },
    });
  });

  describe('getSessions()', () => {
    it('returns sessions on success', async () => {
      mockOrder.mockResolvedValueOnce({ data: [{ id: '1', title: 'Chat 1' }], error: null });

      const sessions = await chatService.getSessions();
      expect(sessions).toEqual([{ id: '1', title: 'Chat 1' }]);
      expect(supabase.from).toHaveBeenCalledWith('chat_sessions');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockOrder).toHaveBeenCalledWith('updated_at', { ascending: false });
    });

    it('throws on error', async () => {
      mockOrder.mockResolvedValueOnce({ data: null, error: new Error('DB Error') });

      await expect(chatService.getSessions()).rejects.toThrow('DB Error');
    });
  });

  describe('createSession()', () => {
    it('inserts a new session and returns it', async () => {
      const session = await chatService.createSession('My Chat');

      expect(supabase.auth.getUser).toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledWith('chat_sessions');
      expect(mockInsert).toHaveBeenCalledWith({ user_id: 'user-1', title: 'My Chat' });
      expect(session).toEqual({ id: 'session-123' });
    });

    it('throws if not authenticated', async () => {
      (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: null } });

      await expect(chatService.createSession()).rejects.toThrow('Not authenticated');
    });
  });

  describe('updateSessionTitle()', () => {
    it('updates title for a session', async () => {
      const mockEqFinal = vi.fn().mockResolvedValue({ error: null });
      mockUpdate.mockReturnValueOnce({ eq: mockEqFinal });

      await chatService.updateSessionTitle('session-1', 'New Title');

      expect(supabase.from).toHaveBeenCalledWith('chat_sessions');
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Title' }));
      expect(mockEqFinal).toHaveBeenCalledWith('id', 'session-1');
    });
  });

  describe('deleteSession()', () => {
    it('deletes a specific session', async () => {
      const mockEqFinal = vi.fn().mockResolvedValue({ error: null });
      mockDelete.mockReturnValueOnce({ eq: mockEqFinal });

      await chatService.deleteSession('session-1');

      expect(supabase.from).toHaveBeenCalledWith('chat_sessions');
      expect(mockEqFinal).toHaveBeenCalledWith('id', 'session-1');
    });
  });

  describe('sendMessage()', () => {
    it('sends message via API request and updates session', async () => {
      (request as any).mockResolvedValueOnce({ success: true, text: 'Hello from AI' });
      const mockEqFinal = vi.fn().mockResolvedValue({ error: null });
      mockUpdate.mockReturnValueOnce({ eq: mockEqFinal });

      const response = await chatService.sendMessage(
        'session-1', 
        [{ role: 'user', content: 'Hi' }], 
        true
      );

      expect(response).toBe('Hello from AI');
      expect(request).toHaveBeenCalledWith(
        '/api/ai/chat',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            sessionId: 'session-1',
            messages: [{ role: 'user', content: 'Hi' }],
            curriculumContext: true
          }),
        })
      );
      
      // Should touch session
      expect(supabase.from).toHaveBeenCalledWith('chat_sessions');
    });

    it('throws if API request fails', async () => {
      (request as any).mockResolvedValueOnce({ success: false, text: '' });

      await expect(chatService.sendMessage('session-1', [], false))
        .rejects.toThrow('Failed to get AI response');
    });
  });
});
