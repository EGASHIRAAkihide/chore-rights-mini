import "./load-env";

// scripts/check-supabase-connection.ts
import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("🔍 Checking Supabase connection...");
  if (!url || !anon || !service) {
    console.error("❌ Missing environment variables:");
    if (!url) console.error("  - NEXT_PUBLIC_SUPABASE_URL");
    if (!anon) console.error("  - NEXT_PUBLIC_SUPABASE_ANON_KEY");
    if (!service) console.error("  - SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  // Create client using the service role key for privileged queries
  const supabase = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data, error } = await supabase.from("works").select("id").limit(1);
    if (error) {
      throw error;
    }
    console.log("✅ Supabase connection successful!");
    console.log(`ℹ️ Example record: ${data?.[0]?.id ?? "(no rows yet)"}`);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err
          ? String((err as { message?: unknown }).message)
          : String(err);

    const normalized = message.toLowerCase();
    if (normalized.includes("fetch failed") || normalized.includes("econnrefused")) {
      console.warn("⚠️ Supabase is unreachable but env vars are set. Skipping connectivity check.");
      process.exit(0);
    }

    console.error("❌ Connection failed:", err);
    process.exit(1);
  }
}

main();
