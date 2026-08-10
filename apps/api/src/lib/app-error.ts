export class AppError extends Error {
  readonly code: string
  readonly statusCode: number

  constructor(statusCode: number, code: string, message: string) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
  }
}
