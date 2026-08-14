import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request, api } from './api';
import { supabase } from './supabase';

// Mock Supabase
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

// Mock global fetch
global.fetch = vi.fn();

describe('API Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('request()', () => {
    it('sends auth token if session exists', async () => {
      // Mock active session
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { access_token: 'fake-token' } },
      });
      // Mock successful fetch response
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const response = await request('/test-url', { method: 'GET' });

      expect(response).toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledWith(
        '/test-url',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer fake-token',
          }),
        })
      );
    });

    it('sends request without auth token if no session', async () => {
      // Mock empty session
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
      });
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });

      await request('/test-url', { method: 'GET' });

      const fetchArgs = (global.fetch as any).mock.calls[0][1];
      expect(fetchArgs.headers.Authorization).toBeUndefined();
    });

    it('throws error if response is not ok', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
      });
      (global.fetch as any).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Not Found' }),
      });

      await expect(request('/test-url', { method: 'GET' })).rejects.toThrow('Not Found');
    });

    it('throws default error if response is not ok and body has no error field', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
      });
      (global.fetch as any).mockResolvedValue({
        ok: false,
        json: async () => ({}),
      });

      await expect(request('/test-url', { method: 'GET' })).rejects.toThrow('Request failed');
    });
  });

  describe('api wrapper methods', () => {
    beforeEach(() => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
      });
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ id: '123' }),
      });
    });

    it('createTask uses POST and sends correct body', async () => {
      await api.createTask({ name: 'Task 1', description: 'Desc' } as any);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/tasks/create',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Task 1', description: 'Desc' }),
        })
      );
    });

    it('completeTask uses PATCH and sends correct body', async () => {
      await api.completeTask('task-123');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/tasks/complete',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ id: 'task-123' }),
        })
      );
    });
  });
});
