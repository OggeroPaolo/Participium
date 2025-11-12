import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../src/components/Login.jsx';

vi.mock('../src/firebaseService', () => ({
	loginWithEmail: vi.fn(),
}));

describe('Login page (Vitest)', () => {
	it('renders and toggles password visibility', async () => {
		render(<Login />);

		expect(screen.getByRole('heading', { name: 'Welcome!' })).toBeVisible();
		expect(screen.getByPlaceholderText('Email address')).toBeVisible();
		const passwordInput = screen.getByPlaceholderText('Password');
		expect(passwordInput).toBeVisible();
		expect(passwordInput).toHaveAttribute('type', 'password');

		// Toggle button is the button with eye icon next to password
		const toggleButton = screen.getAllByRole('button').find(btn =>
			btn.querySelector('.bi-eye, .bi-eye-slash')
		);
		expect(toggleButton).toBeTruthy();

		await userEvent.click(toggleButton);
		expect(passwordInput).toHaveAttribute('type', 'text');

		await userEvent.click(toggleButton);
		expect(passwordInput).toHaveAttribute('type', 'password');
	});

	it('shows error when credentials are invalid', async () => {
		const { loginWithEmail } = await import('../src/firebaseService');
		loginWithEmail.mockRejectedValueOnce({ code: 'auth/invalid-credential' });

		render(<Login />);

		await userEvent.type(screen.getByPlaceholderText('Email address'), 'invalid@example.com');
		await userEvent.type(screen.getByPlaceholderText('Password'), 'wrongpassword');
		await userEvent.click(screen.getByRole('button', { name: 'LOGIN' }));

		// The component displays one of the handled error messages
		const error = await screen.findByText(/Incorrect email or password\.|Too many failed attempts|Invalid login/i);
		expect(error).toBeVisible();
	});
});


