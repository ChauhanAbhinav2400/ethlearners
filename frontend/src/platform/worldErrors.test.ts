import {describe,it,expect} from 'vitest';
import {worldErrorMessage} from './worldErrors';
describe('World ID failure messages',()=>{
  it('explains a mismatched RP signature without hiding the SDK code',()=>{expect(worldErrorMessage('invalid_rp_signature')).toContain('same active registration');expect(worldErrorMessage('invalid_rp_signature')).toContain('[invalid_rp_signature]');});
  it('preserves backend rejection instead of replacing it with failed_by_host_app',()=>{expect(worldErrorMessage('failed_by_host_app','Verification request expired.')).toBe('Verification request expired.');});
  it('explains unavailable v4 credentials without promising a reward attempt',()=>{expect(worldErrorMessage('world_id_4_not_available')).toContain('World ID 4');expect(worldErrorMessage('credential_unavailable')).toContain('not been consumed');});
  it('does not echo arbitrary diagnostic payloads as an error code',()=>{expect(worldErrorMessage('secret payload <proof>')).not.toContain('secret payload');});
});
