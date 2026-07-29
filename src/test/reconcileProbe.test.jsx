import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReconcileProbe from '../components/ReconcileProbe';

describe('ReconcileProbe', () => {
  it('renders the probe marker text', () => {
    render(<ReconcileProbe />);
    expect(screen.getByTestId('reconcile-probe')).toHaveTextContent('reconcile probe ok');
  });
});
