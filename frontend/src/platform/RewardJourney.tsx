import { ArrowRight, Check, CheckCircle2, LockKeyhole, ShieldCheck, UserRound, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import './reward-journey.css';

type RewardJourneyProps = {
  signedIn: boolean;
  walletReady: boolean;
  verified: boolean;
  loading?: boolean;
  quizCompleted?: boolean;
  signInHref?: string;
  walletHref?: string;
  quizHref?: string;
  verificationHref?: string;
  verificationEnvironment?: string;
};

/** Presentation only: each completed step reflects the existing server state. */
export function RewardJourney({ signedIn, walletReady, verified, loading = false, quizCompleted, signInHref = '/account', walletHref = '/wallet', quizHref = '/dashboard', verificationHref = '/wallet#world-verification', verificationEnvironment }: RewardJourneyProps) {
  const complete = [signedIn, signedIn && walletReady, signedIn && verified];
  const next = complete.findIndex(done => !done);
  const ready = next === -1;
  const simulation = signedIn && verified && Boolean(verificationEnvironment && verificationEnvironment !== 'production');
  const steps = [
    { title: 'Sign in', detail: 'Save your learning and challenge progress.', icon: UserRound },
    { title: 'Set up your wallet', detail: 'Connect, sign ownership, then choose your reward wallet.', icon: Wallet },
    { title: 'Verify your identity', detail: 'Use World ID after completing a five-question chapter quiz.', icon: ShieldCheck },
  ];
  const needsQuiz = next === 2 && quizCompleted === false;
  const currentChapterQuiz = quizHref === '#chapter-practice';
  const action = next === 0
    ? { title: 'Start with your learning account', detail: 'Sign in or create an account. We’ll guide you to your wallet next.', label: 'Sign in to get started', href: signInHref }
    : next === 1
      ? { title: 'Next, set up your reward wallet', detail: 'A connection is the first part. Sign to prove ownership and select the address to use for rewards.', label: 'Set up my wallet', href: walletHref }
      : needsQuiz
        ? { title: 'One learning step before World ID', detail: currentChapterQuiz ? 'Save five correct answers in this chapter quiz, then continue to human verification.' : 'Save five correct answers in any chapter quiz while signed in, then come back to verify.', label: currentChapterQuiz ? 'Continue this chapter quiz' : 'Choose a chapter quiz', href: quizHref }
        : { title: 'Continue to human verification', detail: 'Finish human verification to prepare for your one reward-eligible Master Challenge attempt per chapter.', label: 'Continue to World ID', href: verificationHref };

  return <section className={`reward-journey ${ready ? 'is-ready' : ''}`} aria-labelledby="reward-journey-title" aria-busy={loading}>
    <div className="journey-heading">
      <div><span className="section-eyebrow">YOUR REWARD SETUP</span><h2 id="reward-journey-title">A clear path to your first challenge.</h2></div>
      <span className="journey-count">{loading ? 'Checking setup…' : ready ? simulation ? 'Simulation setup complete' : 'Setup complete' : `${complete.filter(Boolean).length} of 3 complete`}</span>
    </div>
    <ol className="journey-steps" aria-label="Reward setup steps">
      {steps.map((step, index) => {
        const done = complete[index];
        const current = index === next && !loading;
        const Icon = step.icon;
        return <li key={step.title} className={`${done ? 'is-complete' : ''} ${current ? 'is-current' : ''}`} aria-current={current ? 'step' : undefined}>
          <div className="journey-step-top"><span className="journey-step-number" aria-hidden="true">{done ? <Check size={15} /> : `0${index + 1}`}</span><span className="journey-step-status">{done ? index === 2 && simulation ? 'Simulation verified' : 'Complete' : loading ? 'Checking' : current ? 'Your next step' : 'Coming next'}</span><Icon size={19} aria-hidden="true" /></div>
          <h3>{step.title}</h3><p>{step.detail}</p>
        </li>;
      })}
    </ol>
    {loading ? <p className="journey-loading" role="status">Checking your account, wallet, and verification progress…</p> : ready ? <div className="journey-next journey-complete"><CheckCircle2 size={23} aria-hidden="true" /><div><strong>{simulation ? 'Your practice setup is complete.' : 'You’re all set.'}</strong><p>{simulation ? 'You can continue learning and practicing with your account.' : 'Complete a chapter’s five questions to unlock its Master Challenge. Your learning journey is ready to continue.'}</p></div></div> : <div className="journey-next"><LockKeyhole size={22} aria-hidden="true" /><div><strong>{action.title}</strong><p>{action.detail}</p></div>{action.href.startsWith('#') ? <a className="btn btn-primary" href={action.href}>{action.label}<ArrowRight size={16} /></a> : <Link className="btn btn-primary" to={action.href}>{action.label}<ArrowRight size={16} /></Link>}</div>}
    {!loading&&simulation&&<p className="world-config-notice">World ID was verified in a simulation environment. Reward attempts and claims are unavailable with this verification.</p>}
    <p className="journey-footnote">Lessons stay open to everyone. These steps prepare your account for chapter rewards.</p>
  </section>;
}
