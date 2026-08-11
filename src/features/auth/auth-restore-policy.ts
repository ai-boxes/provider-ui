export function authRestoreFailureStatus(
  error: unknown,
): 'anonymous' | 'recovery_error' {
  return isResponseStatus(error, 401) ? 'anonymous' : 'recovery_error'
}

function isResponseStatus(error: unknown, status: number): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    error.status === status
  )
}
