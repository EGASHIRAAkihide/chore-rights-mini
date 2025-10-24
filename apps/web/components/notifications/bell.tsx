'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Bell } from 'lucide-react';

type NotificationItem = {
  id: string;
  message: string;
  createdAt: string;
};

type ApiNotificationPayload = {
  id?: string;
  message?: string;
  createdAt?: string;
  kind?: string;
  meta?: Record<string, unknown> | null;
};

type NotificationsResponse = {
  items?: ApiNotificationPayload[];
  unreadCount?: number;
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function resolveMessage(input: ApiNotificationPayload | undefined): string {
  if (!input) {
    return 'Notification received';
  }
  if (input.message && input.message.trim().length > 0) {
    return input.message;
  }
  if (input.kind === 'license.request') {
    return 'New license request received';
  }
  if (input.kind === 'license.approve') {
    return 'License request approved';
  }
  if (input.kind === 'work.register') {
    return 'Choreography registered successfully';
  }
  if (input.kind === 'receipt.distributed') {
    return 'Payout ready to review';
  }
  return 'Notification received';
}

function formatRelativeTime(value: string): string {
  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) {
    return '';
  }

  const now = Date.now();
  const diff = Math.max(0, now - createdAt.getTime());
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return 'just now';
  }
  if (diff < hour) {
    const mins = Math.round(diff / minute);
    return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  }
  if (diff < day) {
    const hours = Math.round(diff / hour);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  const days = Math.round(diff / day);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function NotificationBell(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    async function fetchNotifications() {
      try {
        const response = await fetch('/api/notifications', { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const json = (await response.json()) as NotificationsResponse | null;
        const incoming = Array.isArray(json?.items) ? json?.items ?? [] : [];

        if (!isActive) {
          return;
        }

        const mapped = incoming.map((item) => ({
          id: item?.id ?? crypto.randomUUID(),
          message: resolveMessage(item),
          createdAt: item?.createdAt ?? new Date().toISOString(),
        }));

        setItems(mapped);
        setError(null);
      } catch (fetchError) {
        if (isAbortError(fetchError)) {
          return;
        }
        console.error('Failed to load notifications', fetchError);
        if (isActive) {
          setError('Unable to load notifications.');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void fetchNotifications();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, []);

  const unreadCount = useMemo(() => {
    return items.length;
  }, [items]);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="Notifications"
        aria-expanded={isOpen}
        data-testid="notification-bell"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-brand hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          className="absolute right-0 z-10 mt-3 w-80 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-xl"
          role="dialog"
          aria-label="Notifications list"
          data-testid="notification-list"
        >
          <header className="mb-3 flex items-center justify-between">
            <span className="font-semibold text-slate-800">Notifications</span>
            <button
              type="button"
              className="text-xs font-medium text-brand hover:underline"
              onClick={() => setItems([])}
            >
              Clear all
            </button>
          </header>

          {loading ? (
            <p className="text-xs text-slate-500">Loading…</p>
          ) : error ? (
            <p className="text-xs text-rose-600">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-xs text-slate-500" data-testid="notification-empty">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul className="grid gap-3">
              {items.map((item) => (
                <li key={item.id} className="rounded-lg border border-slate-100 p-3">
                  <p className="font-medium text-slate-800">{item.message}</p>
                  <p className="text-xs text-slate-500">{formatRelativeTime(item.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
