"use client";

import { useEffect, useState } from "react";
import { SectionHeading } from "@/components/home/SectionHeading";
import { useAccountStore } from "@/hooks/useAccountStore";
import { useAuthSession } from "@/hooks/useAuthSession";
import {
  addAddress,
  removeAddress,
  setDefaultAddress,
  type AccountAddress,
} from "@/lib/accountStore";
import { formatMobileDisplay, normalizeMobile } from "@/lib/auth";

export default function AddressesPage() {
  const account = useAccountStore();
  const { session } = useAuthSession();
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("Home");
  const [fullName, setFullName] = useState(session?.name ?? "");
  const [mobile, setMobile] = useState(session?.mobile ?? "");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

  useEffect(() => {
    if (session) {
      setFullName(session.name);
      setMobile(session.mobile);
    }
  }, [session]);

  return (
    <div>
      <SectionHeading
        titleAs="h1"
        eyebrow="Delivery details"
        title="Saved addresses."
        description="Manage where your games and gear should arrive."
        controls={
          <button
            type="button"
            onClick={() => setShowForm((value) => !value)}
            className="min-h-11 rounded-full bg-[#1D1D1F] px-6 text-sm font-semibold text-white"
          >
            {showForm ? "Cancel" : "Add address"}
          </button>
        }
      />

      {showForm ? (
        <form
          className="mt-2 rounded-2xl border border-black/[0.07] bg-[#F8F8FA] p-5 sm:p-7"
          onSubmit={(event) => {
            event.preventDefault();
            if (!fullName.trim() || !line1.trim() || !city.trim() || pincode.length < 6) return;
            addAddress({
              label: label.trim() || "Home",
              fullName: fullName.trim(),
              mobile: normalizeMobile(mobile) || session?.mobile || "",
              line1: line1.trim(),
              city: city.trim(),
              state: state.trim() || "—",
              pincode: pincode.trim(),
              isDefault: account.addresses.length === 0,
            });
            setShowForm(false);
            setLine1("");
            setCity("");
            setPincode("");
          }}
        >
          <h2 className="text-xl font-semibold tracking-[-0.03em]">New delivery address</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Label" value={label} onChange={setLabel} />
            <Field label="Full name" value={fullName} onChange={setFullName} />
            <Field label="Mobile number" value={mobile} onChange={setMobile} inputMode="numeric" />
            <Field label="PIN code" value={pincode} onChange={setPincode} inputMode="numeric" />
            <Field label="City" value={city} onChange={setCity} />
            <Field label="State" value={state} onChange={setState} />
            <div className="sm:col-span-2">
              <Field label="House / Flat / Building" value={line1} onChange={setLine1} />
            </div>
          </div>
          <button
            type="submit"
            className="mt-6 min-h-12 rounded-full bg-[#1D1D1F] px-6 text-sm font-semibold text-white"
          >
            Save address
          </button>
        </form>
      ) : null}

      {account.addresses.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-black/[0.1] bg-[#F7F7F8] px-5 py-10 text-center text-sm text-[#6E6E73]">
          No saved addresses yet. Add one for faster checkout.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {account.addresses.map((address) => (
            <AddressCard key={address.id} address={address} />
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#424245]">{label}</span>
      <input
        id={id}
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-14 w-full rounded-2xl border border-black/10 bg-white px-4 outline-none focus:border-[#1D1D1F]"
      />
    </label>
  );
}

function AddressCard({ address }: { address: AccountAddress }) {
  return (
    <article className="rounded-2xl border border-black/[0.07] p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{address.label}</span>
          {address.isDefault ? (
            <span className="rounded-full bg-[#EAF6ED] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#2D6B3C]">
              Default
            </span>
          ) : null}
        </div>
      </div>
      <address className="mt-5 not-italic text-sm leading-7 text-[#6E6E73]">
        <div>{address.fullName}</div>
        <div>{address.line1}</div>
        <div>
          {address.city}, {address.state} {address.pincode}
        </div>
        <div>{formatMobileDisplay(address.mobile)}</div>
      </address>
      <div className="mt-5 flex gap-4 border-t border-black/[0.06] pt-4">
        {!address.isDefault ? (
          <button
            type="button"
            onClick={() => setDefaultAddress(address.id)}
            className="text-xs font-semibold text-[#424245]"
          >
            Set as default
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => removeAddress(address.id)}
          className="text-xs font-semibold text-[#B42318]"
        >
          Remove
        </button>
      </div>
    </article>
  );
}
