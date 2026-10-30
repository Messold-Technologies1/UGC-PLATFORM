/*
 * Service worker: the only part of the app that runs with every tab closed,
 * which is the entire reason browser push exists here.
 *
 * Plain JavaScript on purpose — files under public/ are served verbatim and
 * are never touched by the Next build, so nothing here may use TypeScript,
 * JSX, imports from the app, or anything needing a bundler.
 *
 * Changing this file changes code that is already installed in people's
 * browsers. The browser re-fetches it on navigation and activates the new one
 * after the old is released, so keep the message contract below stable or an
 * older worker will mis-render a newer payload.
 *
 * Payload contract, written by WebPushTransport:
 *   { title, body, url, tag?, suppressIfVisible? }
 */

const FALLBACK_TITLE = "Collabry";
const ICON = "/logo.png";

self.addEventListener("install", () => {
  // Replace the previous worker immediately rather than waiting for every tab
  // to close; there is no cached app shell here whose version could mismatch.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Is a visible tab already showing this exact page?
 *
 * Used to stay quiet on the device someone is actually working on. The chat
 * notification is the case that matters: a desktop notification for the
 * message you are watching arrive is noise, while the same message should
 * still reach the phone in their pocket. Scoped per-device for free, because
 * each browser runs its own copy of this worker.
 */
async function isAlreadyLooking(url) {
  if (!url) return false;
  try {
    const windows = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });
    const target = new URL(url, self.location.origin);
    return windows.some((client) => {
      if (client.visibilityState !== "visible") return false;
      const open = new URL(client.url);
      // Path only: a notification about a chat should be suppressed whichever
      // query string the open tab happens to carry.
      return open.origin === target.origin && open.pathname === target.pathname;
    });
  } catch {
    // Better a duplicate notification than a swallowed one.
    return false;
  }
}

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let payload = {};
      try {
        payload = event.data ? event.data.json() : {};
      } catch {
        // A push that is not our JSON is not something to guess at, but the
        // browser will show its own generic notice if we show nothing at all,
        // so fall through with the defaults below.
        payload = {};
      }

      const title = payload.title || FALLBACK_TITLE;
      const url = payload.url || "/";

      if (payload.suppressIfVisible && (await isAlreadyLooking(url))) return;

      await self.registration.showNotification(title, {
        body: payload.body || "",
        icon: ICON,
        badge: ICON,
        // Same tag replaces rather than stacks, so a busy thread stays one
        // entry. renotify makes the replacement still alert, otherwise the
        // second message would arrive silently.
        tag: payload.tag || undefined,
        renotify: Boolean(payload.tag),
        data: { url },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const target = new URL(url, self.location.origin);
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // Reuse a tab that is already on this app rather than opening a third
      // copy of it. Navigating it also carries across whatever query the
      // notification pointed at.
      for (const client of windows) {
        if (new URL(client.url).origin !== target.origin) continue;
        await client.focus();
        if ("navigate" in client && client.url !== target.href) {
          await client.navigate(target.href).catch(() => undefined);
        }
        return;
      }

      await self.clients.openWindow(target.href);
    })(),
  );
});

/**
 * The browser rotated this subscription out from under us.
 *
 * Nothing here can reach the API: the worker has no auth cookie it can rely
 * on and no session. Re-subscribing is left to the app, which re-verifies on
 * every load (see use-push-subscription). This listener exists so the old
 * subscription is dropped promptly rather than lingering until its next
 * failed send.
 */
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        if (event.oldSubscription) await event.oldSubscription.unsubscribe();
      } catch {
        // Nothing to do; the server prunes on the 410 its next send gets.
      }
    })(),
  );
});
