import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';

// Mock firebaseConfig first
vi.mock('../../src/firebaseConfig.js', () => ({
	auth: {},
}));

// Mock firebaseService first - must be available before API tries to import it  
vi.mock('../../src/firebaseService.js', () => ({
	getBearerToken: vi.fn(() => Promise.resolve('Bearer mock-token')),
}));

// Mock the API - provide factory to avoid loading actual module that imports firebaseService
vi.mock('../../src/API/API.js', () => ({
	handleSignup: vi.fn(),
	createInternalUser: vi.fn(),
	getUserRoles: vi.fn(),
	getInternalUsers: vi.fn(),
	getUserData: vi.fn(),
}));

import UserCreation from '../../src/components/UserCreation.jsx';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
	const actual = await vi.importActual('react-router');
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

describe('UserCreation page (Vitest)', () => {
	const mockRoles = [
		{ id: 1, name: 'admin' },
		{ id: 2, name: 'operator' },
		{ id: 3, name: 'user' },
	];

	beforeEach(async () => {
		vi.clearAllMocks();
		const { getUserRoles } = await import('../../src/API/API.js');
		getUserRoles.mockResolvedValue(mockRoles);
	});

	it('renders all form fields and toggles password visibility', async () => {
		render(
			<BrowserRouter>
				<UserCreation />
			</BrowserRouter>
		);

		// Check heading
		expect(screen.getByRole('heading', { name: 'Create a new user' })).toBeVisible();

		// Check all form fields are visible
		expect(screen.getByLabelText(/First name/i)).toBeVisible();
		expect(screen.getByLabelText(/Last Name/i)).toBeVisible();
		expect(screen.getByLabelText(/Username/i)).toBeVisible();
		expect(screen.getByLabelText(/Email/i)).toBeVisible();
		expect(screen.getByLabelText(/User role/i)).toBeVisible();

		const passwordInput = screen.getByPlaceholderText('Enter password');
		expect(passwordInput).toBeVisible();
		expect(passwordInput).toHaveAttribute('type', 'password');

		// Check CREATE USER button is visible
		expect(screen.getByRole('button', { name: 'CREATE USER' })).toBeVisible();

		// Wait for roles to load and check dropdown options
		await waitFor(() => {
			expect(screen.getByRole('combobox')).toBeVisible();
		});

		// Check role options are present
		expect(screen.getByRole('option', { name: 'Admin' })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: 'Operator' })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: 'User' })).toBeInTheDocument();

		// Toggle password visibility
		const passwordToggleButton = screen.getAllByRole('button').find(btn =>
			btn.querySelector('.bi-eye, .bi-eye-slash')
		);
		expect(passwordToggleButton).toBeTruthy();

		await userEvent.click(passwordToggleButton);
		expect(passwordInput).toHaveAttribute('type', 'text');

		await userEvent.click(passwordToggleButton);
		expect(passwordInput).toHaveAttribute('type', 'password');
	});

	it('loads and displays user roles in dropdown', async () => {
		render(
			<BrowserRouter>
				<UserCreation />
			</BrowserRouter>
		);

		// Wait for roles to be loaded
		await waitFor(() => {
			expect(screen.getByRole('combobox')).toBeVisible();
		});

		const roleSelect = screen.getByRole('combobox');
		expect(roleSelect).toBeVisible();

		// Check all role options are present with formatted names
		expect(screen.getByRole('option', { name: 'Admin' })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: 'Operator' })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: 'User' })).toBeInTheDocument();
	});

	it('shows error when user creation fails', async () => {
		const { createInternalUser } = await import('../../src/API/API.js');
		createInternalUser.mockRejectedValueOnce(new Error('Email already exists'));

		render(
			<BrowserRouter>
				<UserCreation />
			</BrowserRouter>
		);

		// Wait for roles to load
		await waitFor(() => {
			expect(screen.getByRole('combobox')).toBeVisible();
		});

		// Fill in form fields
		await userEvent.type(screen.getByLabelText(/First name/i), 'John');
		await userEvent.type(screen.getByLabelText(/Last Name/i), 'Doe');
		await userEvent.type(screen.getByLabelText(/Username/i), 'johndoe');
		await userEvent.type(screen.getByLabelText(/Email/i), 'john@example.com');
		await userEvent.type(screen.getByPlaceholderText('Enter password'), 'password123');
		
		// Select a role
		const roleSelect = screen.getByRole('combobox');
		await userEvent.selectOptions(roleSelect, '2'); // Select operator

		// Submit form
		await userEvent.click(screen.getByRole('button', { name: 'CREATE USER' }));

		// Check error message appears (component displays error.message directly)
		const error = await screen.findByText('Email already exists');
		expect(error).toBeVisible();
	});

	it('shows success message and navigates to user-list on successful user creation', async () => {
		const { createInternalUser } = await import('../../src/API/API.js');
		createInternalUser.mockResolvedValueOnce({ success: true });

		render(
			<BrowserRouter>
				<UserCreation />
			</BrowserRouter>
		);

		// Wait for roles to load
		await waitFor(() => {
			expect(screen.getByRole('combobox')).toBeVisible();
		});

		// Fill in form fields
		await userEvent.type(screen.getByLabelText(/First name/i), 'John');
		await userEvent.type(screen.getByLabelText(/Last Name/i), 'Doe');
		await userEvent.type(screen.getByLabelText(/Username/i), 'johndoe');
		await userEvent.type(screen.getByLabelText(/Email/i), 'john@example.com');
		await userEvent.type(screen.getByPlaceholderText('Enter password'), 'password123');
		
		// Select a role
		const roleSelect = screen.getByRole('combobox');
		await userEvent.selectOptions(roleSelect, '1'); // Select admin

		// Submit form
		await userEvent.click(screen.getByRole('button', { name: 'CREATE USER' }));

		// Check success message appears
		const successMessage = await screen.findByText(/Account created successfully! Redirecting to users list\.\.\./i);
		expect(successMessage).toBeVisible();

		// Wait for navigation (setTimeout is 2500ms in the component)
		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledWith('/user-list');
		}, { timeout: 3000 });
	});

	it('submits form with correct data including selected role', async () => {
		const { createInternalUser } = await import('../../src/API/API.js');
		createInternalUser.mockResolvedValueOnce({ success: true });

		render(
			<BrowserRouter>
				<UserCreation />
			</BrowserRouter>
		);

		// Wait for roles to load
		await waitFor(() => {
			expect(screen.getByRole('combobox')).toBeVisible();
		});

		// Fill in form fields
		await userEvent.type(screen.getByLabelText(/First name/i), 'Jane');
		await userEvent.type(screen.getByLabelText(/Last Name/i), 'Smith');
		await userEvent.type(screen.getByLabelText(/Username/i), 'janesmith');
		await userEvent.type(screen.getByLabelText(/Email/i), 'jane@example.com');
		await userEvent.type(screen.getByPlaceholderText('Enter password'), 'securepass123');
		
		// Select operator role
		const roleSelect = screen.getByRole('combobox');
		await userEvent.selectOptions(roleSelect, '2');

		// Submit form
		await userEvent.click(screen.getByRole('button', { name: 'CREATE USER' }));

		// Wait for API call
		await waitFor(() => {
			expect(createInternalUser).toHaveBeenCalledWith({
				firstName: 'Jane',
				lastName: 'Smith',
				username: 'janesmith',
				email: 'jane@example.com',
				password: 'securepass123',
				role_id: '2',
			});
		});
	});
});

