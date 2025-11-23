import { task, wait } from "@trigger.dev/sdk/v3";
import puppeteer from "puppeteer-core";
import { z } from "zod";
import { enhanceHTMLReadability } from "../../lib/enhance-html";

const captureLogsSchema = z.object({
  connectUrl: z.string(),
  url: z.string(),
  waitTimeSeconds: z.number().default(10),
});

export type NetworkLog = {
  url: string;
  method: string;
  resourceType: string;
  status?: number;
  headers?: Record<string, string>;
  body?: string | object;
  timestamp: number;
};

export const captureNetworkLogs = task({
  id: "capture-network-logs",
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  run: async (
    payload: z.infer<typeof captureLogsSchema>,
  ): Promise<NetworkLog[]> => {
    const logs: NetworkLog[] = [];

    const browser = await puppeteer.connect({
      browserWSEndpoint: payload.connectUrl,
    });

    try {
      const pages = await browser.pages();
      const page = pages[0] ?? (await browser.newPage());

      await page.setRequestInterception(true);

      page.on("request", (request) => {
        request.continue();
      });

      page.on("response", async (response) => {
        const request = response.request();
        const resourceType = request.resourceType();

        if (
          ["image", "stylesheet", "script", "font", "media"].includes(
            resourceType,
          )
        ) {
          return;
        }

        const url = request.url();
        if (
          request.method() === "OPTIONS" ||
          url.endsWith("site.webmanifest") ||
          url.endsWith(".php") ||
          url.includes(".infobip.com") ||
          url.includes(".tiktokw.us") ||
          url.includes("google.com") ||
          url.includes("clarity.ms") ||
          url.includes(".hs-sites.com") ||
          url.includes("wonderpush.com") ||
          url.startsWith("https://analytics.google.com") ||
          url.startsWith("https://api.wonderpush.com") ||
          url.startsWith("https://o.clarity.ms") ||
          url.startsWith("https://www.google.com/measurement") ||
          url.startsWith("https://www.google.com/ccm") ||
          url.startsWith("https://cdn.cookielaw.org") ||
          url.startsWith("https://api.retargetly.com") ||
          url.startsWith("https://geolocation.onetrust.com") ||
          url.includes(".hubspot.com") ||
          url.startsWith("https://api.infobip.com") ||
          url.startsWith("https://api2.infobip.net") ||
          url.startsWith("https://livechat.infobip.com") ||
          url.includes("https://in-automate.brevo.com") ||
          url.startsWith("https://forms.hscollectedforms.net/") ||
          url.startsWith("https://www.googletagmanager.com/") ||
          url.startsWith("https://analytics.tiktok.com") ||
          url.startsWith("https://www.facebook.com") ||
          url.startsWith("https://forms.hscollectedforms.net") ||
          url.startsWith("https://www.google-analytics.com") ||
          url.startsWith("https://stats.g.doubleclick.net") ||
          url.startsWith("https://www.gstatic.com") ||
          url.startsWith("https://y.clarity.ms") ||
          url.includes("_next/static/") ||
          url.includes(".sentry.io") ||
          url.endsWith(".ico") ||
          url.endsWith(".svg")
        ) {
          return;
        }

        let body: string | object | undefined;
        try {
          const contentType = response.headers()["content-type"] || "";
          if (contentType.includes("application/json")) {
            body = await response.json();
          } else if (contentType.includes("text/")) {
            body = await response.text();
          }
        } catch {
          body = undefined;
        }

        if (body) {
          logs.push({
            url: request.url(),
            method: request.method(),
            resourceType,
            status: response.status(),
            headers: response.headers(),
            body: enhanceHTMLReadability(body),
            timestamp: Date.now(),
          });
        }
      });

      await page.goto(payload.url);
      await wait.for({ seconds: payload.waitTimeSeconds });
      await page.close();
    } finally {
      await browser.close();
    }

    return logs;
  },
});

