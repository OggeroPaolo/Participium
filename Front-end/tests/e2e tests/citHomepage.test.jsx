import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CitHomepage from '../../src/components/CitHomepage.jsx';

const mockReports = [
	{
		id: 1,
		title: 'Pothole on Main St',
		reporterName: 'johndoe',
		position: { lat: 45.0705, lng: 7.686 },
	},
	{
		id: 2,
		title: 'Broken streetlight',
		reporterName: 'janedoe',
		position: { lat: 45.071, lng: 7.687 },
	},
];

vi.mock('../../src/API/API.js', () => ({
	getApprovedReports: vi.fn(),
}));

let latestMapProps = null;

vi.mock('../../src/components/Map.jsx', () => ({
	default: (props) => {
		latestMapProps = props;
		return (
			<div data-testid='map-component'>
				Mock Map (selected: {props.selectedReportID || 'none'})
			</div>
		);
	},
}));

const { getApprovedReports } = await import('../../src/API/API.js');

const originalScrollIntoView = Element.prototype.scrollIntoView;

beforeAll(() => {
	Element.prototype.scrollIntoView = vi.fn();
});

afterAll(() => {
	Element.prototype.scrollIntoView = originalScrollIntoView;
});

describe('CitHomepage component (Vitest)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		latestMapProps = null;
	});

	it('loads and displays reports list with map', async () => {
		getApprovedReports.mockResolvedValueOnce(mockReports);

		render(<CitHomepage />);

		await waitFor(() => {
			expect(getApprovedReports).toHaveBeenCalledTimes(1);
		});

		expect(await screen.findByText('Pothole on Main St')).toBeVisible();
		expect(screen.getByText('Broken streetlight')).toBeVisible();
		expect(screen.getAllByText(/Reported by:/i)).toHaveLength(2);
		expect(screen.getByTestId('map-component')).toBeVisible();

		expect(latestMapProps?.approvedReports).toHaveLength(2);
		expect(latestMapProps?.selectedReportID).toBe(0);
	});

	it('shows empty state when there are no reports', async () => {
		getApprovedReports.mockResolvedValueOnce([]);

		render(<CitHomepage />);

		const emptyMessage = await screen.findByText('No reports yet');
		expect(emptyMessage).toBeVisible();
		expect(screen.queryByText('Reports Overview')).toBeVisible();
	});

	it('selects a report when a card is clicked', async () => {
		getApprovedReports.mockResolvedValueOnce(mockReports);

		render(<CitHomepage />);

		const potholeCard = await screen.findByText('Pothole on Main St');
		await userEvent.click(potholeCard);

		const cardElement = potholeCard.closest('.report-card');
		expect(cardElement).toHaveClass('selected');
		expect(latestMapProps?.selectedReportID).toBe(1);
	});

	it('updates selection when map triggers onMarkerSelect', async () => {
		getApprovedReports.mockResolvedValueOnce(mockReports);

		render(<CitHomepage />);

		await waitFor(() => {
			expect(latestMapProps?.approvedReports).toHaveLength(2);
		});

		await act(async () => {
			latestMapProps?.onMarkerSelect?.(2);
		});

		const streetlightCard = await screen.findByText('Broken streetlight');
		const cardElement = streetlightCard.closest('.report-card');
		expect(cardElement).toHaveClass('selected');
	});
});

