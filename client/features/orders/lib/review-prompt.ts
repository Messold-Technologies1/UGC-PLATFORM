const STORAGE_KEY = (orderId: string) => `order-review-prompt:${orderId}`;

export function markReviewPrompt(orderId: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY(orderId), "1");
  } catch {
    // Ignore quota / private-mode failures; the on-page review card still shows.
  }
}

export function consumeReviewPrompt(orderId: string): boolean {
  try {
    const key = STORAGE_KEY(orderId);
    if (sessionStorage.getItem(key) !== "1") return false;
    sessionStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
