import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EverydayDemonstration } from './EverydayDemonstration';
import { ChallengeBoard } from './ChallengeBoard';
beforeEach(()=>{Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(){this.setAttribute('open','');}});Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(){this.removeAttribute('open');}});});
afterEach(cleanup);
describe('Everyday interactive lessons',()=>{
  it('keeps a request pending across closing the website and processes shared state',async()=>{const u=userEvent.setup();render(<EverydayDemonstration index={2}/>);await u.click(screen.getByText('Submit transfer through A'));await u.click(screen.getByText('Close website A'));expect(screen.getByText('Interface offline')).toBeInTheDocument();await u.click(screen.getByText('Process demo request'));expect(screen.getByText('18 demo units')).toBeInTheDocument();await u.click(screen.getByText('Reset demonstration'));expect(screen.getAllByText('20 demo units')).toHaveLength(2);});
  it('does not confuse connection state and spending allowance',async()=>{const u=userEvent.setup();render(<EverydayDemonstration index={10}/>);await u.click(screen.getByText('Connect demo site'));await u.click(screen.getByText('Review and approve 5 units'));await u.click(screen.getByText('Disconnect demo site'));expect(screen.getByText('Shop may spend 5 demo units')).toBeInTheDocument();expect(screen.getByRole('status')).toHaveTextContent('did not erase');});
  it('rolls back a failed journey while reaching finality of the failed receipt',async()=>{const u=userEvent.setup();render(<EverydayDemonstration index={5}/>);await u.click(screen.getByLabelText('Make the contract call fail'));await u.click(screen.getByText('Submit request'));await u.click(screen.getByText('Include and execute'));expect(screen.getByText('Reverted; no tokens moved')).toBeInTheDocument();await u.click(screen.getByText('Advance to finality'));expect(screen.getByRole('status')).toHaveTextContent('does not turn execution into success');});
  it('checks actual token balance and allowance before spending',async()=>{const u=userEvent.setup();render(<EverydayDemonstration index={8}/>);await u.click(screen.getByText('Shop spends amount'));expect(screen.getByRole('status')).toHaveTextContent('rejected');await u.click(screen.getByText('Approve this allowance'));await u.click(screen.getByText('Shop spends amount'));expect(screen.getByText('25')).toBeInTheDocument();await u.click(screen.getByText('Shop spends amount'));expect(screen.getByRole('status')).toHaveTextContent('rejected');});
  it.each(Array.from({length:15},(_,i)=>i))('renders and resets everyday demonstration %s',async index=>{const u=userEvent.setup();render(<EverydayDemonstration index={index}/>);expect(screen.getByRole('heading',{level:3})).toBeInTheDocument();await u.click(screen.getByText('Reset demonstration'));expect(screen.getByText(/Local teaching data only/)).toBeInTheDocument();});
});
describe('Master Challenge accessibility and confirmation',()=>{
  const question={prompt:'Which prevents replay?',options:['Fee','Nonce','Timestamp','Balance']};
  beforeEach(()=>{
    // jsdom has no layout. Supply only the real board geometry; sensors and
    // collision detection still run through dnd-kit's production code.
    vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){
      if(this.classList.contains('challenge-drop'))return new DOMRect(0,350,600,150);
      const label=this.getAttribute('aria-label')||'';
      const letter=label.match(/^Drag answer ([A-D]):/)?.[1];
      if(letter){const i=letter.charCodeAt(0)-65;return new DOMRect(i%2*300,100+Math.floor(i/2)*110,280,90);}
      if(this.style.position==='fixed')return new DOMRect(Number.parseFloat(this.style.left)||0,Number.parseFloat(this.style.top)||0,Number.parseFloat(this.style.width)||280,Number.parseFloat(this.style.height)||90);
      return new DOMRect(0,0,600,800);
    });
  });
  afterEach(()=>vi.restoreAllMocks());

  it('does not select answers when a student clicks or taps a card',async()=>{
    const submit=vi.fn();render(<ChallengeBoard question={question} disabled={false} busy={false} onSubmit={submit}/>);
    const card=screen.getByRole('button',{name:'Drag answer B: Nonce'});
    await userEvent.setup().click(card);
    fireEvent.touchStart(card,{touches:[{identifier:1,clientX:330,clientY:140}]});
    fireEvent.touchEnd(card,{touches:[],changedTouches:[{identifier:1,clientX:330,clientY:140}]});
    expect(screen.getByRole('button',{name:'Submit Answer'})).toBeDisabled();
    expect(screen.getByRole('region',{name:'Your answer drop area'})).toHaveTextContent('Drop your answer here');
    expect(submit).not.toHaveBeenCalled();
  });

  it('supports keyboard dragging and requires final confirmation before submitting',async()=>{
    const u=userEvent.setup();const submit=vi.fn();render(<ChallengeBoard question={question} disabled={false} busy={false} onSubmit={submit}/>);
    const card=screen.getByRole('button',{name:'Drag answer B: Nonce'});card.focus();
    await u.keyboard('[Space]');await u.keyboard('[ArrowDown]');
    await waitFor(()=>expect(screen.getByRole('region',{name:'Your answer drop area'})).toHaveTextContent('Release to place your answer'));
    await u.keyboard('[Space]');
    expect(screen.getByRole('region',{name:'Your answer drop area'})).toHaveTextContent('Your answer · B');
    await u.click(screen.getByRole('button',{name:'Submit Answer'}));expect(submit).not.toHaveBeenCalled();
    await u.click(screen.getByText('Cancel'));expect(submit).not.toHaveBeenCalled();
    await u.click(screen.getByRole('button',{name:'Submit Answer'}));await u.click(screen.getByText('Confirm submission'));
    expect(submit).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('accepts a mouse drag only inside the drop area and lets students clear it',async()=>{
    // dnd-kit suppresses synthetic post-drag clicks for 50 ms. Model a separate
    // deliberate click when clearing, after its click guard has been removed.
    const u=userEvent.setup({delay:60});const submit=vi.fn();render(<ChallengeBoard question={question} disabled={false} busy={false} onSubmit={submit}/>);
    const card=screen.getByRole('button',{name:'Drag answer B: Nonce'});
    fireEvent.mouseDown(card,{button:0,clientX:330,clientY:140});
    fireEvent.mouseMove(document,{clientX:350,clientY:160});
    fireEvent.mouseMove(document,{clientX:650,clientY:250});
    fireEvent.mouseUp(document,{clientX:650,clientY:250});
    expect(screen.getByRole('button',{name:'Submit Answer'})).toBeDisabled();
    fireEvent.mouseDown(card,{button:0,clientX:330,clientY:140});
    fireEvent.mouseMove(document,{clientX:350,clientY:160});
    fireEvent.mouseMove(document,{clientX:300,clientY:420});
    await waitFor(()=>expect(screen.getByRole('region',{name:'Your answer drop area'})).toHaveTextContent('Release to place your answer'));
    fireEvent.mouseUp(document,{clientX:300,clientY:420});
    expect(screen.getByRole('button',{name:'Submit Answer'})).toBeEnabled();
    await u.click(screen.getByRole('button',{name:'Clear answer'}));
    expect(screen.getByRole('button',{name:'Submit Answer'})).toBeDisabled();expect(submit).not.toHaveBeenCalled();
  });

  it('cancels a keyboard drag without selecting an answer',async()=>{
    const u=userEvent.setup();render(<ChallengeBoard question={question} disabled={false} busy={false} onSubmit={vi.fn()}/>);
    screen.getByRole('button',{name:'Drag answer B: Nonce'}).focus();await u.keyboard('[Enter]');await u.keyboard('[ArrowDown]');await u.keyboard('[Escape]');
    expect(screen.getByRole('button',{name:'Submit Answer'})).toBeDisabled();
    expect(screen.getByRole('region',{name:'Your answer drop area'})).toHaveTextContent('Drop your answer here');
  });

  it('places an answer after a touch hold and drag into the target',async()=>{
    const submit=vi.fn();render(<ChallengeBoard question={question} disabled={false} busy={false} onSubmit={submit}/>);
    const card=screen.getByRole('button',{name:'Drag answer B: Nonce'});
    fireEvent.touchStart(card,{touches:[{identifier:1,clientX:330,clientY:140}]});
    await waitFor(()=>expect(card).toHaveClass('is-dragging'));
    fireEvent.touchMove(card,{touches:[{identifier:1,clientX:300,clientY:420}]});
    await waitFor(()=>expect(screen.getByRole('region',{name:'Your answer drop area'})).toHaveTextContent('Release to place your answer'));
    fireEvent.touchEnd(card,{touches:[],changedTouches:[{identifier:1,clientX:300,clientY:420}]});
    expect(screen.getByRole('button',{name:'Submit Answer'})).toBeEnabled();
    expect(screen.getByRole('region',{name:'Your answer drop area'})).toHaveTextContent('Your answer · B');expect(submit).not.toHaveBeenCalled();
  });

  it.each([{disabled:true,busy:false},{disabled:false,busy:true}])('blocks dragging and submission while locked: %s',async state=>{
    const submit=vi.fn();render(<ChallengeBoard question={question} {...state} onSubmit={submit}/>);
    expect(screen.getByRole('button',{name:'Drag answer B: Nonce'})).toBeDisabled();
    expect(screen.getByRole('button',{name:state.busy?'Checking answer…':'Submit Answer'})).toBeDisabled();expect(submit).not.toHaveBeenCalled();
  });
});
