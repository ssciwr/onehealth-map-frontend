export interface ClimateDataPoint {
	latitude: number;
	longitude: number;
	temperature: number;
}

export interface ClimateApiResponse {
	result: {
		"latitude, longitude, var_value": [number, number, number][];
	};
}

export interface ClimateApiRequest {
	requested_time_point: string;
	requested_variable_value: string;
	outputFormat?: string[];
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchClimateData(
	year: number,
	month: number,
	requestedVariableValue = "R0",
	_outputFormat?: string[],
): Promise<ClimateDataPoint[]> {
	await delay(100 + Math.random() * 300);

	// Validate month parameter
	if (month === undefined || month === null) {
		throw new Error(
			`Month parameter is ${month}. Expected a number between 1-12.`,
		);
	}

	if (typeof month !== "number" || month < 1 || month > 12) {
		throw new Error(
			`Invalid month parameter: ${month}. Expected a number between 1-12.`,
		);
	}

	// Format date as YYYY-MM-01 (using provided month)
	const monthStr = month.toString().padStart(2, "0");
	const requestedTimePoint = `${year}-${monthStr}-01`;

	console.log(
		`Fetching climate data for year: ${year}, month: ${month}, variable: ${requestedVariableValue}, date: ${requestedTimePoint}`,
	);

	try {
		const apiUrl = `/api/cartesian?requested_time_point=${requestedTimePoint}&requested_variable_value=${requestedVariableValue}`;

		console.log(`Calling API: ${apiUrl}`);

		const response = await fetch(apiUrl, {
			headers: {
				Accept: "application/json",
			},
		});

		if (!response.ok) {
			throw new Error(
				`API request failed: ${response.status} ${response.statusText}`,
			);
		}

		const data = await response.json();

		// Check if response contains an error property
		if (data.error) {
			throw new Error(`API_ERROR: ${data.error}`);
		}

		return data.result["latitude, longitude, var_value"].map(
			([latitude, longitude, temperature]: [number, number, number]) => ({
				latitude, // "longitude": latitude,
				longitude, // "latitude": longitude,
				temperature,
			}),
		);
	} catch (error) {
		console.error("Error fetching climate data:", error);
		throw error;
	}
}
