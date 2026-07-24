"use client";

import { useSyncExternalStore } from "react";
import {
  getAdminState,
  getServerAdminState,
  subscribeAdminStore,
  type AdminStoreState,
} from "@/lib/adminStore";

export function useAdminStore(): AdminStoreState {
  return useSyncExternalStore(subscribeAdminStore, getAdminState, getServerAdminState);
}
