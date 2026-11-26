export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, message: string, code = "API_ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "include",
  });

  const json = await response.json().catch(() => null);

  if (!response.ok || !json?.success) {
    const message =
      json?.error?.message || `Request failed with status ${response.status}`;
    const code = json?.error?.code || "API_ERROR";
    throw new ApiError(response.status, message, code);
  }

  return json.data as T;
}
