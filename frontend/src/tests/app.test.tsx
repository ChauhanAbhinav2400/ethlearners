import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../app/App';
import { lessons, lessonById } from '../content/curriculum';

const progressKey = 'ethereum-explorer-progress-v1';
const nativeShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
const nativeClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');

beforeAll(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', ''); } },
    close: { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open'); } },
  });
});
afterAll(() => {
  if (nativeShowModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', nativeShowModal);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  if (nativeClose) Object.defineProperty(HTMLDialogElement.prototype, 'close', nativeClose);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
});
beforeEach(() => {
  localStorage.clear();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); });

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="current-route">{location.pathname}</output>;
}

function renderApp(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><App /><LocationProbe /></MemoryRouter>);
}
async function advanceToExperiment(user: ReturnType<typeof userEvent.setup>) {
  for (let stage = 0; stage < 3; stage++) await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.click(screen.getByRole('button', { name: 'Start experiment' }));
}

describe('lesson navigation', () => {
  it.each(lessons.map(lesson => [lesson.id, lesson.title]))('opens %s independently in Explore with theory before controls', (id, title) => {
    renderApp(`/explore/${id}`);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Understand the idea' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Interactive experiment' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stage 5: Guided experiment' })).toBeDisabled();
    expect(screen.queryByText(/coming later|coming soon/i)).not.toBeInTheDocument();
  });

  it('keeps experiment state through expansion, theory review and deeper reading; reset stays in the current stage', async () => {
    const user = userEvent.setup();
    renderApp('/story/peers');
    await advanceToExperiment(user);
    expect(screen.getByRole('heading', { name: 'Try one step at a time' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: /Gossip one hop/ }));
    expect(screen.getByTestId('peer-B')).toHaveTextContent('Message received');
    await user.click(screen.getByRole('button', { name: 'Expand experiment' }));
    expect(screen.queryByRole('complementary', { name: 'Lesson guide' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show guide' }));
    await user.click(screen.getByRole('button', { name: 'Go deeper' }));
    const dialog = screen.getByRole('dialog', { name: /Go deeper/ });
    expect(within(dialog).getByRole('heading', { name: 'See how it works' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Close dialog' }));
    expect(screen.getByRole('button', { name: 'Go deeper' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Stage 3: How it works' }));
    await user.click(screen.getByRole('button', { name: 'Stage 5: Guided experiment' }));
    expect(screen.getByTestId('peer-B')).toHaveTextContent('Message received');
    await user.click(screen.getByRole('button', { name: 'Reset experiment' }));
    expect(screen.getByTestId('peer-B')).not.toHaveTextContent('Message received');
    expect(screen.getByRole('button', { name: 'Stage 5: Guided experiment' })).toHaveAttribute('aria-current', 'step');
  });

  it.each([['story', 'consensus'], ['explore', 'evm']])('follows %s order after the receipts lesson', async (mode, nextId) => {
    const id = 'receipts-and-logs';
    localStorage.setItem(progressKey, JSON.stringify({ completed: [id], visited: [id], lastLesson: id, scenes: { [id]: 7 }, teachingVersion: 2 }));
    const user = userEvent.setup(); renderApp(`/${mode}/${id}`);
    await user.click(screen.getByRole('button', { name: 'Next discovery' }));
    expect(screen.getByTestId('current-route')).toHaveTextContent(`/${mode}/${nextId}`);
    expect(screen.getByRole('heading', { level: 1, name: lessonById[nextId].title })).toHaveFocus();
  });

  it('opens a lesson directly, with optional prerequisite context and an interactive experiment', async () => {
    renderApp('/explore/peers');
    expect(screen.getByRole('heading', { level: 1, name: 'Pass it to a peer' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore mode' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText(/A little context helps/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Gossip one hop/ })).not.toBeInTheDocument();
    await advanceToExperiment(userEvent.setup());
    expect(screen.getByRole('button', { name: /Gossip one hop/ })).toBeEnabled();
    const path = screen.getByRole('navigation', { name: 'Curriculum' });
    expect(within(path).getByRole('link', { name: 'Peers & messages' })).toHaveAttribute('aria-current', 'page');
    await waitFor(() => expect(JSON.parse(localStorage.getItem(progressKey)!).visited).toContain('peers'));
  });

  it('switches learning modes without changing the current topic or experiment state', async () => {
    const user = userEvent.setup();
    renderApp('/story/peers');
    await advanceToExperiment(user);
    await user.click(screen.getByRole('button', { name: /Gossip one hop/ }));
    expect(screen.getByTestId('peer-B')).toHaveTextContent('Message received');
    await user.click(screen.getByRole('link', { name: 'Explore mode' }));
    expect(screen.getByTestId('current-route')).toHaveTextContent('/explore/peers');
    expect(screen.getByRole('heading', { level: 1, name: 'Pass it to a peer' })).toBeInTheDocument();
    expect(screen.getByTestId('peer-B')).toHaveTextContent('Message received');
    await user.click(screen.getByRole('link', { name: 'Story mode' }));
    expect(screen.getByTestId('current-route')).toHaveTextContent('/story/peers');
    expect(screen.getByRole('link', { name: 'Story mode' })).toHaveAttribute('aria-current', 'page');
  });

  it('finds the gas lesson through a fee search and navigates in the current mode', async () => {
    const user = userEvent.setup();
    renderApp('/explore/source-of-truth');
    await user.click(screen.getByRole('button', { name: 'Search topics' }));
    const dialog = screen.getByRole('dialog', { name: 'Find your next discovery' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Search topics' }), 'fee');
    await user.click(within(dialog).getByRole('button', { name: /Put a meter on computation/ }));
    expect(screen.getByRole('heading', { level: 1, name: 'Put a meter on computation' })).toBeInTheDocument();
    expect(screen.getByTestId('current-route')).toHaveTextContent('/explore/gas');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('saves the current scene and resumes it when the app opens again', async () => {
    const user = userEvent.setup();
    const view = renderApp('/story/source-of-truth');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('button', { name: 'Stage 2: A familiar example' })).toHaveAttribute('aria-current', 'step');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(progressKey)!).scenes['source-of-truth']).toBe(2));
    view.unmount();
    renderApp('/learn');
    expect(screen.getByTestId('current-route')).toHaveTextContent('/story/source-of-truth');
    expect(screen.getByRole('button', { name: 'Stage 3: How it works' })).toHaveAttribute('aria-current', 'step');
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByRole('button', { name: 'Stage 2: A familiar example' })).toHaveAttribute('aria-current', 'step');
  });

  it('explains an incorrect checkpoint, saves a correct completion, and continues to the next lesson', async () => {
    const user = userEvent.setup();
    const view = renderApp('/story/source-of-truth');
    await advanceToExperiment(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    const next = screen.getByRole('button', { name: 'Continue' });
    expect(next).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /No one needs to trust the company anymore/ }));
    expect(next).toBeDisabled();
    expect(screen.getByText(/Think it through/)).toHaveTextContent('Replication can improve availability');
    expect(JSON.parse(localStorage.getItem(progressKey)!).completed).not.toContain('source-of-truth');
    await user.click(screen.getByRole('button', { name: /The system has more copies of its records/ }));
    expect(next).toBeEnabled();
    await waitFor(() => expect(JSON.parse(localStorage.getItem(progressKey)!).completed).toContain('source-of-truth'));
    await user.click(next);
    await user.click(screen.getByRole('button', { name: 'Next discovery' }));
    expect(screen.getByTestId('current-route')).toHaveTextContent('/story/replication');
    expect(screen.getByRole('heading', { level: 1, name: 'Five copies. One truth?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Five copies. One truth?' })).toHaveFocus();
    await waitFor(() => expect(JSON.parse(localStorage.getItem(progressKey)!).lastLesson).toBe('replication'));
    view.unmount();
    renderApp('/learn');
    expect(screen.getByTestId('current-route')).toHaveTextContent('/story/replication');
    expect(JSON.parse(localStorage.getItem(progressKey)!).completed).toContain('source-of-truth');
  });

  it('offers a useful recovery path for an unknown lesson', async () => {
    const user = userEvent.setup();
    renderApp('/explore/unknown-lesson');
    expect(screen.getByRole('heading', { level: 1, name: /This lesson isn’t on the map/ })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Interactive experiment' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /Start exploring/ }));
    expect(screen.getByTestId('current-route')).toHaveTextContent('/story/source-of-truth');
    await advanceToExperiment(user);
    expect(screen.getByTestId('bank-balance')).toHaveTextContent('₹1,000.00');
  });

  it('clears saved progress and resets the active player without a reload', async () => {
    localStorage.setItem(progressKey, JSON.stringify({ completed: ['source-of-truth'], visited: ['source-of-truth'], lastLesson: 'source-of-truth', scenes: { 'source-of-truth': 3 } }));
    const user = userEvent.setup();
    renderApp('/story/source-of-truth');
    await user.click(screen.getByRole('button', { name: 'Learning preferences' }));
    await user.click(screen.getByRole('button', { name: 'Reset learning progress' }));
    await user.click(screen.getByRole('button', { name: 'Clear learning progress' }));
    expect(screen.getByRole('button', { name: 'Stage 1: The idea' })).toHaveAttribute('aria-current', 'step');
    expect(JSON.parse(localStorage.getItem(progressKey)!).completed).toEqual([]);
    expect(JSON.parse(localStorage.getItem(progressKey)!).scenes).toEqual({});
  });

  it('contains keyboard focus in the mobile drawer and restores it on Escape', async () => {
    const user = userEvent.setup();
    renderApp('/story/source-of-truth');
    const opener = screen.getByRole('button', { name: 'Open learning path' });
    await user.click(opener);
    const drawer = screen.getByRole('dialog', { name: 'Learning path' });
    expect(within(drawer).getByRole('button', { name: 'Collapse learning path' })).toHaveFocus();
    expect(screen.getByRole('main')).toHaveAttribute('inert');
    await user.tab({ shift: true });
    expect(within(drawer).getByRole('button', { name: /Built for curious minds/ })).toHaveFocus();
    await user.tab();
    expect(within(drawer).getByRole('button', { name: 'Collapse learning path' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Learning path' })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(screen.getByRole('main')).not.toHaveAttribute('inert');
  });
});

