import { describe, expect, it } from "vitest";
import {
  deriveFulfilment,
  productFormToApiPayload,
  websiteState,
  type ProductPayloadInput,
} from "@/lib/productPayload";
import { productItemCode } from "@/lib/apiMappers";

const base: ProductPayloadInput = {
  key: "games:fc-26",
  name: "EA Sports FC 26",
  category: "games",
  brand: "PlayStation",
  price: "4999",
  strike: "5999",
  taxInclusive: true,
  stock: 12,
  onWebsite: true,
  image: "",
  fulfilment: { type: "physical", releaseAt: "", reservationAmount: "" },
};

describe("what the product form actually sends", () => {
  /**
   * The form had editable "SKU" and "Edition" text inputs and the payload
   * builder sent neither. The owner typed the code off the box in his hand,
   * pressed save, and read "Product saved" in green over a request that never
   * carried the value — there is no `sku` or `edition` column to carry it to.
   *
   * The inputs are gone. This pins the payload so nobody re-adds a field the
   * server cannot store and calls it saved.
   */
  it("carries no sku and no edition, because there is nowhere to put them", () => {
    const payload = productFormToApiPayload(base);
    expect(payload).not.toHaveProperty("sku");
    expect(payload).not.toHaveProperty("edition");
  });

  /**
   * "Sold out" was the third option in the status dropdown and it saved
   * `active: false` — which does not mark anything sold out, it takes the
   * product off the website entirely. Customers could not see it, could not ask
   * for it, could not find it in search. The owner's word for "I've run out"
   * silently meant "delete this from my shop".
   *
   * Only two states are now choosable, and the button says which one it does.
   */
  it("only ever writes live or hidden — sold out is not a choice", () => {
    expect(productFormToApiPayload({ ...base, onWebsite: true }).active).toBe(true);
    expect(productFormToApiPayload({ ...base, onWebsite: false }).active).toBe(false);
  });

  it("reports sold out from the shelf, not from a dropdown", () => {
    expect(websiteState({ active: true, stock: 12 })).toBe("live");
    expect(websiteState({ active: true, stock: 0 })).toBe("sold_out");
    // Hidden wins: a product off the website is not "sold out", it is not there.
    expect(websiteState({ active: false, stock: 0 })).toBe("hidden");
  });

  /**
   * A code-delivered product's stock is the number of unsold codes.
   * OrderService::assertAvailable counts vault rows and ignores products.stock
   * completely — so the list showing that column meant a product could read
   * "30 in stock" while refusing every order placed for it.
   */
  it("calls a code product sold out when the vault is empty, whatever the column says", () => {
    const digital = { active: true, stock: 30, fulfilmentType: "digital" };
    expect(websiteState({ ...digital, codeCount: 0 })).toBe("sold_out");
    expect(websiteState({ ...digital, codeCount: 4 })).toBe("live");
  });

  it("never calls an unreleased pre-order sold out", () => {
    expect(websiteState({ active: true, stock: 0, fulfilmentType: "preorder" })).toBe("live");
  });

  it("sends the stock it was given and the price as a whole number", () => {
    const payload = productFormToApiPayload({ ...base, price: "₹4,999", strike: "" });
    expect(payload.price).toBe(4999);
    expect(payload.mrp).toBeNull();
    expect(payload.stock).toBe(12);
  });

  /** A stray minus used to be stripped, so "-500" saved as 500. */
  it("refuses a negative price rather than flipping its sign", () => {
    expect(productFormToApiPayload({ ...base, price: "-500" }).price).toBe(0);
  });
});

describe("pre-order is a date, not a type", () => {
  /**
   * All seven pre-orders in the catalogue have release_at = NULL: the two fields
   * that make a pre-order a pre-order sat behind a radio card labelled with a
   * noun the owner had to accept first, and nobody ever got that far. He types
   * the date his distributor gave him; the shop works out the rest.
   */
  it("a date still ahead of us makes it a pre-order", () => {
    const f = deriveFulfilment(
      { delivery: "physical", releaseAt: "2026-11-19", advance: "1000" },
      "2026-07-31",
    );
    expect(f.type).toBe("preorder");
    expect(f.releaseAt).toBe("2026-11-19");
    expect(f.reservationAmount).toBe("1000");
  });

  /**
   * The morning the title ships it stops being a pre-order, without anyone
   * remembering to change a type. Without this, scopePreorder() would list a
   * released game as unreleased forever.
   */
  it("the day it arrives it is just a product on the shelf", () => {
    const f = deriveFulfilment(
      { delivery: "physical", releaseAt: "2026-07-31", advance: "1000" },
      "2026-07-31",
    );
    expect(f.type).toBe("physical");
    // And the stale date does not survive, so the storefront cannot keep
    // honouring an advance for something already in the box.
    expect(f.releaseAt).toBe("");
    expect(f.reservationAmount).toBe("");
  });

  it("code by email wins over any date", () => {
    const f = deriveFulfilment(
      { delivery: "digital", releaseAt: "2026-11-19", advance: "500" },
      "2026-07-31",
    );
    expect(f.type).toBe("digital");
  });

  it("puts release date and advance on the wire only for a real pre-order", () => {
    const preorder = productFormToApiPayload({
      ...base,
      fulfilment: { type: "preorder", releaseAt: "2026-11-19", reservationAmount: "1000" },
    });
    expect(preorder.release_at).toBe("2026-11-19");
    expect(preorder.reservation_amount).toBe(1000);

    const plain = productFormToApiPayload(base);
    expect(plain.release_at).toBeNull();
    expect(plain.reservation_amount).toBeNull();
  });
});

describe("the item code is the one on the shelf label", () => {
  /**
   * The list printed `p.key` under the heading "SKU": a 55-character URL slug
   * that wrapped over five lines and forced 130px rows, so 298 products were
   * sixty screens of scrolling. All 298 already carry the real code in the
   * payload the admin was fetching anyway.
   */
  it("reads meta.variants[0].sku", () => {
    expect(productItemCode({ meta: { variants: [{ sku: "GAMCXBOX249" }] } })).toBe("GAMCXBOX249");
  });

  /**
   * A product he creates here has no shelf code yet. Falling back to the web
   * address would print exactly the string this change exists to remove.
   */
  it("says nothing rather than printing the web address instead", () => {
    expect(productItemCode({ meta: null })).toBe("");
    expect(productItemCode({ meta: { variants: [] } })).toBe("");
    expect(productItemCode({ meta: { variants: [{ sku: "  " }] } })).toBe("");
  });
});

describe("also show in", () => {
  /**
   * `categories` is `sometimes` on the server: absent is not the same as empty.
   * A screen that never asked the question must not send [] and wipe a
   * hand-curated sale.
   */
  it("is omitted entirely when the screen did not ask", () => {
    expect(productFormToApiPayload(base)).not.toHaveProperty("categories");
    expect(productFormToApiPayload({ ...base, alsoIn: ["holiday-sale"] }).categories).toEqual([
      "holiday-sale",
    ]);
  });
});
