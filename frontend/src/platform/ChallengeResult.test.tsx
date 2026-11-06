import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ChallengeResult } from './ChallengeResult';

const props = { explanation: 'A nonce prevents the same transaction from being replayed.', chapterTitle: 'Your First Wallet', lessonHref: '/everyday/everyday-4' };

describe('Master Challenge results', () => {
  it('celebrates a pass while distinguishing eligibility from a confirmed reward', () => {
    render(<MemoryRouter><ChallengeResult {...props} passed nextChapterHref="/everyday/everyday-5" /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Master Challenge passed!' })).toHaveFocus();
    expect(screen.getByText(props.explanation)).toBeInTheDocument();
    expect(screen.getByText('Passing alone does not send tokens. Check your dashboard for claim status.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View & claim reward/ })).toHaveAttribute('href', '/dashboard#learning-rewards');
    expect(screen.getByRole('link', { name: /Explore the next chapter/ })).toHaveAttribute('href', '/everyday/everyday-5');
  });

  it('makes failure explicit and directs students to practice without suggesting a second reward attempt', () => {
    render(<MemoryRouter><ChallengeResult {...props} passed={false} /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Master Challenge not passed' })).toHaveFocus();
    expect(screen.getByText(/Master Challenge cannot be retried for a reward/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Review this chapter/ })).toHaveAttribute('href', props.lessonHref);
    expect(screen.getByRole('link', { name: /Practice the quiz again/ })).toHaveAttribute('href', '#chapter-practice');
    expect(screen.queryByRole('link', { name: /claim reward/ })).not.toBeInTheDocument();
  });
});
