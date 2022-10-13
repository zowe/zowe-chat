import { render, screen } from '@testing-library/react';
import ZoweChatApp from './ZoweChatApp';

test('renders learn react link', () => {
    render(<ZoweChatApp />);
    const linkElement = screen.getByText(/login/i);
    expect(linkElement).toBeInTheDocument();
});
