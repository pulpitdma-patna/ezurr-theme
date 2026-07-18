"use client";

import { useSyncExternalStore } from "react";
import { getStaffRole, setStaffRole, type StaffRole } from "@/lib/adminPermissions";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("ezurr-staff-role", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("ezurr-staff-role", onChange);
  };
}

export function useStaffRole() {
  const role = useSyncExternalStore(subscribe, getStaffRole, () => "owner" as StaffRole);
  return { role, setRole: setStaffRole };
}
