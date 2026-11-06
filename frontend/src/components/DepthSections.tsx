import { ArrowUpRight, ChevronDown, Code2 } from 'lucide-react';
import type { Lesson } from '../content/types';

export function DepthSections({ sections, sources, boundary }: { sections: Lesson['deepDive']; sources: Lesson['sources']; boundary: string }) {
  return <>
    <p className="guide-copy">Choose a question to explore. You can return to the experiment at any time.</p>
    <div className="depth-sections">{sections.map((section, index) => <section className="depth-section" key={index}>
      <h3><span>{String(index + 1).padStart(2, '0')}</span>{section.title}</h3>
      {section.example && <p className="depth-example">{section.example}</p>}
      <details open={!section.example}><summary><Code2 size={15} />Go deeper<ChevronDown size={14} /></summary>
        {section.body.split('\n\n').map((paragraph, i) => <p key={i}>{paragraph}</p>)}
        {section.code && <pre tabIndex={0} aria-label={`${section.title} code example`}>{section.code}</pre>}
      </details>
    </section>)}</div>
    <div className="analogy-limit"><strong>Where this model stops</strong><p>{boundary}</p></div>
    <section className="source-links"><h3>Read the original sources</h3>{sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}<ArrowUpRight size={14} /></a>)}</section>
  </>;
}
