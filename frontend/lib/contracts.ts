export type Health = { status: "ok" };

export type ApiError = {
  error: {
    code: "BACKEND_UNAVAILABLE" | "INVALID_BACKEND_RESPONSE" | "INVALID_CONFIGURATION";
    message: string;
  };
};

export function isHealth(value: unknown): value is Health {
  return typeof value === "object" && value !== null &&
    "status" in value && value.status === "ok";
}
