// Fake API service for fetching model chart data
export interface ModelChartData extends Record<string | number, number> {
	[year: number]: number;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchModelChartData(): Promise<ModelChartData> {
	// Simulate network delay
	await delay(200 + Math.random() * 1000);

	return {
		2016: 1230,
		2017: 2802,
		2018: 4800,
		2019: 3200,
		2020: 5500,
	};
}
