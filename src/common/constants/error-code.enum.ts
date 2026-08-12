/**
 * Machine-readable error codes returned as `code` in the error body.
 *
 * These exist for errors the CLIENT must branch on — never for display (that is
 * what `message` is for). Add one only when the frontend has to take a different
 * action, not merely show different text.
 *
 * Why this is not the `error` field: `error` is the HTTP label
 * (`Unauthorized`, `Conflict`, ...) per standard-api-responses. Overloading it
 * would break every consumer that reads it as the status name.
 */
export enum ErrorCode {
  /**
   * The PIN (actor) token is missing/expired/invalid — the *secondary* identity.
   * The session itself may be perfectly fine.
   *
   * Client contract: do NOT refresh the session and do NOT redirect to /login.
   * Re-prompt for the PIN and let the user retry in place.
   */
  ActorTokenInvalid = 'ACTOR_TOKEN_INVALID',
}
