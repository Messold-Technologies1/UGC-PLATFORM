"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-provider";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<AppNotification, "id" | "isRead" | "createdAt">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage when user changes
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setIsLoaded(true);
      return;
    }

    try {
      const stored = localStorage.getItem(`notifications_${user.id}`);
      if (stored) {
        setNotifications(JSON.parse(stored));
      } else {
        setNotifications([]);
      }
    } catch (e) {
      console.error("Failed to load notifications", e);
      setNotifications([]);
    }
    setIsLoaded(true);
  }, [user]);

  // Save to local storage whenever notifications change
  useEffect(() => {
    if (!user || !isLoaded) return;
    try {
      localStorage.setItem(`notifications_${user.id}`, JSON.stringify(notifications));
    } catch (e) {
      console.error("Failed to save notifications", e);
    }
  }, [notifications, user, isLoaded]);

  const addNotification = useCallback(
    (notification: Omit<AppNotification, "id" | "isRead" | "createdAt">) => {
      setNotifications((prev) => {
        const newNotification: AppNotification = {
          ...notification,
          id: crypto.randomUUID(),
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        // Keep only the latest 100 notifications to prevent localstorage bloat
        return [newNotification, ...prev].slice(0, 100);
      });
    },
    []
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
}
