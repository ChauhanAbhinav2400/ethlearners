import type { ReactNode } from 'react';
import './execution.css';
export function ExecHeader({ eyebrow, children }: { eyebrow: string; children: ReactNode }) { return <header className="exec-header"><span className="eyebrow">{eyebrow}</span><p>{children}</p></header>; }
export function ExecStatus({ children, warning = false }: { children: ReactNode; warning?: boolean }) { return <div role="status" className={`exec-status ${warning ? 'exec-warning' : ''}`}><i /> <div>{children}</div></div>; }
export function ExecCode({ label, value }: { label: string; value: unknown }) { return <div className="exec-code"><span className="eyebrow">{label}</span><pre>{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</pre></div>; }
