export async function makeCall(username: string, text: string): Promise<void> {
  const url = new URL("http://api.callmebot.com/start.php");
  url.searchParams.set("user", username);
  url.searchParams.set("text", text.slice(0, 256)); // max 256 chars
  url.searchParams.set("lang", "en-US-Standard-B");
  url.searchParams.set("rpt", "2");

  console.log(
    `[CallMeBot] Calling ${username} with text: "${text.slice(0, 50)}..."`,
  );

  try {
    const response = await fetch(url.toString());
    const body = await response.text();

    if (body.includes("Authorization OK")) {
      console.log(`[CallMeBot] Call initiated successfully`);
    } else if (body.includes("Line is busy")) {
      console.log(`[CallMeBot] Call queued (line busy)`);
    } else {
      console.error(`[CallMeBot] Unexpected response: ${body.slice(0, 200)}`);
    }
  } catch (e) {
    console.error(`[CallMeBot] Failed to make call:`, e);
  }
}
