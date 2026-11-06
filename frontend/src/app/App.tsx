import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Check, Compass, Menu, PanelLeftOpen, Route as RouteIcon, Search, Settings2, SlidersHorizontal } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { TopicSearch } from '../components/TopicSearch';
import { Dialog } from '../components/Dialog';
import { LessonPlayer } from '../components/LessonPlayer';
import { lessonById, lessons, storySequence } from '../content/curriculum';
import { readPreference, readProgress, savePreference, saveProgress } from '../lib/storage';
const Landing=lazy(()=>import('../platform/Pages').then(m=>({default:m.Landing})));
const EverydayPage=lazy(()=>import('../platform/Pages').then(m=>({default:m.EverydayPage})));
const AssessmentPage=lazy(()=>import('../platform/Pages').then(m=>({default:m.AssessmentPage})));
const AccountPage=lazy(()=>import('../platform/Pages').then(m=>({default:m.AccountPage})));
const DashboardPage=lazy(()=>import('../platform/Pages').then(m=>({default:m.DashboardPage})));
const PublicProfilePage=lazy(()=>import('../platform/Pages').then(m=>({default:m.PublicProfilePage})));
const WalletPage=lazy(()=>import('../platform/Pages').then(m=>({default:m.WalletPage})));
import { syncReadingProgress } from '../platform/api';

function Explorer() {
  const { mode = 'story', lessonId = 'source-of-truth' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [progress, setProgress] = useState(readProgress);
  const [storageOk, setStorageOk] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [about, setAbout] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [progressReset, setProgressReset] = useState(0);
  const [motion, setMotion] = useState(() => readPreference('reduce-motion'));
  const [largeText, setLargeText] = useState(() => readPreference('large-text'));
  const lesson = lessonById[lessonId];
  const completedCount = progress.completed.filter(id => !!lessonById[id]).length;
  useEffect(() => { setStorageOk(saveProgress(progress)); void syncReadingProgress(progress); }, [progress]);
  useEffect(() => {
    if (lesson) {
      setProgress(p => ({ ...p, lastLesson: lessonId, visited: p.visited.includes(lessonId) ? p.visited : [...p.visited, lessonId] }));
      document.title = `${lesson.title} — Web3MadEazy`;
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.getElementById('lesson-title')?.focus({ preventScroll: true });
    }
  }, [lessonId, lesson]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(v => !v); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
  useEffect(() => { document.documentElement.dataset.motion = motion ? 'reduced' : 'system'; savePreference('reduce-motion', motion); }, [motion]);
  useEffect(() => { document.documentElement.dataset.text = largeText ? 'large' : 'normal'; savePreference('large-text', largeText); }, [largeText]);
  if (mode !== 'story' && mode !== 'explore') return <Navigate to={`/story/${storySequence[0]}`} replace />;
  const complete = (id: string) => setProgress(p => ({ ...p, completed: p.completed.includes(id) ? p.completed : [...p.completed, id] }));
  return <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <a className="skip-link" href="#main-content">Skip to lesson</a>
    <header className="topbar" inert={mobileNav}><div className="brand-area"><button className="icon-button mobile-menu" aria-label="Open learning path" aria-expanded={mobileNav} onClick={() => setMobileNav(true)}><Menu size={20} /></button><Link className="brand" to="/" aria-label="Web3MadEazy home"><img className="brand-logo" src="/web3madeazy-logo.png" alt="Web3MadEazy" /></Link></div>
      <nav className="mode-switch" aria-label="Learning mode"><Link className={mode === 'story' ? 'active' : ''} to={`/story/${lessonId}`} aria-current={mode === 'story' ? 'page' : undefined}><RouteIcon size={15} />Story mode</Link><Link className={mode === 'explore' ? 'active' : ''} to={`/explore/${lessonId}`} aria-current={mode === 'explore' ? 'page' : undefined}><Compass size={15} />Explore mode</Link></nav>
      <div className="topbar-actions"><button className="search-trigger" onClick={() => setSearchOpen(true)} aria-label="Search topics"><Search size={15} /><span>Find a concept</span><kbd>Ctrl K</kbd></button><div className="header-progress" title={`${completedCount} of ${lessons.length} lessons complete`}><span className="progress-ring" style={{ background: `conic-gradient(var(--accent) ${completedCount / lessons.length * 360}deg, #303a33 0deg)` }}><Check size={11} /></span><span>{completedCount}<small>/{lessons.length}</small></span></div><button className="icon-button settings-button" aria-label="Learning preferences" onClick={() => setSettings(true)}><SlidersHorizontal size={17} /></button></div>
    </header>
    {mobileNav && <button className="sidebar-scrim" aria-label="Close learning path" onClick={() => setMobileNav(false)} />}
    <Sidebar currentId={lessonId} mode={mode} completed={progress.completed} mobile={mobileNav} onClose={() => { if (mobileNav) setMobileNav(false); else setCollapsed(true); }} onAbout={() => setAbout(true)} />
    <main className="main-content" id="main-content" inert={mobileNav}>{collapsed && <button className="expand-sidebar text-button" onClick={() => setCollapsed(false)}><PanelLeftOpen size={15} />Show learning path</button>}{!storageOk && <div className="storage-notice" role="status">Browser storage is unavailable. Your progress will last for this visit.</div>}{lesson ? <LessonPlayer key={`${lessonId}-${progressReset}`} lesson={lesson} mode={mode} progress={progress} onScene={(id, scene) => setProgress(p => ({ ...p, scenes: { ...p.scenes, [id]: scene } }))} onComplete={complete} onNavigate={id => navigate(`/${mode}/${id}`)} /> : <div className="not-found"><Compass size={40} /><span className="section-eyebrow">A SMALL DETOUR</span><h1>This lesson isn’t on the map.</h1><p>The link may have changed. Your progress is still here.</p><Link className="btn btn-primary" to={`/story/${storySequence[0]}`}>Start exploring<ArrowRight size={16} /></Link></div>}</main>
    {searchOpen && <TopicSearch mode={mode} onClose={() => setSearchOpen(false)} />}
    {settings && <Dialog title="Make yourself comfortable" onClose={() => setSettings(false)}><p className="dialog-intro">A few preferences for the way you learn.</p><div className="settings-options"><label><span><strong>Reduce motion</strong><small>Keep state changes, minimize transitions. Your system preference is always respected.</small></span><input type="checkbox" role="switch" checked={motion} onChange={e => setMotion(e.target.checked)} /></label><label><span><strong>Larger reading text</strong><small>A little more room for the explanations.</small></span><input type="checkbox" role="switch" checked={largeText} onChange={e => setLargeText(e.target.checked)} /></label></div><div className="settings-progress"><Settings2 size={18} /><div><strong>{completedCount} of {lessons.length} lessons completed</strong><p>Saved in this browser. No account needed.</p></div></div>{resetConfirm ? <div className="reset-confirm"><p>Clear completed lessons and saved scene positions on this device?</p><button className="btn btn-warning" onClick={() => { const cleared = { completed: [], visited: [], scenes: {}, lastLesson: storySequence[0] }; saveProgress(cleared); setProgress(cleared); setProgressReset(v => v + 1); setResetConfirm(false); setSettings(false); navigate(`/${mode}/${storySequence[0]}`); }}>Clear learning progress</button><button className="text-button" onClick={() => setResetConfirm(false)}>Keep my progress</button></div> : <button className="text-button reset-progress" onClick={() => setResetConfirm(true)}>Reset learning progress</button>}</Dialog>}
    {about && <Dialog title="A little curiosity goes a long way." onClose={() => setAbout(false)}><div className="about-content"><span className="about-large-icon"><img className="about-brand-logo" src="/web3madeazy-logo.png" alt="Web3MadEazy" /></span><p>Web3MadEazy is a collection of small experiments that build one connected mental model. Make a prediction. Change something. See why it matters.</p><div><RouteIcon size={20} /><span><strong>Follow the story</strong><p>Start with a familiar app and follow the questions all the way to Ethereum.</p></span></div><div><Compass size={20} /><span><strong>Explore your own way</strong><p>Search a concept, inspect a mechanism, and follow the connections.</p></span></div><p className="lab-note">Every experiment runs locally with toy data. There are no real payments, wallet connections, or Ethereum nodes. Every world includes working experiments, clear model boundaries, and sources you can inspect.</p><button className="btn btn-primary" onClick={() => setAbout(false)}>Let’s find out<ArrowRight size={16} /></button></div></Dialog>}
    <span className="sr-only" aria-live="polite">{location.pathname}: {lesson?.title}</span>
  </div>;
}
function Start() { const saved=readProgress(); return <Navigate to={`/story/${lessonById[saved.lastLesson]?saved.lastLesson:storySequence[0]}`} replace/>; }
export default function App() { return <Suspense fallback={<p role="status">Opening learning space...</p>}><Routes><Route path="/learn" element={<Start/>}/><Route path="/" element={<Landing />} /><Route path="/everyday/:chapterId" element={<EverydayPage />} /><Route path="/chapters/:chapterId/assessment" element={<AssessmentPage />} /><Route path="/account" element={<AccountPage />} /><Route path="/dashboard" element={<DashboardPage />} /><Route path="/wallet" element={<WalletPage />} /><Route path="/u/:username" element={<PublicProfilePage />} /><Route path="/:mode/:lessonId" element={<Explorer />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></Suspense>; }
