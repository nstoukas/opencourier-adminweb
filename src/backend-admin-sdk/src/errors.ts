import { ApiException, ApiExceptionCodeEnum } from "./models";

export const ErrorCode = ApiExceptionCodeEnum
export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];

export class ApiError extends Error implements ApiException {
  readonly code: ErrorCode;
  readonly message: string;
  readonly statusCode: number;
  // Only on a bill's 409 (spec 0036, AC-6): the ids of the charges another bill already covers.
  readonly alreadyBilled?: string[];

  constructor(code: ErrorCode, message: string, statusCode: number, alreadyBilled?: string[]) {
    super(message)
    this.code = code
    this.message = message
    this.statusCode = statusCode
    if (alreadyBilled) this.alreadyBilled = alreadyBilled
  }
}
