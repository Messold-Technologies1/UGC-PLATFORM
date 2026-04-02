"use client";

import { useSyncExternalStore } from "react";

type ClientNavigationState = {
  pendingCount: number;
};

let state: ClientNavigationState = {
  pendingCount: 0,
};

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function setState(next: ClientNavigationState) {
  state = next;
  emit();
}

export function beginClientNavigation() {
  setState({
    pendingCount: state.pendingCount + 1,
  });
}

export function completeClientNavigation() {
  if (state.pendingCount === 0) return;
  setState({
    pendingCount: Math.max(0, state.pendingCount - 1),
  });
}

export function resetClientNavigation() {
  if (state.pendingCount === 0) return;
  setState({
    pendingCount: 0,
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function useClientNavigationState() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
