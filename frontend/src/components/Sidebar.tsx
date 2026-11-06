import { Check, ChevronDown, ChevronRight, Circle, Compass, PanelLeftClose, Route, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { worlds, lessonById } from '../content/curriculum';

export function Sidebar({ currentId, mode, completed, mobile, onClose, onAbout }: { currentId: string; mode: string; completed: string[]; mobile: boolean; onClose: () => void; onAbout: () => void }) {
  const sidebarRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const currentWorld = lessonById[currentId]?.worldId;
  const [expanded, setExpanded] = useState<string[]>([currentWorld || '00']);
  useEffect(() => { if (currentWorld) setExpanded(v => v.includes(currentWorld) ? v : [...v, currentWorld]); }, [currentWorld]);
  useEffect(() => {
    if (!mobile) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebarRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key !== 'Tab') return;
      const focusable = sidebarRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handler);
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, [mobile]);
  return <aside ref={sidebarRef} className={`sidebar ${mobile ? 'mobile-open' : ''}`} aria-label="Learning path" role={mobile ? 'dialog' : undefined} aria-modal={mobile ? true : undefined}>
    <div className="sidebar-title"><span><Route size={17} />Your learning path</span><button className="icon-button" onClick={onClose} aria-label="Collapse learning path">{mobile ? <X size={17} /> : <PanelLeftClose size={16} />}</button></div>
    <p className="sidebar-caption">Small experiments. Big ideas.</p>
    <nav className="platform-shortcuts" aria-label="Other learning paths"><Link to="/">Home</Link><Link to="/everyday/everyday-1">Everyday Explorer</Link><Link to="/dashboard">Dashboard</Link></nav>
    <nav className="curriculum-nav" aria-label="Curriculum">{worlds.map(world => {
      const open = expanded.includes(world.id);
      const active = world.id === currentWorld;
      return <div className={`world-group ${active ? 'current-world' : ''}`} key={world.id}>
        <button className="world-button" aria-expanded={open} aria-controls={`world-${world.id}`} onClick={() => setExpanded(v => open ? v.filter(x => x !== world.id) : [...v, world.id])}><span className="world-number">{String(world.order).padStart(2, '0')}</span><span>{world.title}</span>{open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button>
        {open && <div className="world-lessons" id={`world-${world.id}`}>{world.lessonIds.map(id => <Link key={id} className={`lesson-link ${id === currentId ? 'active' : ''}`} aria-current={id === currentId ? 'page' : undefined} to={`/${mode}/${id}`} onClick={() => { if (mobile) onClose(); }}>{completed.includes(id) ? <Check size={13} /> : id === currentId ? <span className="active-lesson-dot" /> : <Circle size={9} />}<span>{lessonById[id].shortTitle}</span>{id === currentId && <span className="lesson-active-line" />}</Link>)}</div>}
      </div>;
    })}</nav>
    <button className="sidebar-about" onClick={onAbout}><span className="about-icon"><Compass size={19} /></span><span><strong>Built for curious minds</strong><small>No wallet. Just a little curiosity.</small></span><ChevronRight size={14} /></button>
    <div className="sidebar-footer"><span className="tiny-orb" />LEARN BY DOING<span>v0.1</span></div>
  </aside>;
}
