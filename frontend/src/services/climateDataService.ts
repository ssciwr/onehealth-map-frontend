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
	requestedVariableValue = "t2m",
	_outputFormat?: string[],
): Promise<ClimateDataPoint[]> {
	await delay(100 + Math.random() * 300);

	// Format date as YYYY-01-01 (always January 1st)
	const requestedTimePoint = `${year}-01-01`;

	console.log(
		`Fetching climate data for year: ${year}, variable: ${requestedVariableValue}, date: ${requestedTimePoint}`,
	);

	try {
		// Get API URL from environment variable, fallback to localhost
		const apiBaseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
		const apiUrl = `${apiBaseUrl}/cartesian?requested_time_point=${requestedTimePoint}&requested_variable_value=${requestedVariableValue}`;

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
				latitude,
				longitude,
				temperature,
			}),
		);
	} catch (error) {
		console.error("Error fetching climate data:", error);
		throw error;
	}
}
