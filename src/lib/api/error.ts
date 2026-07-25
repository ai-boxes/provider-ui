type ApiErrorDetails = {
  type: string
  message: string
}

export class ApiError extends Error {
  readonly status: number
  readonly type: string

  constructor(status: number, details: ApiErrorDetails) {
    super(details.message)
    this.name = 'ApiError'
    this.status = status
    this.type = details.type
  }
}

// The server message is usable for most failures. `statusMessages` covers the
// cases where a caller knows a more specific wording than the generic
// validation text the API returns.
export function apiErrorMessage(
  error: unknown,
  fallback: string,
  statusMessages: Record<number, string> = {},
): string {
  if (error instanceof ApiError) {
    return statusMessages[error.status] ?? error.message
  }

  return fallback
}
