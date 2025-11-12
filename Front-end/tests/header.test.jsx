import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import Header from '../src/components/Header.jsx';

describe('Header component (Vitest)', () => {
	it('renders correctly when user is not authenticated', () => {
		const mockOnLogout = vi.fn();
		
		render(
			<BrowserRouter>
				<Header user={null} isAuthenticated={false} onLogout={mockOnLogout} />
			</BrowserRouter>
		);

		// Check brand/logo is visible
		expect(screen.getByText('Participium')).toBeVisible();
		
		// Check Login and Signup links are visible
		expect(screen.getByRole('link', { name: 'Login' })).toBeVisible();
		expect(screen.getByRole('link', { name: 'Signup' })).toBeVisible();
		
		// Check Logout button is NOT visible
		expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument();
	});

	it('renders correctly when user is authenticated as regular user', () => {
		const mockOnLogout = vi.fn();
		const mockUser = {
			username: 'testuser',
			email: 'test@example.com',
			role_name: 'user'
		};

		render(
			<BrowserRouter>
				<Header user={mockUser} isAuthenticated={true} onLogout={mockOnLogout} />
			</BrowserRouter>
		);

		// Check brand/logo is visible
		expect(screen.getByText('Participium')).toBeVisible();
		
		// Check welcome message with username
		expect(screen.getByText(/Welcome,/i)).toBeVisible();
		expect(screen.getByText('testuser')).toBeVisible();
		
		// Check Logout button is visible (it has role="button" due to href="#")
		expect(screen.getByRole('button', { name: 'Logout' })).toBeVisible();
		
		// Check Login and Signup links are NOT visible
		expect(screen.queryByRole('link', { name: 'Login' })).not.toBeInTheDocument();
		expect(screen.queryByRole('link', { name: 'Signup' })).not.toBeInTheDocument();
		
		// Check admin links are NOT visible for regular user
		expect(screen.queryByRole('link', { name: 'User Creation' })).not.toBeInTheDocument();
		expect(screen.queryByRole('link', { name: 'User List' })).not.toBeInTheDocument();
	});

	it('renders correctly when user is authenticated as admin', () => {
		const mockOnLogout = vi.fn();
		const mockUser = {
			username: 'adminuser',
			email: 'admin@example.com',
			role_name: 'admin'
		};

		render(
			<BrowserRouter>
				<Header user={mockUser} isAuthenticated={true} onLogout={mockOnLogout} />
			</BrowserRouter>
		);

		// Check brand/logo is visible
		expect(screen.getByText('Participium')).toBeVisible();
		
		// Check welcome message with username
		expect(screen.getByText(/Welcome,/i)).toBeVisible();
		expect(screen.getByText('adminuser')).toBeVisible();
		
		// Check admin links are visible
		expect(screen.getByRole('link', { name: 'User Creation' })).toBeVisible();
		expect(screen.getByRole('link', { name: 'User List' })).toBeVisible();
		
		// Check Logout button is visible (it has role="button" due to href="#")
		expect(screen.getByRole('button', { name: 'Logout' })).toBeVisible();
		
		// Check Login and Signup links are NOT visible
		expect(screen.queryByRole('link', { name: 'Login' })).not.toBeInTheDocument();
		expect(screen.queryByRole('link', { name: 'Signup' })).not.toBeInTheDocument();
	});

	it('calls onLogout when Logout link is clicked', async () => {
		const mockOnLogout = vi.fn();
		const mockUser = {
			username: 'testuser',
			email: 'test@example.com',
			role_name: 'user'
		};

		render(
			<BrowserRouter>
				<Header user={mockUser} isAuthenticated={true} onLogout={mockOnLogout} />
			</BrowserRouter>
		);

		const logoutButton = screen.getByRole('button', { name: 'Logout' });
		await userEvent.click(logoutButton);

		expect(mockOnLogout).toHaveBeenCalledTimes(1);
	});

	it('displays first_name when username is not available', () => {
		const mockOnLogout = vi.fn();
		const mockUser = {
			first_name: 'John',
			last_name: 'Doe',
			email: 'john@example.com',
			role_name: 'user'
		};

		render(
			<BrowserRouter>
				<Header user={mockUser} isAuthenticated={true} onLogout={mockOnLogout} />
			</BrowserRouter>
		);

		// Check welcome message with first_name
		expect(screen.getByText(/Welcome,/i)).toBeVisible();
		expect(screen.getByText('John')).toBeVisible();
	});
});

