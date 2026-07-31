import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  PlaceholderEditor,
  parseBody,
  previewBody,
  serialiseBody,
  usedPlaceholders,
  type MessagePlaceholder,
} from "@/components/admin/PlaceholderEditor";

const placeholders: MessagePlaceholder[] = [
  { key: "name", label: "Customer name", source: "customer.name", required: false },
  { key: "order_id", label: "Order number", source: "order.public_id", required: true },
  { key: "tracking", label: "Tracking link", source: "order.tracking_link", required: false },
];

describe("the wording editor never shows a curly brace", () => {
  it("renders each detail as its plain-English name", () => {
    render(
      <PlaceholderEditor
        body="Hi {{name}}, order {{order_id}} is on the way."
        placeholders={placeholders}
        onChange={() => {}}
      />,
    );

    expect(screen.getAllByText("Customer name").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Order number").length).toBeGreaterThan(0);
    // The owner had to keep `{{1}}` in the message lined up with a JSON array
    // in a second box. Braces are the tell that he is editing our syntax.
    expect(document.body.textContent).not.toContain("{{");
    expect(document.body.textContent).not.toContain("}}");
  });

  it("shows what a customer would actually read", () => {
    render(
      <PlaceholderEditor
        body="Hi {{name}}, order {{order_id}} is on the way."
        placeholders={placeholders}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("Hi Asha, order EZ-4T9K2M is on the way.")).toBeInTheDocument();
    // …and says out loud that Asha is not a real customer.
    expect(screen.getByText(/Asha is an example/)).toBeInTheDocument();
  });

  it("warns when a detail the message cannot go out without is missing", () => {
    render(
      <PlaceholderEditor body="Hi {{name}}." placeholders={placeholders} onChange={() => {}} />,
    );
    // Not a validation error after saving: the send would be recorded as
    // blocked and he would never see why.
    expect(screen.getByText(/Order number/)).toBeInTheDocument();
    expect(screen.getByText(/held back instead of sent/)).toBeInTheDocument();
  });

  it("flags a detail the message does not carry rather than dropping it", () => {
    // An older wording using a positional marker, or one copied from another
    // event. Silently deleting somebody's text is worse than showing it as wrong.
    render(
      <PlaceholderEditor body="Order {{1}} shipped." placeholders={placeholders} onChange={() => {}} />,
    );
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(usedPlaceholders("Order {{1}} shipped.", placeholders)).toEqual([
      { key: "1", label: "1", source: "", required: false },
    ]);
  });

  it("adds a detail from the menu, at the end of what he has written", () => {
    const onChange = vi.fn();
    render(
      <PlaceholderEditor body="Hi " placeholders={placeholders} onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Add a detail" }));
    fireEvent.click(screen.getByRole("button", { name: /Customer name/ }));

    expect(onChange).toHaveBeenCalledWith("Hi {{name}}");
  });

  it("stitches the sentence back together when a detail is removed", () => {
    const onChange = vi.fn();
    render(
      <PlaceholderEditor
        body="Hi {{name}}, welcome."
        placeholders={placeholders}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove Customer name" }));

    // Not "Hi " + ", welcome." left as two separate pieces — one sentence.
    expect(onChange).toHaveBeenCalledWith("Hi , welcome.");
  });
});

describe("the variables the server stores are derived, never typed", () => {
  it("lists the details in the order they appear in the message", () => {
    // This is what kills the second textarea: there is no second place for the
    // list to be out of step with the message.
    expect(
      usedPlaceholders("Order {{order_id}} for {{name}}: {{tracking}}", placeholders),
    ).toEqual([
      { key: "order_id", label: "Order number", source: "order.public_id", required: true },
      { key: "name", label: "Customer name", source: "customer.name", required: false },
      { key: "tracking", label: "Tracking link", source: "order.tracking_link", required: false },
    ]);
  });

  it("counts a repeated detail once", () => {
    expect(usedPlaceholders("{{name}}, hi {{name}}", placeholders).map((p) => p.key)).toEqual([
      "name",
    ]);
  });

  it("round-trips a message without changing a character", () => {
    const body = "Hi {{name}}, order {{order_id}} is on the way. Track: {{tracking}}";
    expect(serialiseBody(parseBody(body))).toBe(body);
  });

  it("falls back to the detail's own name when there is no sample for it", () => {
    expect(
      previewBody("Hi {{nickname}}", [
        { key: "nickname", label: "What they call themselves", source: "x", required: false },
      ]),
    ).toBe("Hi what they call themselves");
  });
});
