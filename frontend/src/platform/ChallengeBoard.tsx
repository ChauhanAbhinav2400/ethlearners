import { useId, useState } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor,
  pointerWithin, rectIntersection, useDraggable, useDroppable, useSensor, useSensors,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core';
import { ArrowDown, ArrowRight, Check, GripVertical, Info, Keyboard, LoaderCircle, ShieldCheck, Target } from 'lucide-react';
import { Dialog } from '../components/Dialog';
import './challenge-board.css';

// One destination lets keyboard users move directly to it rather than guess pixels.
const answerCoordinates: KeyboardCoordinateGetter = (event, { currentCoordinates, context }) => {
  if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.code)) return;
  event.preventDefault();
  const target = context.droppableRects.get('answer');
  const card = context.collisionRect;
  if (target && card) return {
    x: currentCoordinates.x + target.left - card.left + (target.width - card.width) / 2,
    y: currentCoordinates.y + target.top - card.top + (target.height - card.height) / 2,
  };
};

function Card({ value, text, selected, disabled }: { value: number; text: string; selected: boolean; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: String(value), disabled });
  return <button
    ref={setNodeRef}
    type="button"
    className={`challenge-choice ${selected ? 'is-selected' : ''} ${isDragging ? 'is-dragging' : ''}`}
    {...attributes}
    {...listeners}
    disabled={disabled}
    aria-label={`Drag answer ${String.fromCharCode(65 + value)}: ${text}`}
  >
    <span className="challenge-letter">{String.fromCharCode(65 + value)}</span>
    <span className="challenge-choice-text">{text}</span>
    {selected ? <Check size={19} aria-hidden="true" /> : <GripVertical size={19} aria-hidden="true" />}
  </button>;
}

function DropZone({ selected, options, active, disabled }: { selected: number | null; options: string[]; active: boolean; disabled: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'answer', disabled });
  return <div ref={setNodeRef} className={`challenge-drop ${isOver ? 'is-over' : ''} ${selected !== null ? 'has-answer' : ''} ${active ? 'is-active' : ''}`} role="region" aria-label="Your answer drop area">
    <span className="challenge-drop-icon" aria-hidden="true">{selected !== null ? <Check size={23} /> : isOver ? <ArrowDown size={23} /> : <Target size={23} />}</span>
    <div>
      <strong>{isOver ? 'Release to place your answer' : selected !== null ? `Your answer · ${String.fromCharCode(65 + selected)}` : 'Drop your answer here'}</strong>
      <p>{isOver ? 'You can review it before submitting.' : selected !== null ? options[selected] : 'Drag one option into this space.'}</p>
    </div>
  </div>;
}

export function ChallengeBoard({ question, disabled, busy, onSubmit }: { question: { prompt: string; options: string[] }; disabled: boolean; busy: boolean; onSubmit: (answer: number) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const instructionsId = useId();
  const locked = disabled || busy;
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: answerCoordinates, scrollBehavior: 'auto' }),
  );

  return <section className="master-board challenge-board" aria-busy={busy}>
    <div className="challenge-topline"><span className="section-eyebrow"><ShieldCheck size={15} aria-hidden="true" /> MASTER CHALLENGE</span><span className="challenge-attempt">1 reward attempt</span></div>
    <h2>{question.prompt}</h2>
    <p className="challenge-intro" id={instructionsId}>Take a moment to think, then drag your answer into the space below. You’ll review it before making it final.</p>
    <DndContext
      sensors={sensors}
      collisionDetection={args => args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args)}
      accessibility={{
        screenReaderInstructions: { draggable: 'Press Space or Enter to pick up this answer. Press an arrow key to move it to the answer area. Press Space or Enter again to drop it, or Escape to cancel.' },
        announcements: {
          onDragStart: ({ active: card }) => `Picked up answer ${String.fromCharCode(65 + Number(card.id))}. Move it to the answer area.`,
          onDragOver: ({ over }) => over ? 'Over the answer area. Release or press Space to place this answer.' : 'Outside the answer area.',
          onDragEnd: ({ active: card, over }) => over?.id === 'answer' ? `Answer ${String.fromCharCode(65 + Number(card.id))} placed. Review your answer before submitting.` : 'Answer not placed. Drag it into the answer area to select it.',
          onDragCancel: () => 'Drag cancelled. Your answer has not changed.',
        },
      }}
      onDragStart={({ active: card }) => setActive(Number(card.id))}
      onDragCancel={() => setActive(null)}
      onDragEnd={({ active: card, over }) => {
        setActive(null);
        const choice = Number(card.id);
        if (!locked && over?.id === 'answer' && Number.isInteger(choice) && choice >= 0 && choice < question.options.length) setSelected(choice);
      }}
    >
      <div className="challenge-options-label"><span>01 <strong>Choose & drag</strong></span><span><GripVertical size={14} aria-hidden="true" /> Hold and move a card</span></div>
      <div className="challenge-options" aria-describedby={instructionsId}>
        {question.options.map((text, i) => <Card key={i} value={i} text={text} selected={selected === i} disabled={locked} />)}
      </div>
      <div className="challenge-options-label"><span>02 <strong>Place your answer</strong></span>{selected !== null && <button className="text-button" disabled={locked} onClick={() => setSelected(null)}>Clear answer</button>}</div>
      <DropZone selected={selected} options={question.options} active={active !== null} disabled={locked} />
      <DragOverlay dropAnimation={null}>{active !== null && <div className="challenge-choice challenge-drag-preview" aria-hidden="true"><span className="challenge-letter">{String.fromCharCode(65 + active)}</span><span className="challenge-choice-text">{question.options[active]}</span><GripVertical size={19} /></div>}</DragOverlay>
    </DndContext>
    <div className="challenge-placement" role="status" aria-live="polite">{busy ? 'Checking your final answer…' : selected === null ? 'No answer placed yet.' : 'Answer placed. Drag another card to change it before submitting.'}</div>
    <details className="challenge-keyboard"><summary><Keyboard size={16} aria-hidden="true" /> Keyboard & touch controls</summary><p>Keyboard: Tab to an answer, press Space or Enter to pick it up, use an arrow key to move it to the answer area, then press Space or Enter to drop. Escape cancels. On touch screens, hold a card briefly, then drag it. A tap does not select an answer.</p></details>
    <div className="challenge-submit-row"><div className="challenge-one-attempt"><Info size={17} aria-hidden="true" /><p>One final attempt for this chapter reward. Placing a card does not submit it.</p></div><button className="btn btn-primary" disabled={locked || selected === null} onClick={() => setConfirm(true)}>{busy ? <><LoaderCircle size={16} aria-hidden="true" /> Checking answer…</> : <>Submit Answer <ArrowRight size={16} aria-hidden="true" /></>}</button></div>
    {disabled && !busy && <p className="challenge-locked-note">Complete the setup steps above to submit your Master Challenge.</p>}
    {confirm && selected !== null && <Dialog title="Confirm your final answer" onClose={() => setConfirm(false)} className="challenge-confirm">
      <p>This is your one reward-eligible attempt for this chapter. Once submitted, you cannot try again for this chapter reward.</p>
      <div className="challenge-confirm-answer"><span className="challenge-letter">{String.fromCharCode(65 + selected)}</span><strong>{question.options[selected]}</strong></div>
      <p>You can still go back and change your answer.</p>
      <div className="platform-actions"><button className="btn btn-primary" disabled={locked} onClick={() => { if (!locked) { setConfirm(false); onSubmit(selected); } }}>Confirm submission</button><button className="btn btn-secondary" onClick={() => setConfirm(false)}>Cancel</button></div>
    </Dialog>}
  </section>;
}
