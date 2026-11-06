import { ArrowLeft, ArrowRight, Eye, FlaskConical, Lightbulb } from 'lucide-react';
import type { ReactNode, RefObject } from 'react';
import { useEffect, useRef } from 'react';
import type { Question } from '../content/types';
import type { TeachingContent } from '../content/teachingTypes';
import { QuestionCard } from './QuestionCard';

export const stageNames = ['The idea', 'A familiar example', 'How it works', 'Before you try', 'Guided experiment', 'Explain the result', 'Check understanding', 'Go deeper'];
const prompts = ['Understand the idea', 'Picture something familiar', 'Now, how does it really work?', 'Now let’s see what we just learned.', 'Try one step at a time', 'What changed, and why?', 'Can you explain a new situation?', 'Think about the engineering'];

type Props = {
  teaching: TeachingContent; stage: number; prediction: Question; predicted: number | null; onPredict: (value: number) => void;
  summary: string; takeaways: string[]; checks: Question[]; answers: (number | null)[]; onAnswer: (index: number, value: number) => void;
  discovery: string; step: number; onStep: (value: number) => void; onExperiment: () => void; onReview: () => void;
  headingRef: RefObject<HTMLHeadingElement | null>; deeper: ReactNode; nextQuestion?: string;
};
export function TeachingStage({ teaching, stage, prediction, predicted, onPredict, summary, takeaways, checks, answers, onAnswer, discovery, step, onStep, onExperiment, onReview, headingRef, deeper, nextQuestion }: Props) {
  const current = teaching.steps[Math.min(step, teaching.steps.length - 1)];
  const instructionHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { instructionHeading.current?.focus(); }, [step]);
  return <>
    <div className="guide-scene-label"><span>STAGE {stage + 1} OF {stageNames.length}</span><span>{stageNames[stage]}</span></div>
    <h2 ref={headingRef} tabIndex={-1} id="scene-heading">{prompts[stage]}</h2>
    {stage === 0 && <div className="narration theory-narration">{teaching.idea.map((paragraph, index) => <p key={index}>{paragraph}</p>)}<p className="guide-hint">Next: a familiar example, then the real mechanism. The experiment comes after that foundation.</p></div>}
    {stage === 1 && <div className="familiar-example"><h3>{teaching.example.title}</h3>{teaching.example.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}<div className="analogy-limit"><strong>Where this comparison stops</strong><p>{teaching.example.limitation}</p></div></div>}
    {stage === 2 && <ol className="mechanism-steps">{teaching.mechanism.map((item, index) => <li key={index}><span className="mechanism-number">{index + 1}</span><div><h3>{item.title}</h3>{item.body.split('\n\n').map((paragraph, i) => <p key={i}>{paragraph}</p>)}</div></li>)}</ol>}
    {stage === 3 && <>
      <p className="guide-copy">{teaching.bridge.intro}</p>
      <div className="experiment-map"><h3>What to watch</h3><ul>{teaching.bridge.focus.map((focus, i) => <li key={i}>{focus}</li>)}</ul><h3>Your first action</h3><p>{teaching.bridge.firstAction}</p><h3>What to expect</h3><p>{teaching.bridge.expected}</p></div>
      <QuestionCard question={prediction} value={predicted} onChange={onPredict} />
    </>}
    {stage === 4 && <>
      <div className="guided-step"><span className="section-eyebrow">GUIDE {step + 1} / {teaching.steps.length}</span><h3 ref={instructionHeading} tabIndex={-1}>{current.title}</h3><p>{current.action}</p><div className="guided-observe"><strong><Eye size={15} />Look for this</strong><p>{current.observe}</p></div><details><summary>Why this happens</summary><p>{current.why}</p></details></div>
      <button className="btn btn-secondary jump-to-experiment" onClick={onExperiment}><FlaskConical size={16} />Go to experiment<ArrowRight size={15} /></button>
      <div className="guide-step-controls"><button className="text-button" onClick={() => onStep(step - 1)} disabled={step === 0}><ArrowLeft size={14} />Earlier instruction</button><button className="text-button" onClick={() => onStep(step + 1)} disabled={step >= teaching.steps.length - 1}>Next instruction<ArrowRight size={14} /></button></div>
      <div className={`observation ${discovery ? 'has-observation' : ''}`} aria-live="polite"><span className="section-eyebrow">YOUR OBSERVATION</span><p>{discovery || 'Follow the first instruction. When you change the model, its explanation will appear here.'}</p></div>
    </>}
    {stage === 5 && <>
      {discovery && <div className="observed-result"><Eye size={17} /><p>{discovery}</p></div>}
      <p className="guide-copy">{summary}</p>
      {predicted !== null && <div className="prediction-review"><strong>You predicted</strong><p>{prediction.options[predicted]}</p><strong>Compare that with the mechanism</strong><p>{prediction.explanation}</p></div>}
      <div className="mental-model"><div className="section-eyebrow"><Lightbulb size={14} />TAKE THIS WITH YOU</div>{takeaways.map((item, i) => <p key={i}>{item}</p>)}</div>
      <button className="text-button" onClick={onExperiment}>Try another input<ArrowRight size={15} /></button>
    </>}
    {stage === 6 && <>
      {checks.map((question, index) => <div className="understanding-question" key={index}><QuestionCard question={question} value={answers[index] ?? null} onChange={value => onAnswer(index, value)} check />{answers[index] != null && answers[index] !== question.answer && <button className="text-button review-theory" onClick={onReview}>Revisit how it works<ArrowRight size={14} /></button>}</div>)}
      {nextQuestion && <div className="next-question"><span>THE NEXT QUESTION</span><p>{nextQuestion}</p></div>}
    </>}
    {stage === 7 && deeper}
  </>;
}
