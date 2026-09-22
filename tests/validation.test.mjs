import test from "node:test";
import assert from "node:assert/strict";
import { validateEnquiry } from "../supabase/functions/submit-enquiry/validation.mjs";
const valid = {
  customer_name: "Example Visitor",
  phone: "+91 9876543210",
  email: "visitor@example.test",
  message: "Please share details.",
  captcha_token: "test-token",
  quantity: "2",
  product_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};
for (const [name, overrides] of [
  ["missing name", { customer_name: "" }],
  ["invalid phone", { phone: "123" }],
  ["bad email", { email: "not-email" }],
  ["fractional quantity", { quantity: "1.5" }],
  ["excess quantity", { quantity: 100001 }],
  ["bad product", { product_id: "not-a-uuid" }],
  ["spam field", { website: "spam" }],
  ["no CAPTCHA", { captcha_token: "" }],
  ["long message", { message: "x".repeat(3001) }],
])
  test("Rejects " + name, () =>
    assert.ok(validateEnquiry({ ...valid, ...overrides }).error),
  );
test("Accepts valid enquiry and ignores attacker-supplied private fields", () => {
  const { data, error } = validateEnquiry({
    ...valid,
    status: "Closed",
    internal_notes: "Injected",
    product_name: "Forged",
    created_at: "2000-01-01",
  });
  assert.equal(error, undefined);
  assert.equal(data.quantity, 2);
  assert.equal(data.status, undefined);
  assert.equal(data.internal_notes, undefined);
  assert.equal(data.product_name, undefined);
  assert.equal(data.created_at, undefined);
});
test("General enquiry accepts optional fields without fake product data", () => {
  const { data } = validateEnquiry({
    ...valid,
    email: "",
    quantity: "",
    product_id: null,
  });
  assert.equal(data.product_id, null);
  assert.equal(data.quantity, null);
  assert.equal(data.email, null);
});
