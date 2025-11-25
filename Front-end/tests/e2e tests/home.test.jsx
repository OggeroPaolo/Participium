import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import Home from '../../src/components/Home.jsx';

// Mock leaflet.markercluster and leaflet.awesome-markers (used by Map component)
vi.mock('leaflet.markercluster', () => ({}));
vi.mock('leaflet.markercluster/dist/MarkerCluster.css', () => ({}));
vi.mock('leaflet.markercluster/dist/MarkerCluster.Default.css', () => ({}));
vi.mock('leaflet.awesome-markers/dist/leaflet.awesome-markers.css', () => ({}));
vi.mock('leaflet.awesome-markers/dist/leaflet.awesome-markers.js', () => ({}));

// Mock the userStore
const mockUserStore = {
	user: null,
	isAuthenticated: false,
	isLoading: false,
	setUser: vi.fn(),
	clearUser: vi.fn(),
	setLoading: vi.fn(),
};

vi.mock('../../src/store/userStore.js', () => ({
	default: vi.fn(() => mockUserStore),
}));

// Mock the CitHomepage component (which contains the Map)
vi.mock('../../src/components/CitHomepage.jsx', () => ({
	default: () => <div data-testid="map-component">CitHomepage Component</div>,
}));

describe('Home component (Vitest)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset to default unauthenticated state
		mockUserStore.user = null;
		mockUserStore.isAuthenticated = false;
		mockUserStore.isLoading = false;
	});

	it('renders welcome message for unauthenticated users', () => {
		render(
			<BrowserRouter>
				<Home />
			</BrowserRouter>
		);

		expect(screen.getByRole('heading', { name: 'Welcome to Participium' })).toBeVisible();
		expect(screen.getByText('Join our community and start participating in civic engagement.')).toBeVisible();
	});

	it('renders map for authenticated citizen users', () => {
		mockUserStore.user = {
			first_name: 'John',
			last_name: 'Doe',
			username: 'johndoe',
			email: 'john@example.com',
			role_type: 'citizen', // Home component checks role_type, not role_name
		};
		mockUserStore.isAuthenticated = true;

		render(
			<BrowserRouter>
				<Home />
			</BrowserRouter>
		);

		// Map component should be rendered for citizens (via CitHomepage)
		expect(screen.getByTestId('map-component')).toBeVisible();
	});

	it('renders welcome message for authenticated admin users', () => {
		mockUserStore.user = {
			first_name: 'Alice',
			last_name: 'Admin',
			username: 'admin_user',
			email: 'admin@example.com',
			role_type: 'admin', // Home component checks role_type
		};
		mockUserStore.isAuthenticated = true;

		render(
			<BrowserRouter>
				<Home />
			</BrowserRouter>
		);

		expect(screen.getByRole('heading', { name: /Welcome, Alice!/i })).toBeVisible();
		expect(screen.getByText('Admin and operator features coming soon.')).toBeVisible();
		// Map should not be visible for admin
		expect(screen.queryByTestId('map-component')).not.toBeInTheDocument();
	});

	it('renders welcome message for authenticated operator users', () => {
		mockUserStore.user = {
			first_name: 'Jane',
			last_name: 'Operator',
			username: 'operator_user',
			email: 'operator@example.com',
			role_type: 'org_office_operator', // Home component checks role_type
		};
		mockUserStore.isAuthenticated = true;

		render(
			<BrowserRouter>
				<Home />
			</BrowserRouter>
		);

		expect(screen.getByRole('heading', { name: /Welcome, Jane!/i })).toBeVisible();
		expect(screen.getByText('Admin and operator features coming soon.')).toBeVisible();
		// Map should not be visible for operator
		expect(screen.queryByTestId('map-component')).not.toBeInTheDocument();
	});

	it('renders welcome message for authenticated technical operator users', () => {
		mockUserStore.user = {
			first_name: 'Bob',
			last_name: 'Tech',
			username: 'tech_operator',
			email: 'tech@example.com',
			role_type: 'technical_office_operator', // Home component checks role_type
		};
		mockUserStore.isAuthenticated = true;

		render(
			<BrowserRouter>
				<Home />
			</BrowserRouter>
		);

		expect(screen.getByRole('heading', { name: /Welcome, Bob!/i })).toBeVisible();
		expect(screen.getByText('Admin and operator features coming soon.')).toBeVisible();
		// Map should not be visible for technical operator
		expect(screen.queryByTestId('map-component')).not.toBeInTheDocument();
	});

	it('handles user without first_name gracefully', () => {
		mockUserStore.user = {
			username: 'testuser',
			email: 'test@example.com',
			role_type: 'admin', // Home component checks role_type
		};
		mockUserStore.isAuthenticated = true;

		render(
			<BrowserRouter>
				<Home />
			</BrowserRouter>
		);

		// Should still render welcome message even without first_name
		expect(screen.getByText('Admin and operator features coming soon.')).toBeVisible();
	});

	it('switches from unauthenticated to authenticated citizen view', () => {
		const { rerender } = render(
			<BrowserRouter>
				<Home />
			</BrowserRouter>
		);

		// Initially unauthenticated
		expect(screen.getByRole('heading', { name: 'Welcome to Participium' })).toBeVisible();

		// Update to authenticated citizen
		mockUserStore.user = {
			first_name: 'John',
			role_type: 'citizen', // Home component checks role_type
		};
		mockUserStore.isAuthenticated = true;

		rerender(
			<BrowserRouter>
				<Home />
			</BrowserRouter>
		);

		// Should now show map
		expect(screen.getByTestId('map-component')).toBeVisible();
		expect(screen.queryByRole('heading', { name: 'Welcome to Participium' })).not.toBeInTheDocument();
	});

	it('switches from citizen view to admin view when role changes', () => {
		mockUserStore.user = {
			first_name: 'John',
			role_type: 'citizen', // Home component checks role_type
		};
		mockUserStore.isAuthenticated = true;

		const { rerender } = render(
			<BrowserRouter>
				<Home />
			</BrowserRouter>
		);

		// Initially shows map for citizen
		expect(screen.getByTestId('map-component')).toBeVisible();

		// Change role to admin
		mockUserStore.user = {
			first_name: 'John',
			role_type: 'admin', // Home component checks role_type
		};

		rerender(
			<BrowserRouter>
				<Home />
			</BrowserRouter>
		);

		// Should now show admin welcome message
		expect(screen.getByRole('heading', { name: /Welcome, John!/i })).toBeVisible();
		expect(screen.queryByTestId('map-component')).not.toBeInTheDocument();
	});

	it('switches from authenticated to unauthenticated view', () => {
		mockUserStore.user = {
			first_name: 'John',
			role_type: 'citizen', // Home component checks role_type
		};
		mockUserStore.isAuthenticated = true;

		const { rerender } = render(
			<BrowserRouter>
				<Home />
			</BrowserRouter>
		);

		// Initially authenticated
		expect(screen.getByTestId('map-component')).toBeVisible();

		// Update to unauthenticated
		mockUserStore.user = null;
		mockUserStore.isAuthenticated = false;

		rerender(
			<BrowserRouter>
				<Home />
			</BrowserRouter>
		);

		// Should now show unauthenticated welcome message
		expect(screen.getByRole('heading', { name: 'Welcome to Participium' })).toBeVisible();
		expect(screen.queryByTestId('map-component')).not.toBeInTheDocument();
	});
});

