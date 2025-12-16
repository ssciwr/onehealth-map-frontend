const DEFAULT_NUTS_API_BASE = "http://127.0.0.1:8000";

const normalizeBaseUrl = (value?: string): string => {
	if (value && value.trim().length > 0) {
		const trimmed = value.trim();
		return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
	}

	return DEFAULT_NUTS_API_BASE;
};

export const getNutsApiBaseUrl = (): string =>
	normalizeBaseUrl(import.meta.env.VITE_NUTS_API_BASE);

export const buildNutsApiUrl = (
	path: string,
	queryParams?: Record<string, string | undefined>,
): string => {
	const baseUrl = getNutsApiBaseUrl();
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;

	const queryString = queryParams
		? Object.entries(queryParams)
				.filter(([, value]) => value !== undefined && value !== "")
				.map(
					([key, value]) =>
						`${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`,
				)
				.join("&")
		: "";

	return `${baseUrl}${normalizedPath}${queryString ? `?${queryString}` : ""}`;
};
