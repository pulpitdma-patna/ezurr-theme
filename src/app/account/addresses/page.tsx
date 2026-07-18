"use client";

import { useState } from "react";
import { SectionHeading } from "@/components/home/SectionHeading";

export default function AddressesPage() {
  const [showForm, setShowForm] = useState(false);

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

      {showForm && (
        <form
          className="mt-2 rounded-[28px] border border-black/[0.07] bg-[#F8F8FA] p-5 sm:p-7"
          onSubmit={(event) => {
            event.preventDefault();
            setShowForm(false);
          }}
        >
          <h2 className="text-xl font-semibold tracking-[-0.03em]">New delivery address</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              "Full name",
              "Mobile number",
              "PIN code",
              "City",
              "State",
              "House / Flat / Building",
            ].map((label, index) => (
              <label key={label} className={index === 5 ? "sm:col-span-2" : ""}>
                <span className="mb-2 block text-sm font-semibold text-[#424245]">{label}</span>
                <input
                  inputMode={
                    label.includes("Mobile") || label.includes("PIN") ? "numeric" : undefined
                  }
                  className="min-h-14 w-full rounded-2xl border border-black/10 bg-white px-4 outline-none focus:border-[#1D1D1F]"
                />
              </label>
            ))}
          </div>
          <button
            type="submit"
            className="mt-6 min-h-12 rounded-full bg-[#1D1D1F] px-6 text-sm font-semibold text-white"
          >
            Save address
          </button>
        </form>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <AddressCard
          label="Home"
          defaultAddress
          address={[
            "Arjun Patel",
            "204, Orchid Residency",
            "Boring Road, Patna",
            "Bihar 800001",
            "+91 98765 43210",
          ]}
        />
        <AddressCard
          label="Office"
          address={[
            "Arjun Patel",
            "Ezurr Commerce Pvt. Ltd.",
            "Fraser Road Area, Patna",
            "Bihar 800001",
            "+91 98765 43210",
          ]}
        />
      </div>
    </div>
  );
}

function AddressCard({
  label,
  address,
  defaultAddress = false,
}: {
  label: string;
  address: string[];
  defaultAddress?: boolean;
}) {
  return (
    <article className="rounded-[26px] border border-black/[0.07] p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{label}</span>
          {defaultAddress && (
            <span className="rounded-full bg-[#EAF6ED] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#2D6B3C]">
              Default
            </span>
          )}
        </div>
        <button type="button" className="text-sm font-semibold text-[#6E6E73]">
          Edit
        </button>
      </div>
      <address className="mt-5 not-italic text-sm leading-7 text-[#6E6E73]">
        {address.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </address>
      <div className="mt-5 flex gap-4 border-t border-black/[0.06] pt-4">
        {!defaultAddress && (
          <button type="button" className="text-xs font-semibold text-[#424245]">
            Set as default
          </button>
        )}
        <button type="button" className="text-xs font-semibold text-[#B42318]">
          Remove
        </button>
      </div>
    </article>
  );
}
