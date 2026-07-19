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
