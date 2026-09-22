export function emailPayload(enquiry, { from, to }) {
  return {
    from, to: [to],
    subject: 'Epic Homez | New website enquiry ' + enquiry.id,
    ...(enquiry.email ? { reply_to: enquiry.email } : {}),
    text: [
      'NEW EPIC HOMEZ ENQUIRY',
      'Reference: ' + enquiry.id,
      'Name: ' + enquiry.customer_name,
      'Phone / WhatsApp: ' + enquiry.phone,
      'Email: ' + (enquiry.email || 'Not provided'),
      'Product: ' + (enquiry.product_name || 'General enquiry'),
      'SKU: ' + (enquiry.product_sku || 'Not specified'),
      'Product link: ' + (enquiry.product_url || 'Not specified'),
      'Quantity: ' + (enquiry.quantity || 'Not specified'),
      '', 'Message:', enquiry.message || 'No message provided.',
      '', 'This is an enquiry, not a confirmed order.'
    ].join('\n')
  };
}
export async function notifyEnquiry(enquiry, config, send = fetch) {
  if (!config.key || !config.from || !config.to) return 'not_configured';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await send('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + config.key, 'Content-Type': 'application/json', 'Idempotency-Key': 'enquiry/' + enquiry.id },
        body: JSON.stringify(emailPayload(enquiry, config)),
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) return 'accepted';
      if (response.status < 500 && response.status !== 429) return 'failed';
    } catch { /* Retry once using the same provider idempotency key. */ }
  }
  return 'failed';
}
