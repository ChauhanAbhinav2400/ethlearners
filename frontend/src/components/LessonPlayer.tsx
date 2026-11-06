import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Check, ChevronRight, Clock3, FlaskConical, Info, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Lesson } from '../content/types';
import { lessonById, storySequence, worlds } from '../content/curriculum';
import { simulations } from '../simulations/registry';
import { DeepDiveDialog } from './DeepDiveDialog';
import { TeachingStage } from './TeachingStage';
import { DepthSections } from './DepthSections';
import { teachingByLessonId } from '../content/theoryLessons';
import { chapterForLesson } from '../../../packages/shared/curriculum';
import { LessonNavigation } from './LessonNavigation';
import type { Progress } from '../lib/storage';
import '../learning-layout.css';

type Props = { lesson: Lesson; mode: string; progress: Progress; onScene: (id: string, scene: number) => void; onComplete: (id: string) => void; onNavigate: (id: string) => void };
export function LessonPlayer({ lesson, mode, progress, onScene, onComplete, onNavigate }: Props) {
  const [scene, setScene] = useState(progress.scenes[lesson.id] || 0);
  const [furthest, setFurthest] = useState(progress.completed.includes(lesson.id) ? 7 : progress.scenes[lesson.id] || 0);
  const [started, setStarted] = useState((progress.scenes[lesson.id] || 0) >= 4);
  const [guideStep, setGuideStep] = useState(0);
  const [prediction, setPrediction] = useState<number | null>(null);
  const [answer, setAnswer] = useState<number | null>(null);
  const [reset, setReset] = useState(0);
  const [discovery, setDiscovery] = useState('');
  const [deepDive, setDeepDive] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [prereqDismissed, setPrereqDismissed] = useState(false);
  const [navigationTick, setNavigationTick] = useState(0);
  const guideRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const stageHeadingRef = useRef<HTMLHeadingElement>(null);
  const Simulation = simulations[lesson.simulation];
  const teaching = teachingByLessonId[lesson.id];
  const showStage = scene === 4 || scene === 5;
  const world = worlds.find(item => item.id === lesson.worldId)!;
  const sequence = mode === 'story' ? storySequence : worlds.flatMap(item => item.lessonIds);
  const index = sequence.indexOf(lesson.id);
  const previous = sequence[index - 1];
  const next = sequence[index + 1];
  const completed = progress.completed.includes(lesson.id);
  const missing = lesson.prerequisites.filter(id => !progress.completed.includes(id));

  useEffect(() => {
    if (navigationTick === 0) return;
    if (guideRef.current) guideRef.current.scrollTop = 0;
    headingRef.current?.focus({ preventScroll: true });
    guideRef.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
  }, [navigationTick]);

  const changeScene = (value: number) => {
    setScene(value); onScene(lesson.id, value); setExpanded(false);
    setFurthest(current => Math.max(current, value));
    if (value >= 4) setStarted(true);
    setNavigationTick(value => value + 1);
  };
  const resetExperiment = () => { setReset(value => value + 1); setDiscovery(''); setGuideStep(0); };
  const replay = () => { resetExperiment(); setPrediction(null); setAnswer(null); setStarted(false); changeScene(0); };
  const continueLesson = () => {
    if (scene < 7) changeScene(scene + 1);
    else if (answer === lesson.check.answer || completed) { onComplete(lesson.id); if (next) onNavigate(next); }
  };
  const showExperiment = () => {
    stageHeadingRef.current?.focus({ preventScroll: true });
    stageRef.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
  };

  return <article className="learning-player" aria-labelledby="lesson-title">
    <header className="lesson-heading">
      <div className="breadcrumb"><span>{mode === 'story' ? 'THE JOURNEY' : 'EXPLORE'}</span><ChevronRight size={12} /><span>WORLD {lesson.worldId}</span><ChevronRight size={12} /><span>{world.title}</span></div>
      <div className="heading-main"><div><h1 tabIndex={-1} id="lesson-title">{lesson.title}</h1><p>{lesson.summary}</p></div><div className="lesson-meta"><span><Clock3 size={14} />{lesson.duration} min</span><span>{index + 1} / {sequence.length} lessons</span></div></div>
    </header>
    {mode === 'explore' && missing.length > 0 && !prereqDismissed && <div className="prerequisite-banner"><BookOpen size={17} /><span>A little context helps: {missing.map((id, i) => <span key={id}>{i > 0 && ', '}<Link to={`/explore/${id}`}>{lessonById[id].shortTitle}</Link></span>)}. You can also dive straight in.</span><button onClick={() => setPrereqDismissed(true)}>Got it</button></div>}

    <div className={`lesson-workbench ${!showStage ? 'theory-only' : ''} ${expanded ? 'experiment-expanded' : ''}`}>
      <aside className="context-column" aria-label="Lesson guide" ref={guideRef} hidden={expanded}>
        <TeachingStage teaching={teaching} stage={scene} prediction={lesson.question} predicted={prediction} onPredict={setPrediction} checks={[lesson.check]} answers={[answer]} onAnswer={(_, value) => { setAnswer(value); if (value === lesson.check.answer) onComplete(lesson.id); }} summary={lesson.reveal} takeaways={[lesson.mentalModel]} discovery={discovery} step={guideStep} onStep={setGuideStep} onExperiment={showExperiment} onReview={() => changeScene(2)} headingRef={headingRef} nextQuestion={lesson.nextQuestion} deeper={<DepthSections sections={lesson.deepDive} sources={lesson.sources} boundary={lesson.boundary} />} />
      </aside>
      <section className="experiment-column" aria-label="Interactive experiment" ref={stageRef} hidden={!showStage}>
        <div className="section-heading"><div><FlaskConical size={18} /><h2 ref={stageHeadingRef} tabIndex={-1}>The playground</h2><span className="section-tag">LOCAL SIMULATION</span></div><button className="text-button expand-experiment" aria-pressed={expanded} onClick={() => { if (expanded) { setExpanded(false); setNavigationTick(value => value + 1); } else setExpanded(true); }}>{expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}{expanded ? 'Show guide' : 'Expand experiment'}</button></div>
        <div className="experiment-frame">{started && <Simulation key={reset} onDiscover={setDiscovery} />}</div>
        <details className="boundary-details"><summary><Info size={14} />Where this model stops<ChevronRight size={14} /></summary><p>{lesson.boundary}</p></details>
      </section>
    </div>

    <div className="lesson-utility"><button className="text-button" onClick={replay}><RotateCcw size={14} />Replay lesson</button><span>{completed ? <><Check size={14} />Lesson completed</> : 'Progress saved on this device'}</span>{next ? <button className="text-button" onClick={() => onNavigate(next)}>Skip to next<ArrowRight size={14} /></button> : <button className="text-button" onClick={() => onNavigate(sequence[0])}>Back to the beginning<ArrowRight size={14} /></button>}</div>
    <details className="related-disclosure"><summary>Connect this idea to other lessons<ChevronRight size={16} /></summary><div className="related-links">{lesson.related.map(id => <Link key={id} to={`/${mode}/${id}`}><span><strong>{lessonById[id].shortTitle}</strong><small>{lesson.relatedWhy?.[id] || lessonById[id].summary}</small></span><ArrowRight size={17} /></Link>)}</div></details>

    <div className="chapter-assessment-link"><Link className="btn btn-secondary" to={`/chapters/${chapterForLesson(lesson.id)!.id}/assessment`}>Chapter quiz & Master Challenge<ArrowRight size={16} /></Link><p>Five chapter questions, separate from this lesson?s understanding check.</p></div>
    <LessonNavigation scene={scene} furthest={furthest} completed={completed} canContinue={scene !== 6 || answer === lesson.check.answer || completed} hasPrevious={!!previous} hasNext={!!next} onPrevious={() => { if (scene > 0) changeScene(scene - 1); else if (previous) onNavigate(previous); }} onContinue={continueLesson} onScene={changeScene} onReset={resetExperiment} onDeepDive={() => setDeepDive(true)} />
    {deepDive && <DeepDiveDialog lesson={lesson} mode={mode} onClose={() => setDeepDive(false)} />}
  </article>;
}
