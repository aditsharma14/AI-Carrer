// Normalizes the backend's error shape ({ code, message, details, requestId },
// see backend/src/middleware/error.middleware.js) into one predictable object
// regardless of where the failure happened (network, validation, server).
export class ApiError extends Error {
  constructor({ code, message, details, requestId, status }) {
    super(message || 'Something went wrong');
    this.code = code || 'UNKNOWN';
    this.details = details;
    this.requestId = requestId;
    this.status = status;
  }
}

export function toApiError(error) {
  if (error.response) {
    const { data, status } = error.response;
    return new ApiError({
      code: data?.code,
      message: data?.message,
      details: data?.details,
      requestId: data?.requestId,
      status,
    });
  }
  return new ApiError({ code: 'NETWORK_ERROR', message: 'Could not reach the server' });
}
