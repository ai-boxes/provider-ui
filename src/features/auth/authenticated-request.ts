import { authenticatedFetch } from '@/features/auth/auth-session'
import { requestData, requestEmpty } from '@/lib/api/client'

type Decoder<T> = (value: unknown) => T

export function requestAuthenticatedData<T>(
  input: RequestInfo | URL,
  decode: Decoder<T>,
  init?: RequestInit,
): Promise<T> {
  return requestData(input, decode, init, authenticatedFetch)
}

export function requestAuthenticatedEmpty(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<void> {
  return requestEmpty(input, init, authenticatedFetch)
}
