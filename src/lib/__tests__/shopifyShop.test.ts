import { describe, it, expect } from "vitest";
import { normalizeShopDomain } from "@/lib/shopifyShop";

/** The allowlist the API validates the shop address against. */
const API_ACCEPTS = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

describe("normalizeShopDomain", () => {
  it("accepts the shop name on its own", () => {
    expect(normalizeShopDomain("mystore")).toBe("mystore.myshopify.com");
    expect(normalizeShopDomain("my-store-99")).toBe("my-store-99.myshopify.com");
  });

  it("accepts the full address unchanged", () => {
    expect(normalizeShopDomain("mystore.myshopify.com")).toBe("mystore.myshopify.com");
  });

  it("accepts what the browser's address bar gives him", () => {
    expect(normalizeShopDomain("https://mystore.myshopify.com")).toBe("mystore.myshopify.com");
    expect(normalizeShopDomain("http://mystore.myshopify.com/")).toBe("mystore.myshopify.com");
    expect(normalizeShopDomain("https://mystore.myshopify.com/admin/products?page=2")).toBe(
      "mystore.myshopify.com",
    );
    expect(normalizeShopDomain("//mystore.myshopify.com")).toBe("mystore.myshopify.com");
  });

  it("reads the shop name out of the newer Shopify admin address", () => {
    expect(normalizeShopDomain("https://admin.shopify.com/store/mystore")).toBe(
      "mystore.myshopify.com",
    );
    expect(normalizeShopDomain("admin.shopify.com/store/mystore/products/12345")).toBe(
      "mystore.myshopify.com",
    );
  });

  it("forgives the way the value gets typed and pasted", () => {
    expect(normalizeShopDomain("  MyStore  ")).toBe("mystore.myshopify.com");
    expect(normalizeShopDomain("HTTPS://MyStore.MyShopify.COM/admin")).toBe(
      "mystore.myshopify.com",
    );
    expect(normalizeShopDomain("mystore.myshopify.com.")).toBe("mystore.myshopify.com");
    expect(normalizeShopDomain("mystore.myshopify.com:443")).toBe("mystore.myshopify.com");
  });

  it("refuses an address that is not a Shopify shop", () => {
    // His own web address is the one he says first, and it is not the one
    // Shopify will accept.
    expect(normalizeShopDomain("mystore.com")).toBeNull();
    expect(normalizeShopDomain("https://www.mystore.in/shop")).toBeNull();
    expect(normalizeShopDomain("shopify.com")).toBeNull();
  });

  it("refuses a lookalike domain someone else owns", () => {
    expect(normalizeShopDomain("mystore.myshopify.com.example.net")).toBeNull();
    expect(normalizeShopDomain("https://evil.example/mystore.myshopify.com")).toBeNull();
    expect(normalizeShopDomain("mystore.myshopify.co")).toBeNull();
    expect(normalizeShopDomain("owner@mystore.myshopify.com")).toBeNull();
  });

  it("refuses anything that is not a shop name yet", () => {
    expect(normalizeShopDomain("")).toBeNull();
    expect(normalizeShopDomain("   ")).toBeNull();
    expect(normalizeShopDomain("my store")).toBeNull();
    expect(normalizeShopDomain("-mystore")).toBeNull();
    expect(normalizeShopDomain("my_store")).toBeNull();
    expect(normalizeShopDomain("https://")).toBeNull();
  });

  it("never returns something the API would bounce", () => {
    const typed = [
      "mystore",
      "mystore.myshopify.com",
      "https://mystore.myshopify.com/admin",
      "admin.shopify.com/store/mystore",
      "  MyStore  ",
      "mystore.com",
      "",
      "-nope",
    ];
    for (const value of typed) {
      const shop = normalizeShopDomain(value);
      if (shop !== null) expect(shop).toMatch(API_ACCEPTS);
    }
  });
});
