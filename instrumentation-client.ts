import { vemetric } from "@vemetric/web";

// Same "unset env var = inert" convention as every other vendor integration in this app
// (Resend, Twilio, Anthropic) - without NEXT_PUBLIC_VEMETRIC_TOKEN, this simply never
// initializes and the client SDK's calls elsewhere become silent no-ops.
if (process.env.NEXT_PUBLIC_VEMETRIC_TOKEN) {
  vemetric.init({ token: process.env.NEXT_PUBLIC_VEMETRIC_TOKEN });
}
