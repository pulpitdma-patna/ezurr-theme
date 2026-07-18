"use client";

import { useSyncExternalStore } from "react";
import {
  getAccountState,
  subscribeAccountStore,
  type AccountStoreState,
} from "@/lib/accountStore";

const serverSnapshot = getAccountState();

export function useAccountStore(): AccountStoreState {
  return useSyncExternalStore(subscribeAccountStore, getAccountState, () => serverSnapshot);
}
