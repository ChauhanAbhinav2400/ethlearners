import { ArrowUpRight, BookOpen, ChevronDown, Code2, Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Lesson } from '../content/types';
import { lessonById } from '../content/curriculum';
import { Dialog } from './Dialog';

export function DeepDiveDialog({ lesson, mode, onClose }: { lesson: Lesson; mode: string; onClose: () => void }) {
  return <Dialog title={`Go deeper: ${lesson.shortTitle}`} onClose={onClose} className="depth-dialog">
    <section className="depth-idea"><span className="section-eyebrow"><BookOpen size={15} />UNDERSTAND THE IDEA</span><p>{lesson.mentalModel}</p></section>
    <div className="depth-intro"><h3>See how it works</h3><p>Start with an example. Open a section when you want the mechanism behind it.</p></div>
    <div className="depth-sections">{lesson.deepDive.map((section, index) => <section className="depth-section" key={section.title}>
      <h3><span>{String(index + 1).padStart(2, '0')}</span>{section.title}</h3>
      {section.example && <p className="depth-example">{section.example}</p>}
      <details open={!section.example}><summary><Code2 size={15} />Go deeper<ChevronDown size={14} /></summary>
        {section.body.split('\n\n').map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        {section.code && <pre tabIndex={0} aria-label={`${section.title} code example`}>{section.code}</pre>}
      </details>
    </section>)}</div>
    <section className="depth-connections"><h3><Link2 size={16} />Connect the concepts</h3>{lesson.related.map(id => <Link to={`/${mode}/${id}`} key={id} onClick={onClose}><span><strong>{lessonById[id].shortTitle}</strong><small>{lesson.relatedWhy?.[id] || lessonById[id].summary}</small></span><ArrowUpRight size={17} /></Link>)}</section>
    <section className="source-links"><h3>Read the original sources</h3>{lesson.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}<ArrowUpRight size={14} /></a>)}<small>Sources reviewed October 2026. The experiment is a simplified local model.</small></section>
  </Dialog>;
}
