import { spawn } from "node:child_process";
import net from "node:net";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4174";
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profileDir = path.join(root, ".qa", "chrome-verify-profile");

async function freePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForJson(port, attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) {
        return await response.json();
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error("Chrome remote debugging endpoint did not start.");
}

function createClient(wsUrl) {
  const socket = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolve(message.result || {});
      }
    }
  });

  return {
    async open() {
      await new Promise((resolve, reject) => {
        socket.addEventListener("open", resolve, { once: true });
        socket.addEventListener("error", reject, { once: true });
      });
    },
    send(method, params = {}) {
      const id = nextId++;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    close() {
      socket.close();
    }
  };
}

async function createPage(port, url) {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, {
    method: "PUT"
  });
  if (!response.ok) {
    throw new Error(`Could not create Chrome page: ${response.status}`);
  }
  return await response.json();
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Evaluation failed");
  }
  return result.result.value;
}

async function verifyDesktop(port) {
  const page = await createPage(port, `${baseUrl}/map.html?verify=desktop`);
  const client = createClient(page.webSocketDebuggerUrl);
  await client.open();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await new Promise((resolve) => setTimeout(resolve, 3500));

  const before = await evaluate(client, `({
    title: document.title,
    mapVisible: !!document.querySelector('#mapMode.visible'),
    groupCards: document.querySelectorAll('.group-card').length,
    tabs: document.querySelectorAll('.tab').length,
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth
  })`);

  await evaluate(client, `document.querySelector('.v5-inline-case')?.click(); true`);
  await new Promise((resolve) => setTimeout(resolve, 700));
  const afterCase = await evaluate(client, `({
    emptyVisible: getComputedStyle(document.querySelector('#mapEmptyState')).display !== 'none',
    markers: document.querySelectorAll('.leaflet-marker-icon').length,
    rightText: document.querySelector('#mapRight')?.innerText.slice(0, 120) || ''
  })`);

  await evaluate(client, `document.querySelectorAll('.tab')[1]?.click(); true`);
  await new Promise((resolve) => setTimeout(resolve, 300));
  const afterTab = await evaluate(client, `document.querySelector('.tab.active')?.innerText || ''`);
  client.close();

  return { before, afterCase, afterTab };
}

async function verifyMobile(port) {
  const page = await createPage(port, `${baseUrl}/?verify=mobile`);
  const client = createClient(page.webSocketDebuggerUrl);
  await client.open();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });
  await client.send("Page.navigate", { url: `${baseUrl}/map.html?verify=mobile-resize` });
  await new Promise((resolve) => setTimeout(resolve, 3500));
  const mobile = await evaluate(client, `({
    title: document.title,
    mapVisible: !!document.querySelector('#mapMode.visible'),
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    headerHeight: Math.round(document.querySelector('.map-header')?.getBoundingClientRect().height || 0),
    cardText: document.querySelector('#mapEmptyState')?.innerText || ''
  })`);
  client.close();
  return mobile;
}

async function verifyPresentation(port) {
  const page = await createPage(port, `${baseUrl}/presentation.html?verify=presentation`);
  const client = createClient(page.webSocketDebuggerUrl);
  await client.open();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await new Promise((resolve) => setTimeout(resolve, 6500));

  const before = await evaluate(client, `({
    title: document.title,
    bodyClass: document.body.className,
    deckVisible: getComputedStyle(document.querySelector('#imageSlideDeck')).display !== 'none',
    slideModeHidden: getComputedStyle(document.querySelector('#slideMode')).display === 'none',
    mapHidden: getComputedStyle(document.querySelector('#mapMode')).display === 'none',
    skipHidden: getComputedStyle(document.querySelector('#imageDeckSkipToMap')).display === 'none',
    ctaHidden: getComputedStyle(document.querySelector('#imageDeckMapCta')).display === 'none',
    counter: document.querySelector('#imageDeckCounter')?.innerText || '',
    visibleDots: Array.from(document.querySelectorAll('#imageDeckDots .image-deck-dot')).filter((dot) => getComputedStyle(dot).display !== 'none' && !dot.hidden).length,
    imageWidth: document.querySelector('#imageDeckSlideImage')?.naturalWidth || 0,
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth
  })`);

  await evaluate(client, `new Promise(async (resolve) => {
    const next = document.querySelector('#imageDeckNext');
    for (let i = 0; i < 12; i++) {
      next?.click();
      await new Promise((done) => setTimeout(done, 140));
    }
    resolve(true);
  })`);
  await new Promise((resolve) => setTimeout(resolve, 500));

  const afterNext = await evaluate(client, `({
    counter: document.querySelector('#imageDeckCounter')?.innerText || '',
    ctaHidden: getComputedStyle(document.querySelector('#imageDeckMapCta')).display === 'none',
    mapVisibleClass: document.querySelector('#mapMode')?.classList.contains('visible') || false,
    imageHidden: document.querySelector('#imageDeckSlideImage')?.hidden || false
  })`);
  client.close();

  return { before, afterNext };
}

const port = await freePort();
await rm(profileDir, { recursive: true, force: true });

const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profileDir}`,
  "about:blank"
], { stdio: "ignore" });

try {
  await waitForJson(port);
  const result = {
    presentation: await verifyPresentation(port),
    desktop: await verifyDesktop(port),
    mobile: await verifyMobile(port)
  };

  const failures = [];
  if (!result.presentation.before.bodyClass.includes("presentation-only")) failures.push("presentation class");
  if (!result.presentation.before.deckVisible) failures.push("presentation deck");
  if (!result.presentation.before.slideModeHidden) failures.push("presentation slide mode hidden");
  if (!result.presentation.before.mapHidden) failures.push("presentation map hidden");
  if (!result.presentation.before.skipHidden) failures.push("presentation skip hidden");
  if (!result.presentation.before.ctaHidden) failures.push("presentation map cta hidden");
  if (!result.presentation.before.counter.includes("/ 10")) failures.push("presentation counter");
  if (result.presentation.before.visibleDots !== 10) failures.push("presentation visible dots");
  if (result.presentation.before.imageWidth < 1) failures.push("presentation image not loaded");
  if (result.presentation.before.overflowX) failures.push("presentation horizontal overflow");
  if (!result.presentation.afterNext.counter.includes("10 / 10")) failures.push("presentation final slide clamp");
  if (!result.presentation.afterNext.ctaHidden) failures.push("presentation map cta after next");
  if (result.presentation.afterNext.mapVisibleClass) failures.push("presentation map opened");
  if (result.presentation.afterNext.imageHidden) failures.push("presentation final image hidden");
  if (result.desktop.before.title !== "같은 이름, 다른 기억 — 지도 전용") failures.push("desktop title");
  if (!result.desktop.before.mapVisible) failures.push("desktop map mode");
  if (result.desktop.before.groupCards < 1) failures.push("desktop group cards");
  if (result.desktop.before.tabs < 5) failures.push("desktop tabs");
  if (result.desktop.before.overflowX) failures.push("desktop horizontal overflow");
  if (result.desktop.afterCase.emptyVisible) failures.push("case selection did not hide empty state");
  if (result.desktop.afterCase.markers < 1) failures.push("case selection did not render markers");
  if (!result.desktop.afterTab.includes("공식")) failures.push("official tab");
  if (result.mobile.overflowX) failures.push("mobile horizontal overflow");

  console.log(JSON.stringify({ ok: failures.length === 0, failures, result }, null, 2));
  if (failures.length) {
    process.exitCode = 1;
  }
} finally {
  chrome.kill();
}
