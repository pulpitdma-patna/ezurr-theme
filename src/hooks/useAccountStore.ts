"use client";

import { useSyncExternalStore } from "react";
import {
  getAccountState,
  getServerAccountState,
  subscribeAccountStore,
  type AccountStoreState,
} from "@/lib/accountStore";

export function useAccountStore(): AccountStoreState {
  return useSyncExternalStore(subscribeAccountStore, getAccountState, getServerAccountState);
}
