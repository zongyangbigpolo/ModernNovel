/**
 * Lightweight optimistic-concurrency guard for chapter autosave.
 *
 * The client sends back the `updatedAt` token it last saw for a chapter. If the
 * stored row has moved on since then, someone else (or another tab) saved in the
 * meantime and blindly writing would silently clobber their work — so the write
 * is rejected with a conflict instead.
 *
 * The token is the chapter's `updatedAt` serialized as an ISO string. Chapter
 * timestamps are stored at one-second resolution (Drizzle `timestamp` mode), so
 * `secondResolutionNow()` is used when saving to guarantee the token we hand back
 * round-trips to the exact value a later read would produce.
 */

/**
 * Returns true when a write carrying `baseUpdatedAt` would overwrite a newer
 * version of the row. A missing token disables the guard (legacy callers and
 * best-effort flush-on-exit writes), preserving prior last-write-wins behaviour.
 */
export function isStaleContentWrite(
  baseUpdatedAt: string | undefined,
  currentUpdatedAt: string
): boolean {
  if (!baseUpdatedAt) {
    return false
  }
  return baseUpdatedAt !== currentUpdatedAt
}

/**
 * Current time floored to whole seconds, matching how `timestamp`-mode columns
 * persist and read back. Using this as the stored `updatedAt` keeps the
 * `savedAt` token returned to the client identical to the value a subsequent
 * GET will report, so back-to-back saves from the same client never falsely
 * trip the staleness guard.
 */
export function secondResolutionNow(): Date {
  return new Date(Math.floor(Date.now() / 1000) * 1000)
}
