"use client";

import games from "@/data/games.json";
import accessories from "@/data/accessories.json";
import type { CatalogProduct } from "@/lib/types";
import { getCatalogProductKey } from "@/lib/productKey";

const STORAGE_KEY = "ezurr_account_store";

export type AccountAddress = {
  id: string;
  label: string;
  fullName: string;
  mobile: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

export type AccountNotifyPrefs = {
  email: boolean;
  whatsapp: boolean;
  marketing: boolean;
};

export type PointsEntry = {
  id: string;
  label: string;
  delta: number;
  at: string;
};

export type AccountStoreState = {
  wishlistKeys: string[];
  addresses: AccountAddress[];
  dob: string;
  gender: string;
  notify: AccountNotifyPrefs;
  points: number;
  pointsLedger: PointsEntry[];
};

const catalog: CatalogProduct[] = [
  ...(games as CatalogProduct[]),
  ...(accessories as CatalogProduct[]),
];

function seedWishlist(): string[] {
  return catalog.slice(0, 6).map((product, index) => getCatalogProductKey(product, index));
}

function seedAddresses(): AccountAddress[] {
  return [
    {
      id: "addr-home",
      label: "Home",
      fullName: "Player",
      mobile: "9876543210",
      line1: "204, Orchid Residency, Boring Road",
      city: "Patna",
      state: "Bihar",
      pincode: "800001",
      isDefault: true,
    },
    {
      id: "addr-office",
      label: "Office",
      fullName: "Player",
      mobile: "9876543210",
      line1: "Fraser Road Area",
      city: "Patna",
      state: "Bihar",
      pincode: "800001",
      isDefault: false,
    },
  ];
}

function seedLedger(): PointsEntry[] {
  return [
    {
      id: "pt-1",
      label: "Welcome bonus",
      delta: 500,
      at: "2026-06-01T10:00:00.000Z",
    },
    {
      id: "pt-2",
      label: "Order EZX24071891",
      delta: 640,
      at: "2026-07-15T12:00:00.000Z",
    },
    {
      id: "pt-3",
      label: "Redeemed at checkout",
      delta: -100,
      at: "2026-07-16T09:00:00.000Z",
    },
  ];
}

function defaultState(): AccountStoreState {
  return {
    wishlistKeys: seedWishlist(),
    addresses: seedAddresses(),
    dob: "1995-08-18",
    gender: "Prefer not to say",
    notify: { email: true, whatsapp: true, marketing: false },
    points: 1040,
    pointsLedger: seedLedger(),
  };
}

let memory: AccountStoreState | null = null;
const listeners = new Set<() => void>();

// Stable seed for SSR / hydration (never reads localStorage).
const SERVER_SNAPSHOT: AccountStoreState = defaultState();
export function getServerAccountState(): AccountStoreState {
  return SERVER_SNAPSHOT;
}

function read(): AccountStoreState {
  if (typeof window === "undefined") return defaultState();
  if (memory) return memory;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      memory = defaultState();
      return memory;
    }
    const parsed = JSON.parse(raw) as Partial<AccountStoreState>;
    memory = { ...defaultState(), ...parsed };
    return memory;
  } catch {
    memory = defaultState();
    return memory;
  }
}

function write(next: AccountStoreState) {
  memory = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event("ezurr-account-change"));
  }
  listeners.forEach((l) => l());
}

export function getAccountState(): AccountStoreState {
  return read();
}

export function subscribeAccountStore(listener: () => void) {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    const onStorage = () => {
      memory = null;
      listener();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("ezurr-account-change", listener);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("ezurr-account-change", listener);
    };
  }
  return () => listeners.delete(listener);
}

function patch(partial: Partial<AccountStoreState>) {
  write({ ...read(), ...partial });
}

export function toggleWishlistKey(key: string) {
  const state = read();
  const has = state.wishlistKeys.includes(key);
  patch({
    wishlistKeys: has
      ? state.wishlistKeys.filter((k) => k !== key)
      : [key, ...state.wishlistKeys],
  });
  return !has;
}

export function removeWishlistKey(key: string) {
  const state = read();
  patch({ wishlistKeys: state.wishlistKeys.filter((k) => k !== key) });
}

export function isWishlisted(key: string) {
  return read().wishlistKeys.includes(key);
}

export function getWishlistProducts(): CatalogProduct[] {
  const keys = new Set(read().wishlistKeys);
  return catalog.filter((product, index) => keys.has(getCatalogProductKey(product, index)));
}

export function addAddress(input: Omit<AccountAddress, "id">) {
  const state = read();
  const address: AccountAddress = { ...input, id: `addr-${Date.now()}` };
  const addresses = input.isDefault
    ? [address, ...state.addresses.map((a) => ({ ...a, isDefault: false }))]
    : [address, ...state.addresses];
  patch({ addresses });
  return address;
}

export function removeAddress(id: string) {
  const state = read();
  patch({ addresses: state.addresses.filter((a) => a.id !== id) });
}

export function setDefaultAddress(id: string) {
  const state = read();
  patch({
    addresses: state.addresses.map((a) => ({ ...a, isDefault: a.id === id })),
  });
}

export function updateProfileExtras(input: {
  dob?: string;
  gender?: string;
  notify?: Partial<AccountNotifyPrefs>;
}) {
  const state = read();
  patch({
    dob: input.dob ?? state.dob,
    gender: input.gender ?? state.gender,
    notify: input.notify ? { ...state.notify, ...input.notify } : state.notify,
  });
}

export function catalogKeyForProduct(product: CatalogProduct, indexHint = 0) {
  const idx = catalog.findIndex(
    (row) => row.name === product.name && row.img === product.img,
  );
  return getCatalogProductKey(product, idx >= 0 ? idx : indexHint);
}
