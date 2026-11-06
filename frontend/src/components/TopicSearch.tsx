import { useState } from 'react';
import { ArrowUpRight, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { lessons, worlds } from '../content/curriculum';
import { Dialog } from './Dialog';

export function TopicSearch({ mode, onClose }: { mode: string; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const results = lessons.filter(lesson => terms.every(term => [lesson.title, lesson.summary, ...lesson.aliases, ...worlds.find(w => w.id === lesson.worldId)!.topics].join(' ').toLowerCase().includes(term)));
  return <Dialog title="Find your next discovery" onClose={onClose} className="search-dialog"><label className="search-field"><Search size={18} /><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Try ‘fees’, ‘nodes’, or ‘trust’" aria-label="Search topics" /><kbd>ESC</kbd></label><div className="search-count" role="status">{results.length} {results.length === 1 ? 'lesson' : 'lessons'} to explore</div><div className="search-results">{results.map(lesson => <button key={lesson.id} onClick={() => { navigate(`/${mode}/${lesson.id}`); onClose(); }}><span><small>WORLD {lesson.worldId} · {lesson.duration} MIN</small><strong>{lesson.title}</strong><span>{lesson.summary}</span></span><ArrowUpRight size={18} /></button>)}{results.length === 0 && <div className="search-empty"><Search size={28} /><p>No matching lessons yet.</p><small>Try a broader word, or open a world in the learning path.</small></div>}</div><div className="dialog-footnote">Same concepts. Follow the story or find your own way.</div></Dialog>;
}
