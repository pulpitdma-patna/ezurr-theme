import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ProductForm, emptyProductForm, type ProductFormValues } from "@/components/admin/ProductForm";

afterEach(cleanup);

function renderForm(overrides: Partial<ProductFormValues> = {}) {
  const onSubmit = vi.fn();
  const onSubmitHidden = vi.fn();
  const update = vi.fn();
  render(
    <ProductForm
      form={{ ...emptyProductForm, ...overrides }}
      update={update}
      mode="add"
      onSubmit={onSubmit}
      onSubmitHidden={onSubmitHidden}
    />,
  );
  return { onSubmit, onSubmitHidden, update };
}

describe("the form he fills in when a shipment arrives", () => {
  /**
   * The old form had an editable "SKU" box and an editable "Edition" box, and
   * `productApiPayload` sent neither — there is no column for either. He typed
   * the code off the carton, pressed save, and got a green "Product saved" over
   * a value that never left the browser. A control that does not write does not
   * ship: the real item code is read-only with a Copy button now.
   */
  it("has no box for a code the shop cannot store", () => {
    renderForm();
    expect(screen.queryByLabelText(/^SKU$/i)).toBeNull();
    expect(screen.queryByLabelText(/^Edition$/i)).toBeNull();
  });

  /**
   * "Sold out" was the third option in the status dropdown and it saved
   * active:false — which takes the product off the website rather than marking
   * it sold out. There is no dropdown any more; the outcome is the button's
   * name, so he reads what will happen before he commits to it.
   */
  it("offers no way to choose sold out, because sold out is not a choice", () => {
    renderForm();
    expect(screen.queryByText(/^Sold out$/i)).toBeNull();
    expect(screen.getByRole("button", { name: /Save and put it on the website/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Save but keep it hidden/i })).toBeTruthy();
  });

  /**
   * Stock used to default to "10", so every product created in a hurry claimed
   * ten units on the shelf and the shop sold what it did not have.
   */
  it("starts with the stock box empty and refuses to save without an answer", () => {
    const { onSubmit } = renderForm();
    const stock = screen.getByLabelText(/How many do you have\?/i) as HTMLInputElement;
    expect(stock.value).toBe("");

    fireEvent.click(screen.getByRole("button", { name: /Save and put it on the website/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/How many are on the shelf/i)).toBeTruthy();
  });

  it("asks for a name and a price in his words, not 'required'", () => {
    const { onSubmit } = renderForm({ stock: "12" });
    fireEvent.click(screen.getByRole("button", { name: /Save and put it on the website/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/this is what customers see/i)).toBeTruthy();
    expect(screen.getByText(/What do you sell it for\?/i)).toBeTruthy();
  });

  it("saves when the six fields are answered", () => {
    const { onSubmit } = renderForm({ name: "EA Sports FC 26", price: "4999", stock: "12" });
    fireEvent.click(screen.getByRole("button", { name: /Save and put it on the website/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  /**
   * A code-delivered product has no shelf count — its stock is the number of
   * codes loaded — so the question is not asked, rather than asked and ignored.
   */
  it("stops asking how many are on the shelf once it goes out by email", () => {
    const { onSubmit } = renderForm({
      name: "PSN ₹1000",
      price: "1000",
      delivery: "digital",
    });
    expect(screen.queryByLabelText(/How many do you have\?/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Save and put it on the website/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  /**
   * Pre-order was a radio card labelled with a noun; the release date and the
   * advance only appeared once he had accepted it. All seven pre-orders in the
   * catalogue have no release date because nobody ever got that far.
   */
  it("asks for the advance only once a future release date turns it into a booking", () => {
    renderForm({ delivery: "physical" });
    expect(screen.queryByText(/Advance to book/i)).toBeNull();
    cleanup();

    const future = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    renderForm({ delivery: "physical", releaseAt: future });
    expect(screen.getByText(/Advance to book/i)).toBeTruthy();
  });

  it("does not turn a date that has already passed into a pre-order", () => {
    renderForm({ delivery: "physical", releaseAt: "2020-01-01" });
    expect(screen.queryByText(/Advance to book/i)).toBeNull();
  });
});
