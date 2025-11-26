import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const isTest = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';

const toPath = (relativePath: string) => fileURLToPath(new URL(relativePath, import.meta.url));

const testOnlyAliases = isTest
	? [
			{
				find: /^leaflet\.markercluster$/,
				replacement: toPath('./tests/__mocks__/leafletMarkerCluster.js'),
			},
			{
				find: 'leaflet.markercluster/dist/MarkerCluster.css',
				replacement: toPath('./tests/__mocks__/leafletMarkerCluster.css'),
			},
			{
				find: 'leaflet.markercluster/dist/MarkerCluster.Default.css',
				replacement: toPath('./tests/__mocks__/leafletMarkerClusterDefault.css'),
			},
			{
				find: 'leaflet.awesome-markers/dist/leaflet.awesome-markers.css',
				replacement: toPath('./tests/__mocks__/leafletAwesomeMarkers.css'),
			},
			{
				find: 'leaflet.awesome-markers/dist/leaflet.awesome-markers.js',
				replacement: toPath('./tests/__mocks__/leafletAwesomeMarkers.js'),
			},
	  ]
	: [];

export default defineConfig({
	plugins: [react()],
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['tests/setup.ts'],
		include: ['tests/**/*.test.{js,jsx,ts,tsx}', 'tests/**/*.spec.{js,jsx,ts,tsx}'],
	},
	resolve: {
		alias: testOnlyAliases,
	},
});

