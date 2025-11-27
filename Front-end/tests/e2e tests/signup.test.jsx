import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import Signup from '../../src/components/Signup.jsx';

// Mock the API
vi.mock('../../src/API/API.js', () => ({
	handleSignup: vi.fn(),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
	const actual = await vi.importActual('react-router');
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

describe('Signup page (Vitest)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders all form fields and toggles password visibility', async () => {
		render(
			<BrowserRouter>
				<Signup />
			</BrowserRouter>
		);

		// Check heading and subtitle
		expect(screen.getByRole('heading', { name: 'Sign up' })).toBeVisible();
		expect(screen.getByText('Create an account to get started')).toBeVisible();

		// Check all form fields are visible
		expect(screen.getByLabelText(/First name/i)).toBeVisible();
		expect(screen.getByLabelText(/Last Name/i)).toBeVisible();
		expect(screen.getByLabelText(/Username/i)).toBeVisible();
		expect(screen.getByLabelText(/Email/i)).toBeVisible();
		
		const passwordInput = screen.getByPlaceholderText('Enter password');
		const passwordConfirmInput = screen.getByPlaceholderText('Confirm password');
		
		expect(passwordInput).toBeVisible();
		expect(passwordInput).toHaveAttribute('type', 'password');
		expect(passwordConfirmInput).toBeVisible();
		expect(passwordConfirmInput).toHaveAttribute('type', 'password');

		// Check SIGNUP button is visible
		expect(screen.getByRole('button', { name: 'SIGNUP' })).toBeVisible();

		// Toggle password visibility buttons
		const passwordToggleButtons = screen.getAllByRole('button').filter(btn =>
			btn.querySelector('.bi-eye, .bi-eye-slash')
		);
		expect(passwordToggleButtons).toHaveLength(2);

		// Toggle first password field
		await userEvent.click(passwordToggleButtons[0]);
		expect(passwordInput).toHaveAttribute('type', 'text');
		await userEvent.click(passwordToggleButtons[0]);
		expect(passwordInput).toHaveAttribute('type', 'password');

		// Toggle password confirmation field
		await userEvent.click(passwordToggleButtons[1]);
		expect(passwordConfirmInput).toHaveAttribute('type', 'text');
		await userEvent.click(passwordToggleButtons[1]);
		expect(passwordConfirmInput).toHaveAttribute('type', 'password');
	});

	it('shows error when passwords do not match', async () => {
		render(
			<BrowserRouter>
				<Signup />
			</BrowserRouter>
		);

		// Fill in form fields
		await userEvent.type(screen.getByLabelText(/First name/i), 'John');
		await userEvent.type(screen.getByLabelText(/Last Name/i), 'Doe');
		await userEvent.type(screen.getByLabelText(/Username/i), 'johndoe');
		await userEvent.type(screen.getByLabelText(/Email/i), 'john@example.com');
		await userEvent.type(screen.getByPlaceholderText('Enter password'), 'password123');
		await userEvent.type(screen.getByPlaceholderText('Confirm password'), 'differentpassword');

		// Submit form
		await userEvent.click(screen.getByRole('button', { name: 'SIGNUP' }));

		// Check error message appears
		const error = await screen.findByText('Passwords do not match');
		expect(error).toBeVisible();
	});

	it('shows error when signup fails', async () => {
		const { handleSignup } = await import('../../src/API/API.js');
		handleSignup.mockRejectedValueOnce(new Error('Email already exists'));

		render(
			<BrowserRouter>
				<Signup />
			</BrowserRouter>
		);

		// Fill in form fields with matching passwords
		await userEvent.type(screen.getByLabelText(/First name/i), 'John');
		await userEvent.type(screen.getByLabelText(/Last Name/i), 'Doe');
		await userEvent.type(screen.getByLabelText(/Username/i), 'johndoe');
		await userEvent.type(screen.getByLabelText(/Email/i), 'john@example.com');
		await userEvent.type(screen.getByPlaceholderText('Enter password'), 'password123');
		await userEvent.type(screen.getByPlaceholderText('Confirm password'), 'password123');

		// Submit form
		await userEvent.click(screen.getByRole('button', { name: 'SIGNUP' }));

		// Check error message appears (component displays error.message directly)
		const error = await screen.findByText('Email already exists');
		expect(error).toBeVisible();
	});

	it('shows success message and navigates to login on successful signup', async () => {
		const { handleSignup } = await import('../../src/API/API.js');
		handleSignup.mockResolvedValueOnce({ success: true });

		render(
			<BrowserRouter>
				<Signup />
			</BrowserRouter>
		);

		// Fill in form fields with matching passwords
		await userEvent.type(screen.getByLabelText(/First name/i), 'John');
		await userEvent.type(screen.getByLabelText(/Last Name/i), 'Doe');
		await userEvent.type(screen.getByLabelText(/Username/i), 'johndoe');
		await userEvent.type(screen.getByLabelText(/Email/i), 'john@example.com');
		await userEvent.type(screen.getByPlaceholderText('Enter password'), 'password123');
		await userEvent.type(screen.getByPlaceholderText('Confirm password'), 'password123');

		// Submit form
		await userEvent.click(screen.getByRole('button', { name: 'SIGNUP' }));

		// Check success message appears
		const successMessage = await screen.findByText(/Account created successfully! Redirecting to login\.\.\./i);
		expect(successMessage).toBeVisible();

		// Wait for navigation (setTimeout is 2500ms in the component)
		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledWith('/login');
		}, { timeout: 3000 });
	});
});

