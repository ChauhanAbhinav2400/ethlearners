import {afterEach,describe,expect,it,vi} from 'vitest';
import {api} from './api';
afterEach(()=>vi.unstubAllGlobals());
describe('platform API boundaries',()=>{
  it('includes credentials and uses the server-issued CSRF token on mutations',async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({csrf:'server-token'}))).mockResolvedValueOnce(new Response('{"ok":true}'));
    vi.stubGlobal('fetch',fetcher);await api('/auth/me');await api('/progress',{lessonId:'gas',stage:1,completed:false});
    expect(fetcher.mock.calls[1][1]).toMatchObject({method:'POST',credentials:'include',headers:{'X-CSRF-Token':'server-token','X-Explorer-Client':'web'}});
  });
  it('explains network failures without losing access to local learning',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(api('/dashboard')).rejects.toThrow('Your local lessons still work');
  });
  it('preserves actionable backend errors',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{"error":"Complete all five chapter questions first."}',{status:403})));
    await expect(api('/chapters/dev-00/master-challenge/submit',{selected:1,confirmed:true})).rejects.toThrow('Complete all five');
  });
  it('handles unreadable error responses',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('<html>Unavailable</html>',{status:503})));
    await expect(api('/auth/me')).rejects.toThrow('unreadable response');
  });
});
