import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import ReportCreation from '../../src/components/ReportCreation.jsx';

const mockLocation = { state: { lat: 45.12345, lng: 7.98765 } };

vi.mock('react-router', async () => {
	const actual = await vi.importActual('react-router');
	return {
		...actual,
		useLocation: () => mockLocation,
	};
});

vi.mock('../../src/API/API.js', () => ({
	getCategories: vi.fn(),
	createReport: vi.fn(),
}));

const { getCategories } = await import('../../src/API/API.js');

vi.mock('leaflet', () => {
	const mockMapInstance = {
		setView: vi.fn().mockReturnThis(),
		on: vi.fn(),
		remove: vi.fn(),
	};

	const mockLeaflet = {
		map: vi.fn(() => mockMapInstance),
		tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
		marker: vi.fn(() => ({
			addTo: vi.fn().mockReturnValue({
				setLatLng: vi.fn(),
			}),
		})),
		icon: vi.fn(() => ({})),
		Icon: {
			Default: {
				prototype: {
					_getIconUrl: {},
				},
				mergeOptions: vi.fn(),
			},
		},
	};

	return {
		default: mockLeaflet,
		...mockLeaflet,
	};
});

const originalCreateObjectURL = global.URL.createObjectURL;
const originalRevokeObjectURL = global.URL.revokeObjectURL;
const originalAlert = global.alert;
const originalInputValueDescriptor = Object.getOwnPropertyDescriptor(
	HTMLInputElement.prototype,
	'value'
);

beforeAll(() => {
	global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
	global.URL.revokeObjectURL = vi.fn();
	global.alert = vi.fn();
	Object.defineProperty(HTMLInputElement.prototype, 'value', {
		configurable: true,
		get: originalInputValueDescriptor?.get,
		set(value) {
			if (value === null || value === undefined) {
				return;
			}
			return originalInputValueDescriptor?.set?.call(this, value);
		},
	});
});

afterAll(() => {
	global.URL.createObjectURL = originalCreateObjectURL;
	global.URL.revokeObjectURL = originalRevokeObjectURL;
	global.alert = originalAlert;
	if (originalInputValueDescriptor) {
		Object.defineProperty(HTMLInputElement.prototype, 'value', originalInputValueDescriptor);
	}
});

describe('ReportCreation component (Vitest)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getCategories.mockResolvedValue([
			{ id: 1, name: 'Roads' },
			{ id: 2, name: 'Lighting' },
		]);
		mockLocation.state = { lat: 45.12345, lng: 7.98765 };
	});

	it('loads categories and displays selected location', async () => {
		render(
			<BrowserRouter>
				<ReportCreation />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(getCategories).toHaveBeenCalledTimes(1);
		});

		expect(screen.getByText('Roads')).toBeVisible();
		expect(screen.getByText('Lighting')).toBeVisible();
		expect(screen.getByText(/Selected location:/i)).toBeVisible();
		expect(screen.getByText(/Lat: 45\.12345/i)).toBeVisible();
		expect(screen.getByText(/Lng: 7\.98765/i)).toBeVisible();
	});

	it('limits uploads to three photos', async () => {
		const { container } = render(
			<BrowserRouter>
				<ReportCreation />
			</BrowserRouter>
		);

		const fileInput = container.querySelector('input[name="photos"]');
		const files = [
			new File(['img1'], '1.png', { type: 'image/png' }),
			new File(['img2'], '2.png', { type: 'image/png' }),
			new File(['img3'], '3.png', { type: 'image/png' }),
		];

		await act(async () => {
			fireEvent.change(fileInput, { target: { files } });
		});
		expect(screen.getAllByAltText('preview')).toHaveLength(3);

		const extraFile = new File(['img4'], '4.png', { type: 'image/png' });
		await act(async () => {
			fireEvent.change(fileInput, {
				target: {
					files: [extraFile],
				},
			});
		});

		expect(window.alert).toHaveBeenCalledWith('You can only upload a maximum of 3 images.');
	});
});

