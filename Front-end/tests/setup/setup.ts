import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

function noop() {
	return {};
}

vi.mock('leaflet.markercluster', noop, { virtual: true });
vi.mock('leaflet.markercluster/dist/MarkerCluster.css', noop, { virtual: true });
vi.mock('leaflet.markercluster/dist/MarkerCluster.Default.css', noop, { virtual: true });
vi.mock('leaflet.awesome-markers/dist/leaflet.awesome-markers.css', noop, { virtual: true });
vi.mock('leaflet.awesome-markers/dist/leaflet.awesome-markers.js', noop, { virtual: true });
