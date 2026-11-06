import {afterEach,describe,it,expect,vi} from 'vitest';
import {cleanup,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {WorldVerification} from './WorldVerification';
import {api} from './api';
vi.mock('./api',()=>({api:vi.fn()}));
const widget=vi.hoisted(()=>({props:null as any}));
vi.mock('@worldcoin/idkit',()=>({proofOfHuman:()=>({type:'ProofOfHuman'}),orbLegacy:()=>({type:'OrbLegacy'}),IDKitRequestWidget:(p:any)=>{widget.props=p;return p.open?<div><button onClick={()=>p.onError('invalid_rp_signature')}>Simulate signature rejection</button><button onClick={async()=>{try{await p.handleVerify({});await p.onSuccess();}catch{p.onError('failed_by_host_app');}}}>Simulate returned proof</button><button onClick={()=>p.onOpenChange(false)}>Close verification</button></div>:null;}}));
afterEach(()=>{cleanup();vi.resetAllMocks();});
function mount(options:{switchAccount?:boolean;canVerify?:boolean;verified?:boolean;credentialMode?:'orb-legacy'|'proof-of-human'}={}){let id=0;vi.mocked(api).mockImplementation(async(path:string)=>{if(path==='/world-id/status')return {verified:options.verified||false,configured:true,canVerify:options.canVerify!==false,walletVerified:options.canVerify!==false,quizCompleted:true,environment:'production'};if(path==='/world-id/request')return {credentialMode:options.credentialMode||'proof-of-human',id:String(++id),rpContext:{rp_id:'rp_0000000000000001'},signal:'test',appId:'app_test',action:'test',environment:'production'};if(options.switchAccount)return {accountSwitched:true,redirectTo:'/dashboard',verified:true};throw new Error('This verification request expired.');});const client=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});client.setQueryData(['previous-account-private'],{secret:'old account cache'});render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/verify']}><Routes><Route path='/verify' element={<WorldVerification/>}/><Route path='/dashboard' element={<p>Original account dashboard</p>}/></Routes></MemoryRouter></QueryClientProvider>);return client;}
describe('World ID widget failure handling',()=>{
  it('uses the server-selected Orb compatibility mode for the widget',async()=>{
    mount({credentialMode:'orb-legacy'});const u=userEvent.setup();
    await waitFor(()=>expect(screen.getByText('Verify with World ID')).toBeEnabled());
    await u.click(screen.getByText('Verify with World ID'));await screen.findByText('Simulate returned proof');
    expect(widget.props.allow_legacy_proofs).toBe(true);
    expect(widget.props.preset).toEqual({type:'OrbLegacy'});
    expect(widget.props.action).toBe('test');expect(widget.props.environment).toBe('production');
  });
  it('refreshes stale blocked eligibility on mount even inside the app cache window',async()=>{
    vi.mocked(api).mockResolvedValue({verified:false,configured:true,canVerify:true,walletVerified:true,quizCompleted:true});
    const client=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:20000,refetchOnWindowFocus:false}}});
    client.setQueryData(['world'],{verified:false,configured:true,canVerify:false,walletVerified:false,quizCompleted:false});
    render(<QueryClientProvider client={client}><MemoryRouter><WorldVerification/></MemoryRouter></QueryClientProvider>);
    await waitFor(()=>expect(screen.getByText('Verify with World ID')).toBeEnabled());
    expect(api).toHaveBeenCalledWith('/world-id/status');
    expect(screen.getByLabelText('World ID requirements')).toHaveTextContent('Wallet ownership signed and reward wallet selected: Complete');
  });
  it('rechecks eligibility without reloading the page when saved prerequisites change',async()=>{
    mount({canVerify:false});const u=userEvent.setup();await screen.findByText(/Connect, verify, and select a wallet/);
    expect(screen.getByText('Verify with World ID')).toBeDisabled();
    vi.mocked(api).mockResolvedValue({verified:false,configured:true,canVerify:true,walletVerified:true,quizCompleted:true});
    await u.click(screen.getByText('Refresh eligibility'));
    await waitFor(()=>expect(screen.getByText('Verify with World ID')).toBeEnabled());
  });
  it('recovers from a failed status request without pretending prerequisites passed',async()=>{
    const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
    vi.mocked(api).mockRejectedValue(new Error('The server could not be reached.'));
    render(<QueryClientProvider client={client}><MemoryRouter><WorldVerification/></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByRole('alert')).toHaveTextContent('server could not be reached');
    expect(screen.getByText('Verify with World ID')).toBeDisabled();
    vi.mocked(api).mockResolvedValue({verified:false,configured:true,canVerify:true,walletVerified:true,quizCompleted:true});
    await userEvent.setup().click(screen.getByText('Refresh eligibility'));
    await waitFor(()=>expect(screen.getByText('Verify with World ID')).toBeEnabled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('redirects to the original dashboard only after verified account switching and clears cached private data',async()=>{const client=mount({switchAccount:true});const u=userEvent.setup();await waitFor(()=>expect(screen.getByText('Verify with World ID')).toBeEnabled());await u.click(screen.getByText('Verify with World ID'));await u.click(await screen.findByText('Simulate returned proof'));expect(await screen.findByText('Original account dashboard')).toBeInTheDocument();expect(client.getQueryData(['previous-account-private'])).toBeUndefined();});
  it('requires wallet prerequisites before opening IDKit',async()=>{mount({canVerify:false});await screen.findByText(/Connect, verify, and select a wallet/);expect(screen.getByText('Verify with World ID')).toBeDisabled();expect(vi.mocked(api).mock.calls.some(c=>c[0]==='/world-id/request')).toBe(false);});
  it('does not request another QR code for a returning verified student',async()=>{mount({verified:true});expect(await screen.findByRole('status')).toHaveTextContent('Verified');expect(screen.queryByText('Verify with World ID')).not.toBeInTheDocument();expect(vi.mocked(api).mock.calls.some(c=>c[0]==='/world-id/request')).toBe(false);});
  it('shows the actual SDK failure code after approval',async()=>{mount();const u=userEvent.setup();await waitFor(()=>expect(screen.getByText('Verify with World ID')).toBeEnabled());await u.click(screen.getByText('Verify with World ID'));await u.click(await screen.findByText('Simulate signature rejection'));expect(screen.getByRole('alert')).toHaveTextContent('[invalid_rp_signature]');expect(widget.props.action).toBe('test');expect(widget.props.app_id).toBe('app_test');expect(widget.props.rp_context.rp_id).toBe('rp_0000000000000001');expect(widget.props.environment).toBe('production');expect(widget.props.allow_legacy_proofs).toBe(false);});
  it('preserves the backend rejection and obtains a fresh request on retry',async()=>{mount();const u=userEvent.setup();await waitFor(()=>expect(screen.getByText('Verify with World ID')).toBeEnabled());await u.click(screen.getByText('Verify with World ID'));await u.click(await screen.findByText('Simulate returned proof'));expect(await screen.findByRole('alert')).toHaveTextContent('This verification request expired.');await u.click(screen.getByText('Close verification'));await u.click(screen.getByText('Verify with World ID'));await screen.findByText('Simulate returned proof');expect(vi.mocked(api).mock.calls.filter(c=>c[0]==='/world-id/request')).toHaveLength(2);expect(screen.queryByRole('alert')).not.toBeInTheDocument();});
});
