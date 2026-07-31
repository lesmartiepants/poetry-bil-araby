import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PrBodyProbe from '../components/PrBodyProbe';

describe('PrBodyProbe', () => {
  it('renders the probe text the user would see', () => {
    render(<PrBodyProbe />);
    expect(screen.getByTestId('pr-body-probe')).toHaveTextContent('pr body probe ok');
  });
});
