// Publieke instellingen voor de website (de anon key van Supabase is bedoeld om openbaar te zijn).
import {stuur, fout, env} from "./_lib/server.js";
export default function handler(req, res) {
  try {
    stuur(res, 200, {
      supabaseUrl: env("SUPABASE_URL"),
      supabaseAnonKey: env("SUPABASE_ANON_KEY"),
      mailbox: !!(process.env.MS_TENANT_ID && process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET && process.env.MS_MAILBOX),
      google: !!process.env.GOOGLE_MAPS_API_KEY,
      postcode: !!process.env.POSTCODE_API_TOKEN,
      ai: !!process.env.ANTHROPIC_API_KEY
    });
  } catch (e) { fout(res, e); }
}
