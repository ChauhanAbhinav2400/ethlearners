import { Check, CornerDownRight, Lightbulb } from 'lucide-react';
import type { Question } from '../content/types';

export function QuestionCard({ question, value, onChange, check = false }: { question: Question; value: number | null; onChange: (v: number) => void; check?: boolean }) {
  const correct = value === question.answer;
  return <div className="question-card"><div className="section-eyebrow"><Lightbulb size={14} />{check ? 'CHECK YOUR MENTAL MODEL' : 'BEFORE YOU TRY IT'}</div><h3>{question.prompt}</h3><div className="question-options">{question.options.map((option, i) => <button key={option} className={`question-option ${value === i ? 'chosen' : ''} ${value === i && check ? correct ? 'correct' : 'incorrect' : ''}`} aria-pressed={value === i} onClick={() => onChange(i)}><span className="option-letter">{check && value === i && correct ? <Check size={12} /> : String.fromCharCode(65 + i)}</span><span>{option}</span>{value === i && !check && <Check size={14} />}</button>)}</div>{value !== null && <div className={`question-feedback ${check && !correct ? 'try-again' : ''}`} role="status"><CornerDownRight size={14} /><p>{check ? `${correct ? 'That’s it. ' : 'Think it through. '}${question.explanation}` : 'Prediction saved. Now try the experiment and see what happens.'}</p></div>}</div>;
}
