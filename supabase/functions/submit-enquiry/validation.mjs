export function validateEnquiry(body) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return { error: "Invalid enquiry." };
  const str = (key) => (typeof body[key] === "string" ? body[key].trim() : "");
  const customer_name = str("customer_name"),
    phone = str("phone"),
    email = str("email"),
    message = str("message");
  if (str("website")) return { error: "Unable to submit this enquiry." };
  if (customer_name.length < 2 || customer_name.length > 100)
    return { error: "Enter your name (2–100 characters)." };
  if (
    !/^[+\d\s().-]{7,30}$/.test(phone) ||
    phone.replace(/\D/g, "").length < 7 ||
    phone.replace(/\D/g, "").length > 15
  )
    return { error: "Enter a valid phone or WhatsApp number." };
  if (
    email &&
    (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  )
    return { error: "Enter a valid email address." };
  if (message.length > 3000)
    return { error: "Keep your message under 3,000 characters." };
  const quantity =
    body.quantity === "" || body.quantity == null
      ? null
      : Number(body.quantity);
  if (
    quantity !== null &&
    (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000)
  )
    return { error: "Quantity must be a whole number between 1 and 100,000." };
  const product_id = body.product_id || null;
  if (
    product_id !== null &&
    (typeof product_id !== "string" ||
      !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
        product_id,
      ))
  )
    return { error: "Invalid product." };
  if (!str("captcha_token") || str("captcha_token").length > 2048)
    return { error: "Please complete the verification." };
  return {
    data: {
      customer_name,
      phone,
      email: email || null,
      message,
      quantity,
      product_id,
    },
  };
}
