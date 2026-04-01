"use client";

import { useSyncExternalStore } from "react";
import type { WorkspaceRole } from "@/features/auth/hooks/use-me-query";

type WorkspaceSwitchState = {
  isSwitching: boolean;
  targetRole: WorkspaceRole | null;
};

let state: WorkspaceSwitchState = {
  isSwitching: false,
  targetRole: null,
};

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function setWorkspaceSwitchState(next: WorkspaceSwitchState) {
  state = next;
  emit();
}

export function clearWorkspaceSwitchState() {
  setWorkspaceSwitchState({
    isSwitching: false,
    targetRole: null,
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function useWorkspaceSwitchState() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
