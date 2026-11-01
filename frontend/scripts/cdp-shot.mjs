// dev-only: drive a headless Edge/Chrome over CDP: open a URL, print console + exceptions,
// wait, optionally run a JS snippet, screenshot.
// Usage: node cdp-shot.mjs <port> <url> <out.png> [waitMs] [js|-] [WxH[m]]  (m = mobile/touch)
import { writeFileSync } from "node:fs";
const [port, url, out, wait = "6000", jsArg, size = "2560x1440"] = process.argv.slice(2);
const js = jsArg === "-" ? undefined : jsArg;
const [width, height] = size.replace("m", "").split("x").map(Number);
const mobile = size.endsWith("m");
const tabs = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
const ws = new WebSocket(tabs.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((res) => {
    const i = ++id;
    pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) return pending.get(d.id)(d.result ?? d.error);
  if (d.method === "Runtime.consoleAPICalled")
    console.log(`[console.${d.params.type}]`, d.params.args.map((a) => a.value ?? a.description).join(" "));
  if (d.method === "Runtime.exceptionThrown")
    console.log(
      "[exception]",
      d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text,
    );
  if (d.method === "Log.entryAdded")
    console.log(`[log.${d.params.entry.level}]`, d.params.entry.text, d.params.entry.url ?? "");
};
await new Promise((r) => (ws.onopen = r));
await send("Runtime.enable");
await send("Log.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width,
  height,
  deviceScaleFactor: mobile ? 2 : 1,
  mobile,
});
if (mobile) await send("Emulation.setTouchEmulationEnabled", { enabled: true });
await send("Page.navigate", { url });
await new Promise((r) => setTimeout(r, +wait));
if (js) {
  const r = await send("Runtime.evaluate", { expression: js, awaitPromise: true, returnByValue: true });
  console.log("[eval]", JSON.stringify(r.result?.value ?? r));
  await new Promise((r) => setTimeout(r, 1500));
}
const shot = await send("Page.captureScreenshot", { format: "png" });
writeFileSync(out, Buffer.from(shot.data, "base64"));
await fetch(`http://127.0.0.1:${port}/json/close/${tabs.id}`);
ws.close();
console.log("wrote", out);
