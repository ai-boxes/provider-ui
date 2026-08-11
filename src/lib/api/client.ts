import { ApiError } from '@/lib/api/error'

type Decoder<T> = (value: unknown) => T
export type HttpFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

export const sameOriginFetch: HttpFetcher = (input, init) =>
  fetch(input, { ...init, credentials: 'same-origin' })

export async function requestData<T>(
  input: RequestInfo | URL,
  decode: Decoder<T>,
  init?: RequestInit,
  fetcher: HttpFetcher = fetch,
): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/json')

  const response = await fetcher(input, { ...init, headers })
  const payload = await readJson(response)

  if (!response.ok) {
    throw apiError(response.status, payload)
  }

  if (!isRecord(payload) || !('data' in payload)) {
    throw new ApiError(response.status, {
      type: 'invalid_response_error',
      message: 'response body does not contain data',
    })
  }

  return decode(payload.data)
}

export async function requestEmpty(
  input: RequestInfo | URL,
  init?: RequestInit,
  fetcher: HttpFetcher = fetch,
): Promise<void> {
  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/json')

  const response = await fetcher(input, { ...init, headers })

  if (!response.ok) {
    throw apiError(response.status, await readJson(response))
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()

  if (text.length === 0) {
    return undefined
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new ApiError(response.status, {
      type: 'invalid_response_error',
      message: 'response body is not valid JSON',
    })
  }
}

function apiError(status: number, payload: unknown): ApiError {
  if (
    isRecord(payload) &&
    isRecord(payload.error) &&
    typeof payload.error.type === 'string' &&
    typeof payload.error.message === 'string'
  ) {
    return new ApiError(status, {
      type: payload.error.type,
      message: payload.error.message,
    })
  }

  return new ApiError(status, {
    type: 'api_error',
    message: 'request failed',
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
