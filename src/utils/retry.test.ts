import { describe, it, expect, vi } from 'vitest';
import { withRetry } from './retry';

describe('Retry Utility', () => {
  it('resolves immediately if function succeeds', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn);
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and resolves if it eventually succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce('success');
      
    // using small delay for fast tests
    const result = await withRetry(fn, { attempts: 3, delayMs: 10 });
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws error if it fails on all attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('timeout'));
    
    await expect(withRetry(fn, { attempts: 3, delayMs: 10 })).rejects.toThrow('timeout');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('bails early and does not retry if error has a "code" property (Supabase API error)', async () => {
    const supabaseError = new Error('Database Error');
    (supabaseError as any).code = 'PGRST116'; // Example Supabase error code
    
    const fn = vi.fn().mockRejectedValue(supabaseError);
    
    await expect(withRetry(fn, { attempts: 3, delayMs: 10 })).rejects.toThrow('Database Error');
    // Should bail after first attempt
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
