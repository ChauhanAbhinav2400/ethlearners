import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RewardJourney } from './RewardJourney';

afterEach(cleanup);

describe('Guided reward setup', () => {
  it('starts signed-out students with an account and does not offer a later step', () => {
    render(<MemoryRouter><RewardJourney signedIn={false} walletReady={false} verified={false} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Sign in to get started' })).toHaveAttribute('href', '/account');
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByText('Sign in').closest('li')).toHaveAttribute('aria-current', 'step');
  });

  it('requires the saved reward wallet even when human verification is already complete', () => {
    render(<MemoryRouter><RewardJourney signedIn walletReady={false} verified /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Set up my wallet' })).toHaveAttribute('href', '/wallet');
    expect(screen.queryByText('Setup complete')).not.toBeInTheDocument();
    expect(screen.getByText('Verify your identity').closest('li')).toHaveTextContent('Complete');
  });

  it('explains the existing quiz prerequisite before offering ID verification', () => {
    render(<MemoryRouter><RewardJourney signedIn walletReady verified={false} quizCompleted={false} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Choose a chapter quiz' })).toHaveAttribute('href', '/dashboard');
    expect(screen.queryByRole('link', { name: 'Continue to World ID' })).not.toBeInTheDocument();
  });

  it('points eligible students to the verification section', () => {
    render(<MemoryRouter><RewardJourney signedIn walletReady verified={false} quizCompleted verificationHref="#world-verification" /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Continue to World ID' })).toHaveAttribute('href', '#world-verification');
  });

  it('keeps students on their current chapter when its quiz is unfinished', () => {
    render(<MemoryRouter><RewardJourney signedIn walletReady verified={false} quizCompleted={false} quizHref="#chapter-practice" /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Continue this chapter quiz' })).toHaveAttribute('href', '#chapter-practice');
  });

  it('labels the dashboard chapter picker as a choice of quizzes', () => {
    render(<MemoryRouter><RewardJourney signedIn walletReady verified={false} quizCompleted={false} quizHref="#chapter-paths" /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Choose a chapter quiz' })).toHaveAttribute('href', '#chapter-paths');
  });

  it('waits for saved state before suggesting a setup action', () => {
    render(<MemoryRouter><RewardJourney signedIn={false} walletReady={false} verified={false} loading /></MemoryRouter>);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Checking your account');
  });

  it('explains that simulation verification does not enable rewards', () => {
    render(<MemoryRouter><RewardJourney signedIn walletReady verified verificationEnvironment="staging" /></MemoryRouter>);
    expect(screen.getByText('Simulation setup complete')).toBeInTheDocument();
    expect(screen.queryByText('You’re all set.')).not.toBeInTheDocument();
    expect(screen.getByText(/Reward attempts and claims are unavailable/)).toBeInTheDocument();
  });
});
