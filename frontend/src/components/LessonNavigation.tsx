import { ArrowLeft, ArrowRight, Check, Code2, RotateCcw } from 'lucide-react';
import { stageNames } from './TeachingStage';

type Props = { scene: number; furthest: number; completed: boolean; canContinue: boolean; hasPrevious: boolean; hasNext: boolean; onPrevious: () => void; onContinue: () => void; onScene: (scene: number) => void; onReset: () => void; onDeepDive: () => void };
export function LessonNavigation({ scene, furthest, completed, canContinue, hasPrevious, hasNext, onPrevious, onContinue, onScene, onReset, onDeepDive }: Props) {
  const lastCompleted = scene === 7 && !hasNext && completed;
  return <nav className="lesson-dock" aria-label="Lesson navigation">
    <div className="dock-position"><span>STAGE {scene + 1} / 8</span><strong>{stageNames[scene]}</strong></div>
    <div className="scene-progress" aria-label="Lesson stages">{stageNames.map((name, index) => <button key={name} disabled={index > furthest} className={scene === index ? 'current' : index < scene ? 'past' : ''} aria-label={`Stage ${index + 1}: ${name}`} aria-current={scene === index ? 'step' : undefined} onClick={() => onScene(index)}><span>{index < scene ? <Check size={12} /> : index + 1}</span></button>)}</div>
    <div className="dock-tools">{furthest >= 4 && <button className="dock-tool" aria-label="Reset experiment" title="Reset experiment" onClick={onReset}><RotateCcw size={16} /><span>Reset experiment</span></button>}{scene >= 4 && <button className="dock-tool" aria-label="Go deeper" title="Go deeper" onClick={onDeepDive}><Code2 size={17} /><span>Go deeper</span></button>}</div>
    <div className="dock-movement"><button className="btn btn-secondary" disabled={!hasPrevious && scene === 0} onClick={onPrevious}><ArrowLeft size={16} /><span>Previous</span></button><button className="btn btn-primary continue-control" disabled={!canContinue || lastCompleted} onClick={onContinue}>{scene === 7 ? hasNext ? 'Next discovery' : completed ? 'Lesson complete' : 'Finish lesson' : scene === 3 ? 'Start experiment' : 'Continue'}{lastCompleted ? <Check size={16} /> : <ArrowRight size={16} />}</button></div>
  </nav>;
}
