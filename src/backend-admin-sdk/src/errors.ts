import { ApiException, ApiExceptionCodeEnum } from "./models";

export const ErrorCode = ApiExceptionCodeEnum
export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];

export class ApiError extends Error implements ApiException {
  readonly code: ErrorCode;
  readonly message: string;
  readonly statusCode: number;
  // Only on a bill's 409 (spec 0036, AC-6): the ids of the charges another bill already covers.
  readonly alreadyBilled?: string[];
  // Only on BOX_OVER_CAPACITY (spec 0043, AC-6): what the rider holds and what the order takes, out of 100.
  readonly heldUnits?: number;
  readonly deliveryUnits?: number;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number,
    alreadyBilled?: string[],
    boxUnits?: { heldUnits: number; deliveryUnits: number },
  ) {
    super(message)
    this.code = code
    this.message = message
    this.statusCode = statusCode
    if (alreadyBilled) this.alreadyBilled = alreadyBilled
    if (boxUnits) {
      this.heldUnits = boxUnits.heldUnits
      this.deliveryUnits = boxUnits.deliveryUnits
    }
  }
}
