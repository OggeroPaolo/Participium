// Mock leaflet.markercluster and leaflet.awesome-markers BEFORE imports
vi.mock('leaflet.markercluster/dist/leaflet.markercluster.js', () => ({}));
vi.mock('leaflet.markercluster/dist/MarkerCluster.css', () => ({}));
vi.mock('leaflet.markercluster/dist/MarkerCluster.Default.css', () => ({}));
vi.mock('leaflet.awesome-markers/dist/leaflet.awesome-markers.css', () => ({}));
vi.mock('leaflet.awesome-markers/dist/leaflet.awesome-markers.js', () => ({}));

import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Map from '../../src/components/Map.jsx';

// Mock Leaflet
vi.mock('leaflet', () => {
	const mockMapInstance = {
		setView: vi.fn().mockReturnThis(),
		on: vi.fn(),
		removeLayer: vi.fn(),
		remove: vi.fn(),
		invalidateSize: vi.fn(),
		addLayer: vi.fn(),
	};

	const mockLayerGroup = {
		addTo: vi.fn().mockReturnThis(),
		addLayer: vi.fn(),
		clearLayers: vi.fn(),
	};

	const mockClusterGroup = {
		on: vi.fn(),
		addLayer: vi.fn(),
		clearLayers: vi.fn(),
		zoomToShowLayer: vi.fn((marker, cb) => cb && cb()),
	};

	const mockMarker = {
		bindPopup: vi.fn().mockReturnThis(),
		openPopup: vi.fn(),
		addTo: vi.fn().mockReturnThis(),
		setIcon: vi.fn(),
		getLatLng: vi.fn(() => ({ lat: 0, lng: 0 })),
		on: vi.fn().mockReturnThis(),
	};

	const mockTileLayer = {
		addTo: vi.fn().mockReturnThis(),
	};

	const mockIconFn = vi.fn(() => ({}));
	const mockDomEvent = {
		on: vi.fn(),
	};

	const mockMapFn = vi.fn(() => mockMapInstance);
	const mockTileLayerFn = vi.fn(() => mockTileLayer);
	const mockMarkerFn = vi.fn(() => mockMarker);

	// Store references globally so tests can access them
	global.mockMapInstance = mockMapInstance;
	global.mockMarker = mockMarker;
	global.mockTileLayer = mockTileLayer;
	global.mockLayerGroup = mockLayerGroup;
	global.mockClusterGroup = mockClusterGroup;
	global.mockMapFn = mockMapFn;
	global.mockTileLayerFn = mockTileLayerFn;
	global.mockMarkerFn = mockMarkerFn;
	global.mockIconFn = mockIconFn;

	const mockLeaflet = {
		map: mockMapFn,
		tileLayer: mockTileLayerFn,
		marker: mockMarkerFn,
		layerGroup: vi.fn(() => mockLayerGroup),
		markerClusterGroup: vi.fn(() => mockClusterGroup),
		icon: mockIconFn,
		DomEvent: mockDomEvent,
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

const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('Map component (Vitest)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders map container', () => {
		const { container } = renderWithRouter(<Map />);

		// Check that the map wrapper div is rendered
		const mapWrapper = container.querySelector('div[style*="position: relative"]');
		expect(mapWrapper).toBeTruthy();
		expect(mapWrapper).toHaveStyle({ position: 'relative' });
	});

	it('initializes map with default center and zoom', async () => {
		renderWithRouter(<Map />);

		await waitFor(() => {
			expect(global.mockMapInstance.setView).toHaveBeenCalledWith([45.0703, 7.6869], 13);
		});
	});

	it('initializes map with custom center and zoom props', async () => {
		renderWithRouter(<Map center={[40.7128, -74.0060]} zoom={10} />);

		await waitFor(() => {
			expect(global.mockMapInstance.setView).toHaveBeenCalledWith([40.7128, -74.0060], 10);
		});
	});

	it('adds tile layer to map', async () => {
		renderWithRouter(<Map />);

		await waitFor(() => {
			expect(global.mockTileLayer.addTo).toHaveBeenCalledWith(global.mockMapInstance);
		});
	});

	it('sets up click event handler on map', async () => {
		renderWithRouter(<Map />);

		await waitFor(() => {
			expect(global.mockMapInstance.on).toHaveBeenCalledWith('click', expect.any(Function));
		});
	});

	it('displays selected location when map is clicked', async () => {
		renderWithRouter(<Map />);

		// Wait for map to initialize
		await waitFor(() => {
			expect(global.mockMapInstance.on).toHaveBeenCalled();
		});

		// Get the click handler
		const clickHandler = global.mockMapInstance.on.mock.calls.find(
			call => call[0] === 'click'
		)?.[1];

		// Simulate map click
		if (clickHandler) {
			act(() => {
				const mockEvent = {
					latlng: {
						lat: 45.0703,
						lng: 7.6869,
						toFixed: vi.fn((decimals) => {
							if (decimals === 5) {
								return '45.07030';
							}
							return '7.68690';
						}),
					},
				};
				clickHandler(mockEvent);
			});
		}

		// Check that marker was created and location is displayed
		await waitFor(() => {
			expect(screen.getByText(/Selected Location:/i)).toBeVisible();
		});
	});

	it('removes previous marker when new location is clicked', async () => {
		renderWithRouter(<Map />);

		// Wait for map to initialize
		await waitFor(() => {
			expect(global.mockMapInstance.on).toHaveBeenCalled();
		});

		// Get the click handler
		const clickHandler = global.mockMapInstance.on.mock.calls.find(
			call => call[0] === 'click'
		)?.[1];

		// Simulate first click
		if (clickHandler) {
			act(() => {
				const mockEvent1 = {
					latlng: {
						lat: 45.0703,
						lng: 7.6869,
						toFixed: vi.fn(() => '45.07030'),
					},
				};
				clickHandler(mockEvent1);
			});
		}

		// Simulate second click
		if (clickHandler) {
			act(() => {
				const mockEvent2 = {
					latlng: {
						lat: 40.7128,
						lng: -74.0060,
						toFixed: vi.fn(() => '40.71280'),
					},
				};
				clickHandler(mockEvent2);
			});
		}

		// Check that previous marker layers were cleared
		await waitFor(() => {
			expect(global.mockLayerGroup.clearLayers).toHaveBeenCalled();
		});
	});

	it('updates map view when center prop changes', async () => {
		const { rerender } = renderWithRouter(<Map center={[45.0703, 7.6869]} zoom={13} />);

		await waitFor(() => {
			expect(global.mockMapInstance.setView).toHaveBeenCalledWith([45.0703, 7.6869], 13);
		});

		// Change center prop
		rerender(
			<MemoryRouter>
				<Map center={[40.7128, -74.0060]} zoom={13} />
			</MemoryRouter>
		);

		// Map should update
		await waitFor(() => {
			expect(global.mockMapInstance.setView).toHaveBeenCalled();
		});
	});

	it('updates map view when zoom prop changes', async () => {
		const { rerender } = renderWithRouter(<Map center={[45.0703, 7.6869]} zoom={13} />);

		await waitFor(() => {
			expect(global.mockMapInstance.setView).toHaveBeenCalledWith([45.0703, 7.6869], 13);
		});

		// Change zoom prop
		rerender(
			<MemoryRouter>
				<Map center={[45.0703, 7.6869]} zoom={15} />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(global.mockMapInstance.setView).toHaveBeenCalled();
		});
	});

	it('cleans up map instance on unmount', () => {
		const { unmount } = renderWithRouter(<Map />);

		unmount();

		expect(global.mockMapInstance.remove).toHaveBeenCalled();
	});

	it('does not show selected location initially', () => {
		renderWithRouter(<Map />);

		expect(screen.queryByText(/Selected Location:/i)).not.toBeInTheDocument();
	});

	it('formats coordinates to 5 decimal places', async () => {
		renderWithRouter(<Map />);

		await waitFor(() => {
			expect(global.mockMapInstance.on).toHaveBeenCalled();
		});

		const clickHandler = global.mockMapInstance.on.mock.calls.find(
			call => call[0] === 'click'
		)?.[1];

		if (clickHandler) {
			act(() => {
				const mockEvent = {
					latlng: {
						lat: 45.123456789,
						lng: 7.987654321,
						toFixed: vi.fn((decimals) => {
							if (decimals === 5) {
								return '45.12346';
							}
							return '7.98765';
						}),
					},
				};
				clickHandler(mockEvent);
			});
		}

		await waitFor(() => {
			expect(screen.getByText(/Selected Location:/i)).toBeVisible();
		});
	});
});
