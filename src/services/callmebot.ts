export async function makeCall(username: string, text: string): Promise<void> {
  const url = new URL("http://api.callmebot.com/start.php");
  url.searchParams.set("user", username);
  url.searchParams.set("text", text.slice(0, 256)); // max 256 chars
  url.searchParams.set("lang", "en-US-Standard-B");
  url.searchParams.set("rpt", "2");
  await fetch(url.toString());
}
