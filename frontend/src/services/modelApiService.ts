// Fake API service for fetching model chart data
export interface ModelChartData {
	[year: number]: number;
}

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchModelChartData(
	modelId: string,
): Promise<ModelChartData> {
	// Simulate network delay
	await delay(1000 + Math.random() * 1000);

	return {
		2016: 1230,
		2017: 2802,
		2018: 4800,
		2019: 3200,
		2020: 5500,
	};
}
