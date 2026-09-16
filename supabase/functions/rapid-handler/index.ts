import { withSupabase } from "npm:@supabase/server";
import { importPKCS8, SignJWT } from "npm:jose@6";

const PROPERTY_ID = "553558328";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SCOPE =
  "https://www.googleapis.com/auth/analytics.readonly";

const ALLOWED_DAY_RANGES = [7, 15, 30];
const DEFAULT_DAYS = 30;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function getGoogleAccessToken() {
  const rawCredentials = Deno.env.get(
    "GOOGLE_SERVICE_ACCOUNT_JSON"
  );

  if (!rawCredentials) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON secret is missing"
    );
  }

  const credentials = JSON.parse(rawCredentials);

  const privateKey = await importPKCS8(
    credentials.private_key,
    "RS256"
  );

  const now = Math.floor(Date.now() / 1000);

  const assertion = await new SignJWT({
    scope: GOOGLE_SCOPE,
  })
    .setProtectedHeader({
      alg: "RS256",
      typ: "JWT",
    })
    .setIssuer(credentials.client_email)
    .setAudience(GOOGLE_TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type":
        "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type:
        "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Google authentication failed: ${errorText}`
    );
  }

  const tokenData = await response.json();

  return tokenData.access_token;
}

/* ---------------------------------------
   CORE REPORTS
--------------------------------------- */

async function runBatchReports(
  accessToken: string,
  requests: any[]
) {
  const url =
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:batchRunReports`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Google Analytics batch error: ${errorText}`
    );
  }

  return await response.json();
}

async function runReport(
  accessToken: string,
  requestBody: any
) {
  const url =
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Google Analytics report error: ${errorText}`
    );
  }

  return await response.json();
}

/* ---------------------------------------
   REALTIME REPORT
--------------------------------------- */

async function runRealtimeReport(
  accessToken: string,
  dimensions: any[]
) {
  const url =
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runRealtimeReport`;

  const requestBody = {
    dimensions,
    metrics: [
      {
        name: "activeUsers",
      },
    ],
    limit: 20,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Google Analytics realtime error: ${errorText}`
    );
  }

  return await response.json();
}

/* ---------------------------------------
   MAIN ANALYTICS
--------------------------------------- */

async function runAnalyticsReports(
  accessToken: string,
  days: number
) {
  // Every historical report below shares this same start date, driven by
  // the caller-selected range (7 / 15 / 30 days). Realtime reports don't
  // take a date range at all, so they're untouched by this.
  const rangeStart = `${days}daysAgo`;

  /*
    BATCH 1

    1. Overview
    2. Pages
    3. Daily users
    4. Traffic sources
    5. Devices
  */

  const batch1 = await runBatchReports(
    accessToken,
    [
      /* 1 — OVERVIEW */
      {
        dateRanges: [
          {
            startDate: rangeStart,
            endDate: "today",
          },
        ],
        metrics: [
          {
            name: "totalUsers",
          },
          {
            name: "sessions",
          },
          {
            name: "screenPageViews",
          },
          {
            name: "userEngagementDuration",
          },
          {
            name: "newUsers",
          },
        ],
      },

      /* 2 — PAGES */
      {
        dateRanges: [
          {
            startDate: rangeStart,
            endDate: "today",
          },
        ],
        dimensions: [
          {
            name: "pagePathPlusQueryString",
          },
        ],
        metrics: [
          {
            name: "screenPageViews",
          },
          {
            name: "totalUsers",
          },
          {
            name: "userEngagementDuration",
          },
        ],
        orderBys: [
          {
            metric: {
              metricName: "screenPageViews",
            },
            desc: true,
          },
        ],
        limit: 10,
      },

      /* 3 — DAILY USERS */
      {
        dateRanges: [
          {
            startDate: rangeStart,
            endDate: "today",
          },
        ],
        dimensions: [
          {
            name: "date",
          },
        ],
        metrics: [
          {
            name: "totalUsers",
          },
          {
            name: "sessions",
          },
        ],
        orderBys: [
          {
            dimension: {
              dimensionName: "date",
            },
          },
        ],
        limit: days + 1,
      },

      /* 4 — TRAFFIC SOURCES */
      {
        dateRanges: [
          {
            startDate: rangeStart,
            endDate: "today",
          },
        ],
        dimensions: [
          {
            name: "sessionSourceMedium",
          },
        ],
        metrics: [
          {
            name: "sessions",
          },
          {
            name: "totalUsers",
          },
        ],
        orderBys: [
          {
            metric: {
              metricName: "sessions",
            },
            desc: true,
          },
        ],
        limit: 10,
      },

      /* 5 — DEVICES */
      {
        dateRanges: [
          {
            startDate: rangeStart,
            endDate: "today",
          },
        ],
        dimensions: [
          {
            name: "deviceCategory",
          },
        ],
        metrics: [
          {
            name: "totalUsers",
          },
          {
            name: "sessions",
          },
        ],
        orderBys: [
          {
            metric: {
              metricName: "totalUsers",
            },
            desc: true,
          },
        ],
        limit: 10,
      },
    ]
  );

  /*
    BATCH 2

    6. Countries
    7. Cities
    8. Events
    9. Landing pages

    (button click events run separately below, not part of this batch)
  */

  const batch2 = await runBatchReports(
    accessToken,
    [
      /* 6 — COUNTRIES */
      {
        dateRanges: [
          {
            startDate: rangeStart,
            endDate: "today",
          },
        ],
        dimensions: [
          {
            name: "country",
          },
        ],
        metrics: [
          {
            name: "totalUsers",
          },
          {
            name: "sessions",
          },
        ],
        orderBys: [
          {
            metric: {
              metricName: "totalUsers",
            },
            desc: true,
          },
        ],
        limit: 10,
      },

      /* 7 — CITIES */
      {
        dateRanges: [
          {
            startDate: rangeStart,
            endDate: "today",
          },
        ],
        dimensions: [
          {
            name: "city",
          },
        ],
        metrics: [
          {
            name: "totalUsers",
          },
          {
            name: "sessions",
          },
        ],
        orderBys: [
          {
            metric: {
              metricName: "totalUsers",
            },
            desc: true,
          },
        ],
        limit: 10,
      },

      /* 8 — EVENTS */
      {
        dateRanges: [
          {
            startDate: rangeStart,
            endDate: "today",
          },
        ],
        dimensions: [
          {
            name: "eventName",
          },
        ],
        metrics: [
          {
            name: "eventCount",
          },
        ],
        orderBys: [
          {
            metric: {
              metricName: "eventCount",
            },
            desc: true,
          },
        ],
        limit: 20,
      },

      /* 9 — LANDING PAGES */
      {
        dateRanges: [
          {
            startDate: rangeStart,
            endDate: "today",
          },
        ],
        dimensions: [
          {
            name: "landingPagePlusQueryString",
          },
        ],
        metrics: [
          {
            name: "sessions",
          },
          {
            name: "totalUsers",
          },
        ],
        orderBys: [
          {
            metric: {
              metricName: "sessions",
            },
            desc: true,
          },
        ],
        limit: 10,
      },
    ]
  );

  /*
    BUTTON CLICK EVENTS — run as its own isolated call, not part of
    batch2. Grouped by the "button_name" event parameter (registered as
    a GA4 custom dimension: customEvent:button_name), restricted to our
    "button_click" event via a filter so exact per-button names and
    counts come back instead of a generic event-name list. The filter
    field (eventName) does not need to be one of the output dimensions,
    so the single output dimension here is the button name itself —
    dimensionValues[0] on every returned row.

    Kept separate and wrapped in try/catch on purpose: if the
    customEvent:button_name dimension isn't registered in GA4 yet (or
    briefly fails for any other reason), Google rejects that one request
    with a 400 — and since batchRunReports fails its ENTIRE batch when
    any single request in it is invalid, bundling this with the other
    reports would take down pages/traffic/devices/etc. too. Isolating it
    means only the button-click section degrades to empty instead of the
    whole dashboard.
  */

  let buttonClicks = null;

  try {
    buttonClicks = await runReport(accessToken, {
      dateRanges: [
        {
          startDate: rangeStart,
          endDate: "today",
        },
      ],
      dimensions: [
        {
          name: "customEvent:button_name",
        },
      ],
      metrics: [
        {
          name: "eventCount",
        },
      ],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          stringFilter: {
            matchType: "EXACT",
            value: "button_click",
          },
        },
      },
      orderBys: [
        {
          metric: {
            metricName: "eventCount",
          },
          desc: true,
        },
      ],
      limit: 20,
    });
  } catch (error) {
    console.error(
      "Button click report failed (is the button_name custom dimension registered in GA4 yet?):",
      error
    );
  }

  /*
    REALTIME — two separate queries on purpose:

    1. Totals query (no dimensions) — the one true count of active users
       right now, straight from Google. Never derived from the pages query.
    2. Pages query (unifiedScreenName dimension) — active users broken
       down by page/screen, for the "who's where" list.
  */

  const [realtimeTotal, realtimePages] = await Promise.all([
    runRealtimeReport(accessToken, []),
    runRealtimeReport(accessToken, [
      {
        name: "unifiedScreenName",
      },
    ]),
  ]);

  const realtime = {
    total: realtimeTotal,
    pages: realtimePages,
  };

  return {
    overview:
      batch1.reports?.[0] ?? null,

    pages:
      batch1.reports?.[1] ?? null,

    daily:
      batch1.reports?.[2] ?? null,

    traffic:
      batch1.reports?.[3] ?? null,

    devices:
      batch1.reports?.[4] ?? null,

    countries:
      batch2.reports?.[0] ?? null,

    cities:
      batch2.reports?.[1] ?? null,

    events:
      batch2.reports?.[2] ?? null,

    landingPages:
      batch2.reports?.[3] ?? null,

    buttonClicks,

    realtime,
  };
}

/* ---------------------------------------
   SUPABASE FUNCTION
--------------------------------------- */

export default {
  fetch: withSupabase(
    { auth: "user" },
    async (_req: any, _ctx: any) => {
      if (_req.method === "OPTIONS") {
        return new Response("ok", {
          headers: corsHeaders,
        });
      }

      try {
        const accessToken =
          await getGoogleAccessToken();

        // Caller picks a date range (7 / 15 / 30 days) via the request
        // body; anything missing or not one of the allowed values falls
        // back to the default 30-day window.
        let days = DEFAULT_DAYS;

        try {
          const body = await _req.json();
          const requestedDays = Number(body?.days);

          if (ALLOWED_DAY_RANGES.includes(requestedDays)) {
            days = requestedDays;
          }
        } catch (_error) {
          // No/invalid JSON body — keep the default range.
        }

        const data =
          await runAnalyticsReports(
            accessToken,
            days
          );

        return new Response(
          JSON.stringify({
            success: true,
            propertyId: PROPERTY_ID,
            days,
            data,
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type":
                "application/json",
            },
          }
        );
      } catch (error) {
        console.error(error);

        return new Response(
          JSON.stringify({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Unknown error",
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type":
                "application/json",
            },
          }
        );
      }
    }
  ),
};
