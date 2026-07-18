"use client";

import { useSyncExternalStore } from "react";
import {
  getAdminState,
  subscribeAdminStore,
  type AdminStoreState,
} from "@/lib/adminStore";

const serverSnapshot: AdminStoreState = getAdminState();

export function useAdminStore(): AdminStoreState {
  return useSyncExternalStore(subscribeAdminStore, getAdminState, () => serverSnapshot);
}
