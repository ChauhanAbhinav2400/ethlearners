import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Check, CircleX, Lightbulb, Trophy } from 'lucide-react';
import './challenge-result.css';

type ChallengeResultProps = {
  passed: boolean;
  explanation: string;
  chapterTitle: string;
  lessonHref: string;
  nextChapterHref?: string;
};

export function ChallengeResult({ passed, explanation, chapterTitle, lessonHref, nextChapterHref }: ChallengeResultProps) {
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => { heading.current?.focus(); }, [passed]);

  return <section className={`challenge-result ${passed ? 'challenge-result--passed' : 'challenge-result--failed'}`} aria-labelledby={headingId}>
    <div className="challenge-result-hero">
      {passed && <div className="challenge-result-sparks" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <span key={i} />)}</div>}
      <div className="challenge-result-emblem" aria-hidden="true">{passed ? <Trophy size={44} strokeWidth={1.6} /> : <CircleX size={44} strokeWidth={1.6} />}</div>
      <span className="challenge-result-label">{passed ? <Check size={14} aria-hidden="true" /> : <CircleX size={14} aria-hidden="true" />}{passed ? 'PASSED · ANSWER CORRECT' : 'NOT PASSED · ANSWER INCORRECT'}</span>
      <h2 id={headingId} ref={heading} tabIndex={-1}>{passed ? 'Master Challenge passed!' : 'Master Challenge not passed'}</h2>
      <p className="challenge-result-chapter">{chapterTitle}</p>
      <p className="challenge-result-lead">{passed ? 'You put your understanding to the test. You earned eligibility for this chapter’s learning reward.' : 'This answer missed the mark. Take a moment to understand why, then keep building your knowledge.'}</p>
    </div>

    <div className="challenge-result-explanation">
      <Lightbulb size={22} aria-hidden="true" />
      <div><h3>The idea to take with you</h3><p>{explanation}</p></div>
    </div>

    <div className="challenge-result-next">
      <span className="section-eyebrow">WHAT HAPPENS NEXT</span>
      <h3>{passed ? 'Claim your learning reward' : 'Turn this attempt into understanding'}</h3>
      <p>{passed ? 'Open your dashboard to view or claim your Sepolia learning tokens. Tokens and achievement badges are confirmed after the reward transaction completes.' : 'Your one reward attempt for this chapter has been used. The Master Challenge cannot be retried for a reward, but the lessons and practice questions are always open.'}</p>
      <div className="challenge-result-actions">
        {passed ? <Link className="btn btn-primary" to="/dashboard#learning-rewards">View & claim reward <ArrowRight size={16} aria-hidden="true" /></Link> : <Link className="btn btn-primary" to={lessonHref}><BookOpen size={16} aria-hidden="true" />Review this chapter</Link>}
        {passed ? <Link className="btn btn-secondary" to={nextChapterHref || lessonHref}>{nextChapterHref ? 'Explore the next chapter' : 'Revisit the lesson'}<ArrowRight size={16} aria-hidden="true" /></Link> : <a className="btn btn-secondary" href="#chapter-practice">Practice the quiz again <ArrowRight size={16} aria-hidden="true" /></a>}
      </div>
      <p className="challenge-result-footnote">{passed ? 'Passing alone does not send tokens. Check your dashboard for claim status.' : 'This result does not prevent you from learning or attempting other chapters.'}</p>
    </div>
  </section>;
}
