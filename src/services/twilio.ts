/**
 * Twilio Voice Call Service
 * Makes real phone calls using Twilio's REST API
 */

interface TwilioEnv {
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_PHONE_NUMBER: string;
  MY_PHONE_NUMBER: string;
}

export async function makeTwilioCall(
  message: string,
  env: TwilioEnv,
): Promise<{ success: boolean; error?: string }> {
  // Escape XML special characters
  const escapedMessage = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  // TwiML with text-to-speech, repeated 3 times
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-US">${escapedMessage}</Say>
  <Pause length="1"/>
  <Say voice="alice" language="en-US">${escapedMessage}</Say>
  <Pause length="1"/>
  <Say voice="alice" language="en-US">${escapedMessage}</Say>
</Response>`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Calls.json`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: env.MY_PHONE_NUMBER,
        From: env.TWILIO_PHONE_NUMBER,
        Twiml: twiml,
      }),
    });

    const data = (await response.json()) as { sid?: string; message?: string };

    if (response.ok) {
      console.log(`[Twilio] Call initiated: ${data.sid}`);
      return { success: true };
    } else {
      console.error(`[Twilio] Error: ${data.message || JSON.stringify(data)}`);
      return { success: false, error: data.message };
    }
  } catch (e) {
    console.error(`[Twilio] Failed to make call:`, e);
    return { success: false, error: String(e) };
  }
}
