"use client";

import { useSyncExternalStore } from "react";

/**
 * Hydration-safe mounted flag — true only after the client has hydrated.
 * (Server snapshot is false, client snapshot is true.)
 */
const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function useMounted(): boolean {
  return useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
}
