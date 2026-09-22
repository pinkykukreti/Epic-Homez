import { createClient } from "npm:@supabase/supabase-js@2";
import { validateEnquiry } from "./validation.mjs";
import { notifyEnquiry } from "./email.mjs";

Deno.serve(async (req) => {
  const origins = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((s) => s.trim());
  const origin = req.headers.get("origin") || "";
  const headers = {
    "Access-Control-Allow-Origin": origins.includes(origin) ? origin : "null",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
    "Content-Type": "application/json",
  };
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });
  if (!origin || !origins.includes(origin))
    return respond({ error: "Origin not allowed." }, 403);
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  if (req.method !== "POST")
    return respond({ error: "Method not allowed." }, 405);
  try {
    const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
    const siteUrl = Deno.env.get("SITE_URL");
    const salt = Deno.env.get("RATE_LIMIT_SALT");
    if (!secret || !siteUrl || !salt)
      return respond(
        {
          error:
            "Enquiries are temporarily unavailable. Please try again later.",
        },
        503,
      );
    // Bound the request before parsing JSON, including chunked requests.
    const reader = req.body?.getReader();
    if (!reader) return respond({ error: "A request body is required." }, 400);
    let bytes = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 16384) {
        await reader.cancel();
        return respond({ error: "Request too large." }, 413);
      }
      chunks.push(value);
    }
    const buffer = new Uint8Array(bytes);
    let offset = 0;
    for (const c of chunks) {
      buffer.set(c, offset);
      offset += c.length;
    }
    let body;
    try {
      body = JSON.parse(new TextDecoder().decode(buffer));
    } catch {
      return respond({ error: "Invalid request." }, 400);
    }
    const parsed = validateEnquiry(body);
    if (!parsed.data) return respond({ error: parsed.error || "Invalid enquiry." }, 400);
    const verification = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: new URLSearchParams({ secret, response: body.captcha_token }),
        signal: AbortSignal.timeout(10000),
      },
    );
    const captcha = await verification.json();
    if (
      !captcha.success ||
      captcha.hostname !== new URL(origin).hostname ||
      captcha.action !== "enquiry"
    )
      return respond({ error: "Please complete the verification again." }, 400);
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const hash = async (s: string) =>
      Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(salt + s),
          ),
        ),
      )
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    for (const key of [
      "ip:" + ip,
      "phone:" + parsed.data.phone.replace(/\D/g, ""),
    ]) {
      const limit = await db.rpc("consume_enquiry_limit", {
        rate_key: await hash(key),
      });
      if (limit.error) throw limit.error;
      if (!limit.data)
        return respond(
          { error: "Too many enquiries. Please try again in 15 minutes." },
          429,
        );
    }
    let snapshot = {};
    if (parsed.data.product_id) {
      const { data: product, error } = await db
        .from("products")
        .select("id,name,sku,slug")
        .eq("id", parsed.data.product_id)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      if (!product)
        return respond(
          {
            error:
              "This product is no longer available. Please send a general enquiry.",
          },
          400,
        );
      snapshot = {
        product_name: product.name,
        product_sku: product.sku,
        product_url: new URL("/products/" + product.slug, siteUrl).href,
      };
    }
    const { data, error } = await db
      .from("enquiries")
      .insert({ ...parsed.data, ...snapshot })
      .select("id")
      .single();
    if (error) throw error;
    const emailStatus = await notifyEnquiry({ ...parsed.data, ...snapshot, id: data.id }, {
      key: Deno.env.get("RESEND_API_KEY"),
      from: Deno.env.get("ENQUIRY_FROM_EMAIL"),
      to: Deno.env.get("ENQUIRY_TO_EMAIL") || "epichomezstore@gmail.com",
    });
    // Keep the saved enquiry even if the provider fails. Do not log customer data.
    if (emailStatus !== "accepted") console.error("Enquiry email notification", data.id, emailStatus);
    return respond({ id: data.id, email_status: emailStatus }, 201);
  } catch {
    return respond(
      { error: "Your enquiry could not be saved. Please try again." },
      500,
    );
  }
});

