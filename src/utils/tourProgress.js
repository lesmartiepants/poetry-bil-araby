/**
 * Guided-walkthrough progress, read straight from localStorage.
 *
 * Two consumers need the same answer and must not disagree: TourLauncher (which
 * step to resume at) and AccountMenu (whether the entry reads "Take the tour" or
 * "Resume tour"). Keeping the keys in one place stops the label from drifting
 * away from what the tour actually does when you tap it.
 *
 * Keys: `tourCompleted` ('true' once finished), `tourStep` (last step index).
 */

/** @returns {{completed: boolean, step: number}} step is NaN when never started. */
export function readTourProgress() {
  try {
    return {
      completed: localStorage.getItem('tourCompleted') === 'true',
      step: parseInt(localStorage.getItem('tourStep') ?? '', 10),
    };
  } catch {
    // Private mode / storage disabled — treat as a first-timer.
    return { completed: false, step: NaN };
  }
}

/**
 * True when the reader left the tour partway through: they started it and never
 * reached the end. A completed tour has no progress to resume — tapping it
 * restarts from the top, so it reads "Take the tour" again.
 *
 * @returns {boolean}
 */
export function hasTourProgress() {
  const { completed, step } = readTourProgress();
  return !completed && Number.isFinite(step) && step > 0;
}

/** Menu label that matches what the entry will actually do. */
export function tourEntryLabel() {
  return hasTourProgress() ? 'Resume tour' : 'Take the tour';
}
