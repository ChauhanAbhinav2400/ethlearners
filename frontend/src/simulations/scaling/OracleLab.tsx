import { useState } from 'react';
import { ArrowDown, Clock3, Radio, ShieldAlert } from 'lucide-react';
import type { SimulationProps } from '../../content/types';

type Feed = { value: string; updatedAt: number };
type Reading = { value: number; observedAt: number; oldestAt: number };
export function OracleLab({ onDiscover }: SimulationProps) {
  const [feeds, setFeeds] = useState<Feed[]>([{ value: '100', updatedAt: 0 }, { value: '102', updatedAt: 0 }, { value: '98', updatedAt: 0 }]);
  const [clock, setClock] = useState(0);
  const [mode, setMode] = useState<'single' | 'median'>('single');
  const [reading, setReading] = useState<Reading | null>(null);
  const [message, setMessage] = useState('A contract cannot fetch a website itself. These three pretend publishers provide observations for it to read.');
  function report(text: string) { setMessage(text); onDiscover(text); }
  function update(index: number, value: string) {
    setFeeds(current => current.map((feed, i) => i === index ? { value, updatedAt: clock } : feed));
    setMessage(`Publisher ${String.fromCharCode(65 + index)} submitted a new report. The contract’s last accepted reading has not changed yet.`);
  }
  function read() {
    const selected = mode === 'single' ? feeds.slice(0, 1) : feeds;
    if (selected.some(feed => !Number.isFinite(Number(feed.value)) || Number(feed.value) <= 0)) return report('Read rejected: at least one selected report is missing or nonpositive. The last accepted reading is unchanged.');
    if (selected.some(feed => clock - feed.updatedAt > 60)) return report('Read rejected: a selected report is older than this app’s 60-second freshness limit. The last accepted reading is unchanged; old data does not become fresh by reading it.');
    const sorted = selected.map(feed => Number(feed.value)).sort((a, b) => a - b);
    const value = sorted[Math.floor(sorted.length / 2)];
    setReading({ value, observedAt: clock, oldestAt: Math.min(...selected.map(feed => feed.updatedAt)) });
    report(mode === 'single'
      ? `The contract accepted publisher A’s report of ${value}. Freshness and a valid publisher do not prove this number matches the outside world.`
      : feeds.every(feed => Number(feed.value) === Number(feeds[0].value))
        ? `The median is ${value}, and all sources agree. Correlated or compromised sources can still agree on the wrong observation.`
        : `The median is ${value}. One extreme report cannot dominate three observations, but this still depends on independent, reliable sources.`);
  }
  return <div className="scale-lab">
    <div className="scale-heading"><span className="eyebrow">A WINDOW INTO THE OUTSIDE WORLD</span><span className="scale-chip"><Clock3 size={13} /> t = {clock}s</span></div>
    <div className="scale-feeds">{feeds.map((feed, index) => <section className={`scale-feed ${clock - feed.updatedAt > 60 ? 'stale' : ''} ${mode === 'single' && index > 0 ? 'not-selected' : ''}`} key={index}><div className="scale-feed-heading"><Radio size={19} /><strong>Publisher {String.fromCharCode(65 + index)}</strong></div><label>Reported price<input className="field" aria-label={`Publisher ${String.fromCharCode(65 + index)} reported price`} type="number" min={1} max={10000} value={feed.value} onChange={event => update(index, event.target.value)} /></label><span className="scale-feed-age">{clock - feed.updatedAt}s old · {clock - feed.updatedAt > 60 ? 'STALE' : 'fresh'}</span><button className="scale-text-button" onClick={() => update(index, feed.value)}>Refresh report {String.fromCharCode(65 + index)}</button></section>)}</div>
    <div className="scale-connection"><ArrowDown size={20} /><span>{mode === 'single' ? 'Publisher A only' : 'Median of A, B, and C'} · freshness ≤ 60s</span><ArrowDown size={20} /></div>
    <div className="scale-oracle-contract"><div><ShieldAlert size={23} /><span className="eyebrow">CONTRACT’S LAST ACCEPTED READING</span></div><strong data-testid="oracle-reading">{reading ? reading.value : '—'}<small>demo price units</small></strong><p>{reading ? `Read at t = ${reading.observedAt}s · oldest underlying report is now ${clock - reading.oldestAt}s old` : 'No reading accepted yet'}</p><div className="scale-quote">10 demo items × {reading?.value ?? '?'} = <b>{reading ? reading.value * 10 : '?'}</b> valuation units</div></div>
    <div className="scale-segment" aria-label="Oracle aggregation policy"><button aria-pressed={mode === 'single'} onClick={() => { setMode('single'); setMessage('The next read will use only publisher A.'); }}>One publisher</button><button aria-pressed={mode === 'median'} onClick={() => { setMode('median'); setMessage('The next read requires all three reports to be fresh, then takes their median.'); }}>Three-source median</button></div>
    <div className="scale-actions"><button className="btn btn-primary" onClick={read}>Read into contract <ArrowDown size={16} /></button><button className="btn btn-secondary" onClick={() => { setClock(value => value + 30); setMessage('Thirty teaching seconds passed. Report ages increased; the saved contract reading did not refresh itself.'); }}>Advance 30 seconds</button></div>
    <div className="scale-scenarios"><span className="eyebrow">TRY A FAILURE</span><button className="scale-text-button" onClick={() => update(0, '600')}>Manipulate publisher A</button><button className="scale-text-button" onClick={() => { setFeeds(current => current.map(() => ({ value: '600', updatedAt: clock }))); setMessage('All three sources now report the same manipulated value. Read again and inspect the median.'); }}>Correlate all reports</button><button className="scale-text-button" onClick={() => { setFeeds(['100', '102', '98'].map(value => ({ value, updatedAt: clock }))); setMessage('Three independent demo reports were refreshed. Read them into the contract.'); }}>Restore independent reports</button></div>
    <p className="status-line" role="status">{message}</p>
    <p className="lab-note">Toy prices, publishers, time, and freshness policy. A three-value median is not a real oracle protocol. This app requires all selected reports to be fresh; real consumers choose feed-specific checks and fallbacks. No external market data is fetched.</p>
  </div>;
}
