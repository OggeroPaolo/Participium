import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import UserList from '../src/components/UserList.jsx';

// Mock firebaseConfig first
vi.mock('../src/firebaseConfig.js', () => ({
	auth: {},
}));

// Mock firebaseService - needed because getInternalUsers uses getBearerToken
vi.mock('../src/firebaseService.js', () => ({
	getBearerToken: vi.fn(() => Promise.resolve('Bearer mock-token')),
}));

// Mock the API
vi.mock('../src/API/API', () => ({
	getInternalUsers: vi.fn(),
}));

describe('UserList component (Vitest)', () => {
	const mockUsers = [
		{
			first_name: 'John',
			last_name: 'Doe',
			username: 'johndoe',
			role_name: 'admin',
			email: 'john@example.com',
		},
		{
			first_name: 'Jane',
			last_name: 'Smith',
			username: 'janesmith',
			role_name: 'operator',
			email: 'jane@example.com',
		},
		{
			first_name: 'Bob',
			last_name: 'Johnson',
			username: 'bobjohnson',
			role_name: 'user',
			email: 'bob@example.com',
		},
	];

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders heading correctly', async () => {
		const { getInternalUsers } = await import('../src/API/API');
		getInternalUsers.mockResolvedValueOnce([]);

		render(
			<BrowserRouter>
				<UserList />
			</BrowserRouter>
		);

		expect(screen.getByRole('heading', { name: 'List of registered internal users' })).toBeVisible();
	});

	it('displays users when loaded from API', async () => {
		const { getInternalUsers } = await import('../src/API/API');
		getInternalUsers.mockResolvedValueOnce(mockUsers);

		render(
			<BrowserRouter>
				<UserList />
			</BrowserRouter>
		);

		// Wait for users to load
		await waitFor(() => {
			expect(screen.getByText('John Doe')).toBeVisible();
		});

		// Check all users are displayed
		expect(screen.getByText('John Doe')).toBeVisible();
		expect(screen.getByText('johndoe')).toBeVisible();
		expect(screen.getByText('john@example.com')).toBeVisible();
		expect(screen.getByText('Admin')).toBeVisible();

		expect(screen.getByText('Jane Smith')).toBeVisible();
		expect(screen.getByText('janesmith')).toBeVisible();
		expect(screen.getByText('jane@example.com')).toBeVisible();
		expect(screen.getByText('Operator')).toBeVisible();

		expect(screen.getByText('Bob Johnson')).toBeVisible();
		expect(screen.getByText('bobjohnson')).toBeVisible();
		expect(screen.getByText('bob@example.com')).toBeVisible();
		expect(screen.getByText('User')).toBeVisible();
	});

	it('displays empty list when no users are returned', async () => {
		const { getInternalUsers } = await import('../src/API/API');
		getInternalUsers.mockResolvedValueOnce([]);

		render(
			<BrowserRouter>
				<UserList />
			</BrowserRouter>
		);

		// Wait for API call to complete
		await waitFor(() => {
			expect(getInternalUsers).toHaveBeenCalled();
		});

		// Heading should still be visible
		expect(screen.getByRole('heading', { name: 'List of registered internal users' })).toBeVisible();

		// No user data should be displayed
		expect(screen.queryByText(/John|Jane|Bob/i)).not.toBeInTheDocument();
	});

	it('formats role names correctly', async () => {
		const { getInternalUsers } = await import('../src/API/API');
		const usersWithFormattedRoles = [
			{
				first_name: 'Test',
				last_name: 'User',
				username: 'testuser',
				role_name: 'super_admin',
				email: 'test@example.com',
			},
		];
		getInternalUsers.mockResolvedValueOnce(usersWithFormattedRoles);

		render(
			<BrowserRouter>
				<UserList />
			</BrowserRouter>
		);

		// Wait for user to load
		await waitFor(() => {
			expect(screen.getByText('Test User')).toBeVisible();
		});

		// Check role is formatted correctly (super_admin -> Super Admin)
		expect(screen.getByText('Super Admin')).toBeVisible();
	});

	it('calls getInternalUsers on mount', async () => {
		const { getInternalUsers } = await import('../src/API/API');
		getInternalUsers.mockResolvedValueOnce(mockUsers);

		render(
			<BrowserRouter>
				<UserList />
			</BrowserRouter>
		);

		// Wait for API call
		await waitFor(() => {
			expect(getInternalUsers).toHaveBeenCalledTimes(1);
		});
	});
});

