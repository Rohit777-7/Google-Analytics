import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Eye,
  LogOut,
  Menu,
  MousePointerClick,
  RefreshCw,
  Route,
  Smartphone,
  Target,
  Users,
} from "lucide-react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useNavigate } from "react-router-dom";

import { supabase } from "../lib/supabase";
import Sidebar from "./components/Sidebar";

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */

function number(value) {
  return Number(value || 0);
}

function formatNumber(value) {
  return number(value).toLocaleString();
}

function formatDuration(seconds) {
  seconds = Math.round(number(seconds));

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

function getRows(report) {
  return report?.rows || [];
}

function getDimension(row, index = 0) {
  return row?.dimensionValues?.[index]?.value || "(not set)";
}

function getMetric(row, index = 0) {
  return number(row?.metricValues?.[index]?.value);
}

function formatDate(value) {
  if (!value || value.length !== 8) {
    return value;
  }

  const year = value.slice(0, 4);
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));

  const date = new Date(
    Number(year),
    month - 1,
    Number(day)
  );

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function daysAgoISOString(rangeDays) {
  return new Date(
    Date.now() - rangeDays * 24 * 60 * 60 * 1000
  ).toISOString();
}

// Screen keys the public site's App.jsx uses for both GA4 virtual
// pageviews and heatmap tracking — kept in sync with that file's
// SCREEN_META object.
const HEATMAP_PAGES = [
  { id: "home", label: "Home" },
  { id: "explore", label: "Explore" },
  { id: "panorama", label: "360 View" },
  { id: "gallery", label: "Gallery" },
  { id: "about", label: "About Us" },
  { id: "amenities", label: "Amenities" },
  { id: "floorplans", label: "Floor Plans" },
  { id: "contact", label: "Contact" },
];

const HEATMAP_DEVICES = ["all", "desktop", "tablet", "mobile"];

// Conversion funnel steps for the User Journey-derived funnel — pages
// use the same screen keys as HEATMAP_PAGES/SCREEN_META.
const FUNNEL_STEPS = [
  { id: "home", label: "Home", pages: ["home"] },
  { id: "explore", label: "Explore", pages: ["explore"] },
  {
    id: "detail",
    label: "360 View / Gallery / Amenities / Floor Plans",
    pages: ["panorama", "gallery", "amenities", "floorplans"],
  },
  { id: "contact", label: "Contact", pages: ["contact"] },
];

/* -------------------------------------------------------
   DASHBOARD
------------------------------------------------------- */

function AdminDashboard() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] =
    useState("dashboard");

  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState(30);

  const [gaData, setGaData] = useState(null);
  const [gaError, setGaError] = useState(null);

  /* -----------------------------------------------------
     LOAD GA4
  ----------------------------------------------------- */

  const loadAnalytics = async (rangeDays = days) => {
    try {
      setRefreshing(true);
      setGaError(null);

      console.log("Calling GA4 Edge Function...");

      const { data, error } =
        await supabase.functions.invoke(
          "rapid-handler",
          {
            body: { days: rangeDays },
          }
        );

      if (error) {
        console.error(
          "GA4 FUNCTION ERROR:",
          error
        );

        setGaError(error);
        return;
      }

      console.log(
        "GA4 FUNCTION DATA:",
        data
      );

      setGaData(data);
    } catch (error) {
      console.error(
        "GA4 DASHBOARD ERROR:",
        error
      );

      setGaError(error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDaysChange = (event) => {
    const nextDays = Number(event.target.value);
    setDays(nextDays);
    loadAnalytics(nextDays);
    loadJourney(nextDays);
    loadButtonAnalytics(nextDays);
    loadGeoAnalytics(nextDays);
  };

  /* -----------------------------------------------------
     HEATMAPS

     Reads directly from the heatmap_events table (RLS: authenticated
     users can select, the public site can only insert) rather than
     going through the rapid-handler edge function — this data never
     touches Google Analytics at all.
  ----------------------------------------------------- */

  const [heatmapPage, setHeatmapPageState] = useState("home");
  const [heatmapDevice, setHeatmapDevice] = useState("all");
  const [heatmapClicks, setHeatmapClicks] = useState([]);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [heatmapError, setHeatmapError] = useState(null);

  const loadHeatmap = async (
    page = heatmapPage,
    device = heatmapDevice
  ) => {
    setHeatmapLoading(true);
    setHeatmapError(null);

    try {
      let clickQuery = supabase
        .from("heatmap_events")
        .select("x_pct, y_pct")
        .eq("page", page)
        .eq("event_type", "click")
        .limit(5000);

      if (device !== "all") {
        clickQuery = clickQuery.eq(
          "device_type",
          device
        );
      }

      const { data, error } = await clickQuery;

      if (error) {
        throw error;
      }

      setHeatmapClicks(data || []);
    } catch (error) {
      console.error(
        "HEATMAP ERROR:",
        error
      );

      setHeatmapError(
        error.message ||
          "Failed to load heatmap data."
      );
    } finally {
      setHeatmapLoading(false);
    }
  };

  useEffect(() => {
    loadHeatmap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleHeatmapPageChange = (event) => {
    const page = event.target.value;
    setHeatmapPageState(page);
    loadHeatmap(page, heatmapDevice);
  };

  const handleHeatmapDeviceChange = (device) => {
    setHeatmapDevice(device);
    loadHeatmap(heatmapPage, device);
    loadJourney(days, device);
    loadButtonAnalytics(days, device);
    loadGeoAnalytics(days, device);
  };

  const HEATMAP_GRID_COLS = 20;
  const HEATMAP_GRID_ROWS = 12;

  const heatmapGrid = useMemo(() => {
    const cells = new Array(
      HEATMAP_GRID_COLS * HEATMAP_GRID_ROWS
    ).fill(0);

    heatmapClicks.forEach((point) => {
      const col = Math.min(
        HEATMAP_GRID_COLS - 1,
        Math.floor(
          (number(point.x_pct) / 100) *
            HEATMAP_GRID_COLS
        )
      );

      const row = Math.min(
        HEATMAP_GRID_ROWS - 1,
        Math.floor(
          (number(point.y_pct) / 100) *
            HEATMAP_GRID_ROWS
        )
      );

      cells[row * HEATMAP_GRID_COLS + col] += 1;
    });

    const max = Math.max(1, ...cells);

    return cells.map((count) => count / max);
  }, [heatmapClicks]);

  /* -----------------------------------------------------
     USER JOURNEY

     Reconstructed from real per-session "pageview" rows in
     heatmap_events (one row per screen actually visited, fired by the
     public site whenever the current screen changes). GA4's Data API
     has no endpoint for session-level ordered event sequences — that's
     only available through GA4's UI-only Path Exploration feature or a
     paid BigQuery export, neither of which this project has — so this
     is the closest reliable real data actually available, not GA4, and
     not invented.
  ----------------------------------------------------- */

  const [journeyRows, setJourneyRows] = useState([]);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [journeyError, setJourneyError] = useState(null);

  const loadJourney = async (
    rangeDays = days,
    device = heatmapDevice
  ) => {
    setJourneyLoading(true);
    setJourneyError(null);

    try {
      const cutoff = daysAgoISOString(rangeDays);

      // created_at alone isn't a reliable sequence key: Postgres's now()
      // returns the transaction timestamp, so every pageview row in the
      // same batched insert (heatmap.js flushes several at once) gets an
      // identical created_at — ORDER BY created_at alone leaves those
      // tied rows in an undefined order. id (the identity column, true
      // insertion order) breaks ties deterministically and matches the
      // real order events were captured in.
      let journeyQuery = supabase
        .from("heatmap_events")
        .select("id, session_id, page, created_at")
        .eq("event_type", "pageview")
        .gte("created_at", cutoff)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(10000);

      if (device !== "all") {
        journeyQuery = journeyQuery.eq(
          "device_type",
          device
        );
      }

      const { data, error } = await journeyQuery;

      if (error) {
        throw error;
      }

      // TEMPORARY DEBUG — remove once the journey reconstruction bug is
      // confirmed fixed. Shows exactly what the query returned before any
      // client-side grouping/dedup touches it.
      console.log("RAW PAGEVIEWS", data);

      setJourneyRows(data || []);
    } catch (error) {
      console.error(
        "JOURNEY ERROR:",
        error
      );

      setJourneyError(
        error.message ||
          "Failed to load user journey data."
      );
    } finally {
      setJourneyLoading(false);
    }
  };

  useEffect(() => {
    loadJourney();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One ordered, deduped page sequence per session — consecutive
  // duplicate pageview rows for the same screen collapse into one step.
  const journeyPaths = useMemo(() => {
    const bySession = new Map();

    journeyRows.forEach((row) => {
      const list = bySession.get(row.session_id) || [];

      if (list[list.length - 1] !== row.page) {
        list.push(row.page);
      }

      bySession.set(row.session_id, list);
    });

    const result = Array.from(bySession.values()).filter(
      (path) => path.length > 0
    );

    // TEMPORARY DEBUG — remove once confirmed fixed.
    console.log("JOURNEY PATHS", result);

    return result;
  }, [journeyRows]);

  const totalJourneySessions = journeyPaths.length;

  const journeyLabel = (pageId) =>
    HEATMAP_PAGES.find(
      (page) => page.id === pageId
    )?.label || pageId;

  const topPaths = useMemo(() => {
    const counts = new Map();

    journeyPaths.forEach((path) => {
      const key = path.join("|");
      const entry = counts.get(key) || { path, count: 0 };
      entry.count += 1;
      counts.set(key, entry);
    });

    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [journeyPaths]);

  const entryScreens = useMemo(() => {
    const counts = new Map();

    journeyPaths.forEach((path) => {
      const first = path[0];
      counts.set(first, (counts.get(first) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count);
  }, [journeyPaths]);

  const topTransitions = useMemo(() => {
    const counts = new Map();

    journeyPaths.forEach((path) => {
      for (let i = 0; i < path.length - 1; i += 1) {
        const key = `${path[i]}|${path[i + 1]}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });

    return Array.from(counts.entries())
      .map(([key, count]) => {
        const [from, to] = key.split("|");
        return { from, to, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [journeyPaths]);

  // How many sessions ever passed through each screen, anywhere in their
  // path (not just as the first or last step) — used both for the "X
  // sessions / Y%" badge on each card in the flow visual and as the
  // denominator for drop-off rate below.
  const screenPresence = useMemo(() => {
    const counts = new Map();

    journeyPaths.forEach((path) => {
      new Set(path).forEach((page) => {
        counts.set(page, (counts.get(page) || 0) + 1);
      });
    });

    return counts;
  }, [journeyPaths]);

  // Drop-off rate = of the sessions that reached this screen at all, what
  // fraction never continued to another screen. A page that's reached
  // often but rarely exited from is healthy; one where most visits end
  // there is a real drop-off point.
  const dropoffStats = useMemo(() => {
    const exits = new Map();

    journeyPaths.forEach((path) => {
      const last = path[path.length - 1];
      exits.set(last, (exits.get(last) || 0) + 1);
    });

    return Array.from(screenPresence.entries())
      .map(([page, visits]) => {
        const exitCount = exits.get(page) || 0;
        return {
          page,
          visits,
          exitCount,
          dropoffRate:
            visits > 0 ? (exitCount / visits) * 100 : 0,
        };
      })
      .sort((a, b) => b.dropoffRate - a.dropoffRate);
  }, [journeyPaths, screenPresence]);

  const avgScreensPerSession =
    totalJourneySessions > 0
      ? journeyPaths.reduce(
          (sum, path) => sum + path.length,
          0
        ) / totalJourneySessions
      : 0;

  const contactReachCount = journeyPaths.filter((path) =>
    path.includes("contact")
  ).length;

  const contactReachPercent =
    totalJourneySessions > 0
      ? (contactReachCount / totalJourneySessions) * 100
      : 0;

  // TEMPORARY DEBUG — remove once confirmed fixed. Logs the fully
  // computed downstream values every time journeyPaths changes, so
  // they're captured together instead of scattered across renders.
  useEffect(() => {
    console.log("TOTAL JOURNEY SESSIONS", totalJourneySessions);
    console.log("AVG SCREENS PER SESSION", avgScreensPerSession);
    console.log("TOP PATHS", topPaths);
  }, [
    journeyPaths,
    totalJourneySessions,
    avgScreensPerSession,
    topPaths,
  ]);

  /* -----------------------------------------------------
     CONVERSION FUNNEL

     Derived entirely from journeyPaths (already fetched above for User
     Journey) — no extra query needed. Each step counts sessions whose
     path includes ANY of that step's pages at least once; this is the
     same "presence" model screenPresence/dropoffStats already use, real
     recorded data, not a strict ordered/causal funnel.
  ----------------------------------------------------- */

  const funnelSteps = useMemo(() => {
    const steps = FUNNEL_STEPS.map((step) => ({
      ...step,
      count: journeyPaths.filter((path) =>
        path.some((page) => step.pages.includes(page))
      ).length,
    }));

    const firstCount = steps[0]?.count || 0;

    return steps.map((step, index) => {
      const prevCount =
        index > 0 ? steps[index - 1].count : step.count;

      const conversionFromPrevious =
        index === 0
          ? 100
          : prevCount > 0
          ? (step.count / prevCount) * 100
          : 0;

      return {
        ...step,
        percentOfTotal:
          firstCount > 0
            ? (step.count / firstCount) * 100
            : 0,
        conversionFromPrevious,
        dropOffFromPrevious:
          index === 0
            ? 0
            : 100 - conversionFromPrevious,
      };
    });
  }, [journeyPaths]);

  /* -----------------------------------------------------
     BUTTON ANALYTICS (real-time, Supabase-backed)

     Reads heatmap_events 'click' rows that carry a button_name — every
     click already gets recorded for the heatmap, so tagging the ones
     that landed on a tracked button (via a data-button-name attribute
     the site's global click listener checks for) rides on that
     existing, already-reliable stream instead of a separate explicit
     call per button. This is separate from — and does not replace —
     the existing GA4 button click report further down (from
     rapid-handler's customEvent:button_name dimension). GA4 custom
     dimensions can take a while to start reflecting new data after
     being registered, and don't offer device or time-series
     breakdowns; these Supabase rows are written in real time by the
     same site code that already fires the GA4 event, so this panel has
     data immediately and can be sliced by device/day.
  ----------------------------------------------------- */

  const [buttonEvents, setButtonEvents] = useState([]);
  const [
    buttonAnalyticsLoading,
    setButtonAnalyticsLoading,
  ] = useState(false);
  const [buttonAnalyticsError, setButtonAnalyticsError] =
    useState(null);

  const loadButtonAnalytics = async (
    rangeDays = days,
    device = heatmapDevice
  ) => {
    setButtonAnalyticsLoading(true);
    setButtonAnalyticsError(null);

    try {
      const cutoff = daysAgoISOString(rangeDays);

      // Button identity now rides on the regular 'click' event stream
      // (heatmap.js tags button_name on any click whose target has a
      // data-button-name ancestor) rather than a separate event_type —
      // one reliable stream instead of two that could drift apart.
      let buttonQuery = supabase
        .from("heatmap_events")
        .select("button_name, device_type, created_at")
        .eq("event_type", "click")
        .not("button_name", "is", null)
        .gte("created_at", cutoff)
        .limit(10000);

      if (device !== "all") {
        buttonQuery = buttonQuery.eq(
          "device_type",
          device
        );
      }

      const { data, error } = await buttonQuery;

      if (error) {
        throw error;
      }

      setButtonEvents(data || []);
    } catch (error) {
      console.error(
        "BUTTON ANALYTICS ERROR:",
        error
      );

      setButtonAnalyticsError(
        error.message ||
          "Failed to load button analytics."
      );
    } finally {
      setButtonAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    loadButtonAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalButtonClicks = buttonEvents.length;

  const clicksByButton = useMemo(() => {
    const counts = new Map();

    buttonEvents.forEach((row) => {
      const name = row.button_name || "(unknown)";
      counts.set(name, (counts.get(name) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [buttonEvents]);

  const clicksByDevice = useMemo(() => {
    const counts = new Map();

    buttonEvents.forEach((row) => {
      const device = row.device_type || "unknown";
      counts.set(device, (counts.get(device) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count);
  }, [buttonEvents]);

  const clicksOverTime = useMemo(() => {
    const counts = new Map();

    buttonEvents.forEach((row) => {
      const day = (row.created_at || "").slice(0, 10);
      if (!day) return;
      counts.set(day, (counts.get(day) || 0) + 1);
    });

    return Array.from(counts.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([day, count]) => ({
        date: new Date(day).toLocaleDateString(
          "en-US",
          {
            month: "short",
            day: "numeric",
          }
        ),
        clicks: count,
      }));
  }, [buttonEvents]);

  /* -----------------------------------------------------
     VISITOR LOCATIONS — real-time, privacy-safe fallback

     Reads country/city columns on heatmap_events, populated by the
     site's api/geo.js edge function reading Vercel's own
     x-vercel-ip-country / x-vercel-ip-city request headers — resolved
     server-side by Vercel's edge network before any app code runs, and
     that's ALL this ever sees: two short strings, never the visitor's
     IP address. This is a separate, independent signal from GA4 (a
     different IP-geolocation database), not a replacement — GA4's own
     Countries/Cities panel above is untouched and stays the primary
     source. This panel only covers real sessions recorded since this
     feature was deployed, not GA4's historical data.

     Counts are per distinct session (one session can fire many rows
     that all carry the same country/city), so a visitor isn't counted
     once per click.
  ----------------------------------------------------- */

  const [geoRows, setGeoRows] = useState([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);

  const loadGeoAnalytics = async (
    rangeDays = days,
    device = heatmapDevice
  ) => {
    setGeoLoading(true);
    setGeoError(null);

    try {
      const cutoff = daysAgoISOString(rangeDays);

      let geoQuery = supabase
        .from("heatmap_events")
        .select("session_id, country, city")
        .not("country", "is", null)
        .gte("created_at", cutoff)
        .limit(10000);

      if (device !== "all") {
        geoQuery = geoQuery.eq("device_type", device);
      }

      const { data, error } = await geoQuery;

      if (error) {
        throw error;
      }

      setGeoRows(data || []);
    } catch (error) {
      console.error(
        "GEO ANALYTICS ERROR:",
        error
      );

      setGeoError(
        error.message ||
          "Failed to load visitor locations."
      );
    } finally {
      setGeoLoading(false);
    }
  };

  useEffect(() => {
    loadGeoAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const geoBySession = useMemo(() => {
    const bySession = new Map();

    geoRows.forEach((row) => {
      if (!bySession.has(row.session_id)) {
        bySession.set(row.session_id, {
          country: row.country,
          city: row.city || "Unknown / Not available",
        });
      }
    });

    return Array.from(bySession.values());
  }, [geoRows]);

  const geoTotalSessions = geoBySession.length;

  const geoCountries = useMemo(() => {
    const counts = new Map();

    geoBySession.forEach(({ country }) => {
      counts.set(country, (counts.get(country) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [geoBySession]);

  const geoCities = useMemo(() => {
    const counts = new Map();

    geoBySession.forEach(({ city }) => {
      counts.set(city, (counts.get(city) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [geoBySession]);

  /* -----------------------------------------------------
     LOGOUT
  ----------------------------------------------------- */

  const handleLogout = async () => {
    await supabase.auth.signOut();

    navigate("/admin/login", {
      replace: true,
    });
  };

  /* -----------------------------------------------------
     RAW REPORTS
  ----------------------------------------------------- */

  const reports = gaData?.data || {};

  const overviewReport =
    reports.overview;

  const pagesReport =
    reports.pages;

  const dailyReport =
    reports.daily;

  const eventsReport =
    reports.events;

  const realtimeTotalReport =
    reports.realtime?.total;

  const realtimePagesReport =
    reports.realtime?.pages;

  const trafficReport =
    reports.traffic;

  const devicesReport =
    reports.devices;

  const countriesReport =
    reports.countries;

  const citiesReport =
    reports.cities;

  /* -----------------------------------------------------
     OVERVIEW
  ----------------------------------------------------- */

  const overviewRow =
    overviewReport?.rows?.[0];

  const totalUsers =
    getMetric(overviewRow, 0);

  const sessions =
    getMetric(overviewRow, 1);

  const pageViews =
    getMetric(overviewRow, 2);

  const engagementDuration =
    getMetric(overviewRow, 3);

  /*
    GA4 userEngagementDuration is total
    engagement time in seconds.

    Average engagement time per user:
    total engagement / users
  */

  const averageEngagement =
    totalUsers > 0
      ? engagementDuration / totalUsers
      : 0;

  const newUsers =
    getMetric(overviewRow, 4);

  const returningUsers = Math.max(
    0,
    totalUsers - newUsers
  );

  /* -----------------------------------------------------
     DAILY VISITORS
  ----------------------------------------------------- */

  const visitorData = getRows(
    dailyReport
  ).map((row) => ({
    date: formatDate(
      getDimension(row, 0)
    ),
    users: getMetric(row, 0),
  }));

  /* -----------------------------------------------------
     PAGES
  ----------------------------------------------------- */

  const pages = getRows(
    pagesReport
  ).map((row) => {
    const path = getDimension(row, 0);

    const views = getMetric(row, 0);
    const users = getMetric(row, 1);

    const engagement =
      getMetric(row, 2);

    const avgTime =
      users > 0
        ? engagement / users
        : 0;

    return {
      name: path,
      views,
      users,
      time: formatDuration(avgTime),
    };
  });

  /* -----------------------------------------------------
     BUTTON / CLICK EVENTS
  ----------------------------------------------------- */

  const buttons = getRows(
    reports.buttonClicks
  ).map((row) => ({
    name: getDimension(row, 0),
    clicks: getMetric(row, 0),
  }));

  /* -----------------------------------------------------
     REALTIME
  ----------------------------------------------------- */

  const liveVisitors = getMetric(
    getRows(realtimeTotalReport)[0],
    0
  );

  const livePages = getRows(
    realtimePagesReport
  )
    .map((row) => ({
      page: getDimension(row, 0),
      users: getMetric(row, 0),
    }))
    .sort(
      (a, b) => b.users - a.users
    )
    .slice(0, 5);

  /* -----------------------------------------------------
     TRAFFIC / DEVICES / LOCATIONS
  ----------------------------------------------------- */

  const trafficSources = getRows(
    trafficReport
  )
    .map((row) => ({
      source: getDimension(row, 0),
      sessions: getMetric(row, 0),
    }))
    .slice(0, 6);

  const devices = getRows(
    devicesReport
  ).map((row) => ({
    category: getDimension(row, 0),
    users: getMetric(row, 0),
  }));

  const countries = getRows(
    countriesReport
  )
    .map((row) => ({
      country: getDimension(row, 0),
      users: getMetric(row, 0),
    }))
    .slice(0, 5);

  const cities = getRows(
    citiesReport
  )
    .map((row) => ({
      city: getDimension(row, 0),
      users: getMetric(row, 0),
    }))
    .slice(0, 5);

  /* -----------------------------------------------------
     OTHER METRICS
  ----------------------------------------------------- */

  const pagesPerSession =
    sessions > 0
      ? pageViews / sessions
      : 0;

  /* -----------------------------------------------------
     UI
  ----------------------------------------------------- */

  return (
    <div className="min-h-screen bg-[#080b12] text-white">

      {/* SIDEBAR */}

      <Sidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        onLogout={handleLogout}
      />

      {/* MAIN */}

      <div className="lg:pl-[260px]">

        {/* HEADER */}

        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-white/[0.07] bg-[#080b12]/90 px-5 backdrop-blur-xl lg:px-8">

          <div className="flex items-center gap-4">

            <button
              onClick={() =>
                setSidebarOpen(true)
              }
              className="text-white/45 transition hover:text-white lg:hidden"
            >
              <Menu
                size={21}
                strokeWidth={1.5}
              />
            </button>

            <div>
              <p className="text-[9px] uppercase tracking-[0.35em] text-white/25">
                Analytics
              </p>

              <h1 className="mt-1 text-[17px] font-medium">
                Overview
              </h1>
            </div>

          </div>

          <div className="flex items-center gap-3">

            {/* GA STATUS */}

            <div className="hidden items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 sm:flex">

              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

              <span className="text-[10px] text-white/45">
                {gaData?.success
                  ? "GA4 Connected"
                  : "Connecting..."}
              </span>

            </div>

            {/* REFRESH */}

            <button
              onClick={loadAnalytics}
              disabled={refreshing}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-white/40 transition hover:border-white/20 hover:text-white disabled:opacity-40"
            >
              <RefreshCw
                size={15}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />
            </button>

          </div>
        </header>

        {/* CONTENT */}

        <main className="mx-auto max-w-[1800px] px-5 py-7 lg:px-8 lg:py-9">

          {/* TITLE */}

          <section className="mb-8 flex flex-col justify-between gap-6 xl:flex-row xl:items-end">

            <div>

              <p className="text-[9px] uppercase tracking-[0.4em] text-white/25">
                Performance overview
              </p>

              <h2 className="mt-2 text-3xl font-light tracking-tight md:text-4xl">
                Website analytics
              </h2>

              <p className="mt-2 text-sm text-white/30">
                Real-time data from Google Analytics 4.
              </p>

            </div>

            <div className="flex items-center gap-3">

              <select
                value={days}
                onChange={handleDaysChange}
                disabled={refreshing}
                className="h-10 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 text-xs text-white/50 outline-none disabled:opacity-40"
              >
                <option className="bg-[#0b0e14]" value={7}>
                  Last 7 Days
                </option>

                <option className="bg-[#0b0e14]" value={15}>
                  Last 15 Days
                </option>

                <option className="bg-[#0b0e14]" value={30}>
                  Last 30 Days
                </option>
              </select>

              <button
                onClick={handleLogout}
                className="hidden h-10 items-center gap-2 rounded-lg border border-white/[0.08] px-3 text-xs text-white/40 transition hover:border-white/20 hover:text-white sm:flex"
              >
                <LogOut size={14} />
                Logout
              </button>

            </div>

          </section>

          {/* STAT CARDS */}

          <section id="dashboard" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <StatCard
              icon={<Users size={17} />}
              title="Total users"
              value={formatNumber(
                totalUsers
              )}
              change="GA4"
              description={`Last ${days} days`}
            />

            <StatCard
              icon={<Activity size={17} />}
              title="Sessions"
              value={formatNumber(
                sessions
              )}
              change="GA4"
              description={`Last ${days} days`}
            />

            <StatCard
              icon={<Eye size={17} />}
              title="Page views"
              value={formatNumber(
                pageViews
              )}
              change="GA4"
              description="Total page views"
            />

            <StatCard
              icon={<Clock3 size={17} />}
              title="Avg. engagement"
              value={formatDuration(
                averageEngagement
              )}
              change="GA4"
              description="Average engagement per user"
            />

          </section>

          {/* VISITORS CHART */}

          <section className="mt-5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 lg:p-6">

            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

              <div>

                <p className="text-[9px] uppercase tracking-[0.3em] text-white/25">
                  Audience
                </p>

                <h3 className="mt-2 text-lg font-medium">
                  Visitors over time
                </h3>

              </div>

              <p className="text-xs text-white/25">
                Last {days} days
              </p>

            </div>

            <div className="h-[300px] w-full">

              {visitorData.length > 0 ? (

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <AreaChart
                    data={visitorData}
                  >

                    <defs>

                      <linearGradient
                        id="visitorFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >

                        <stop
                          offset="0%"
                          stopColor="#ffffff"
                          stopOpacity={0.15}
                        />

                        <stop
                          offset="100%"
                          stopColor="#ffffff"
                          stopOpacity={0}
                        />

                      </linearGradient>

                    </defs>

                    <CartesianGrid
                      stroke="rgba(255,255,255,0.05)"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "rgba(255,255,255,0.28)",
                        fontSize: 10,
                      }}
                    />

                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "rgba(255,255,255,0.28)",
                        fontSize: 10,
                      }}
                    />

                    <Tooltip
                      contentStyle={{
                        background: "#10141c",
                        border:
                          "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "10px",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="users"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      fill="url(#visitorFill)"
                    />

                  </AreaChart>

                </ResponsiveContainer>

              ) : (

                <EmptyState text="No visitor data available yet." />

              )}

            </div>

          </section>

          {/* PAGES + BUTTONS */}

          <section className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_1fr]">

            {/* PAGES */}

            <div id="pages" className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">

              <div className="border-b border-white/[0.07] p-5 lg:p-6">

                <p className="text-[9px] uppercase tracking-[0.3em] text-white/25">
                  Content
                </p>

                <div className="mt-2 flex items-center justify-between">

                  <h3 className="text-lg font-medium">
                    Most visited pages
                  </h3>

                  <ArrowUpRight
                    size={17}
                    className="text-white/25"
                  />

                </div>

              </div>

              <div className="overflow-x-auto">

                <table className="w-full min-w-[650px] text-left">

                  <thead>

                    <tr className="border-b border-white/[0.05] text-[9px] uppercase tracking-[0.2em] text-white/20">

                      <th className="px-6 py-4 font-normal">
                        Page
                      </th>

                      <th className="px-6 py-4 font-normal">
                        Views
                      </th>

                      <th className="px-6 py-4 font-normal">
                        Users
                      </th>

                      <th className="px-6 py-4 font-normal">
                        Avg. time
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {pages.length > 0 ? (

                      pages.map((page) => (

                        <tr
                          key={page.name}
                          className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"
                        >

                          <td className="px-6 py-4 text-sm text-white/75">
                            {page.name}
                          </td>

                          <td className="px-6 py-4 text-sm text-white/45">
                            {formatNumber(
                              page.views
                            )}
                          </td>

                          <td className="px-6 py-4 text-sm text-white/45">
                            {formatNumber(
                              page.users
                            )}
                          </td>

                          <td className="px-6 py-4 text-sm text-white/45">
                            {page.time}
                          </td>

                        </tr>

                      ))

                    ) : (

                      <tr>
                        <td
                          colSpan="4"
                          className="px-6 py-10 text-center text-sm text-white/25"
                        >
                          No page data available yet.
                        </td>
                      </tr>

                    )}

                  </tbody>

                </table>

              </div>

            </div>

            {/* CLICK EVENTS (GA4) */}

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 lg:p-6">

              <div className="mb-8">

                <p className="text-[9px] uppercase tracking-[0.3em] text-white/25">
                  Interactions
                </p>

                <h3 className="mt-2 text-lg font-medium">
                  Most clicked events
                </h3>

              </div>

              {buttons.length > 0 ? (

                <div className="space-y-6">

                  {buttons.map(
                    (button, index) => {

                      const maxClicks =
                        buttons[0]?.clicks ||
                        1;

                      const percentage =
                        (button.clicks /
                          maxClicks) *
                        100;

                      return (
                        <div
                          key={`${button.name}-${index}`}
                        >

                          <div className="mb-2 flex items-center justify-between">

                            <span className="text-sm text-white/55">
                              {button.name}
                            </span>

                            <span className="text-xs text-white/30">
                              {formatNumber(
                                button.clicks
                              )}
                            </span>

                          </div>

                          <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">

                            <div
                              className="h-full rounded-full bg-white/70 transition-all duration-700"
                              style={{
                                width: `${percentage}%`,
                              }}
                            />

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

              ) : (

                <EmptyState
                  text="No click events found yet."
                />

              )}

            </div>

          </section>

          {/* BOTTOM */}

          <section className="mt-5 grid gap-5 lg:grid-cols-2">

            {/* LIVE */}

            <div id="live" className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 lg:p-6">

              <div className="flex items-end justify-between">

                <div>

                  <p className="text-[9px] uppercase tracking-[0.3em] text-white/25">
                    Realtime
                  </p>

                  <h3 className="mt-2 text-lg font-medium">
                    Live visitors
                  </h3>

                </div>

                <div className="flex items-center gap-2 text-[9px] text-emerald-400">

                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />

                  LIVE

                </div>

              </div>

              <div className="mt-8">

                <p className="text-5xl font-light">
                  {formatNumber(
                    liveVisitors
                  )}
                </p>

                <p className="mt-2 text-xs text-white/25">
                  active users right now
                </p>

              </div>

              <div className="mt-8 space-y-3">

                {livePages.length > 0 ? (

                  livePages.map(
                    (item, index) => (

                      <div
                        key={`${item.page}-${index}`}
                        className="flex items-center justify-between border-b border-white/[0.05] pb-3"
                      >

                        <span className="max-w-[70%] truncate text-sm text-white/50">
                          {item.page}
                        </span>

                        <span className="text-xs text-white/30">
                          {item.users} users
                        </span>

                      </div>

                    )
                  )

                ) : (

                  <p className="text-sm text-white/25">
                    No active visitors right now.
                  </p>

                )}

              </div>

            </div>

            {/* PERFORMANCE */}

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 lg:p-6">

              <p className="text-[9px] uppercase tracking-[0.3em] text-white/25">
                Engagement
              </p>

              <h3 className="mt-2 text-lg font-medium">
                Website performance
              </h3>

              <div className="mt-8 space-y-5">

                <PerformanceRow
                  label="Avg. engagement / user"
                  value={formatDuration(
                    averageEngagement
                  )}
                />

                <PerformanceRow
                  label="Total engagement"
                  value={formatDuration(
                    engagementDuration
                  )}
                />

                <PerformanceRow
                  label="Pages / session"
                  value={pagesPerSession.toFixed(
                    2
                  )}
                />

                <PerformanceRow
                  label="Page views"
                  value={formatNumber(
                    pageViews
                  )}
                />

              </div>

            </div>

          </section>

          {/* DEVICES + TRAFFIC + LOCATIONS */}

          <section className="mt-5 grid gap-5 lg:grid-cols-3">

            {/* DEVICES */}

            <div id="devices" className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 lg:p-6">

              <p className="text-[9px] uppercase tracking-[0.3em] text-white/25">
                Technology
              </p>

              <h3 className="mt-2 text-lg font-medium">
                Devices
              </h3>

              <div className="mt-8 space-y-5">

                {devices.length > 0 ? (

                  devices.map((device) => (
                    <PerformanceRow
                      key={device.category}
                      label={
                        device.category.charAt(0).toUpperCase() +
                        device.category.slice(1)
                      }
                      value={formatNumber(device.users)}
                    />
                  ))

                ) : (

                  <EmptyState text="No device data yet." />

                )}

              </div>

            </div>

            {/* TRAFFIC SOURCES */}

            <div id="traffic" className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 lg:p-6">

              <p className="text-[9px] uppercase tracking-[0.3em] text-white/25">
                Acquisition
              </p>

              <h3 className="mt-2 text-lg font-medium">
                Traffic sources
              </h3>

              <div className="mt-8 space-y-5">

                {trafficSources.length > 0 ? (

                  trafficSources.map((item) => (
                    <PerformanceRow
                      key={item.source}
                      label={item.source}
                      value={formatNumber(item.sessions)}
                    />
                  ))

                ) : (

                  <EmptyState text="No traffic source data yet." />

                )}

              </div>

            </div>

            {/* LOCATIONS */}

            <div id="locations" className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 lg:p-6">

              <p className="text-[9px] uppercase tracking-[0.3em] text-white/25">
                Audience
              </p>

              <h3 className="mt-2 text-lg font-medium">
                Top locations
              </h3>

              <div className="mt-6">

                <p className="mb-3 text-[9px] uppercase tracking-[0.25em] text-white/20">
                  Countries
                </p>

                <div className="space-y-4">

                  {countries.length > 0 ? (

                    countries.map((row) => (
                      <PerformanceRow
                        key={row.country}
                        label={row.country}
                        value={formatNumber(row.users)}
                      />
                    ))

                  ) : (

                    <EmptyState text="No location data yet." />

                  )}

                </div>

              </div>

              <div className="mt-6">

                <p className="mb-3 text-[9px] uppercase tracking-[0.25em] text-white/20">
                  Cities
                </p>

                <div className="space-y-4">

                  {cities.map((row) => (
                    <PerformanceRow
                      key={row.city}
                      label={
                        row.city === "(not set)"
                          ? "Unknown / Not available"
                          : row.city
                      }
                      value={formatNumber(row.users)}
                    />
                  ))}

                </div>

              </div>

              <div className="mt-6 border-t border-white/[0.06] pt-6">

                <p className="mb-1 text-[9px] uppercase tracking-[0.25em] text-white/20">
                  Visitor locations (real-time)
                </p>

                <p className="mb-3 text-[10px] text-white/20">
                  From this site's own edge geolocation, not GA4 —{" "}
                  {formatNumber(geoTotalSessions)} sessions since
                  deploy. No IP address is ever stored.
                </p>

                {geoLoading ? (

                  <EmptyState text="Loading..." />

                ) : geoTotalSessions > 0 ? (

                  <div className="grid gap-6 sm:grid-cols-2">

                    <div className="space-y-4">
                      {geoCountries.map((row) => (
                        <PerformanceRow
                          key={row.country}
                          label={row.country}
                          value={formatNumber(row.count)}
                        />
                      ))}
                    </div>

                    <div className="space-y-4">
                      {geoCities.map((row) => (
                        <PerformanceRow
                          key={row.city}
                          label={row.city}
                          value={formatNumber(row.count)}
                        />
                      ))}
                    </div>

                  </div>

                ) : (

                  <EmptyState text="No sessions with resolved geolocation yet." />

                )}

                {geoError && (
                  <p className="mt-3 text-xs text-red-300/80">
                    {geoError}
                  </p>
                )}

              </div>

            </div>

          </section>

          {/* HEATMAPS */}

          <section
            id="heatmaps"
            className="mt-5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 lg:p-6"
          >

            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

              <div>

                <p className="text-[9px] uppercase tracking-[0.3em] text-white/25">
                  Behavior
                </p>

                <h3 className="mt-2 text-lg font-medium">
                  Heatmaps
                </h3>

              </div>

              <div className="flex flex-wrap items-center gap-3">

                <select
                  value={heatmapPage}
                  onChange={handleHeatmapPageChange}
                  disabled={heatmapLoading}
                  className="h-10 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 text-xs text-white/50 outline-none disabled:opacity-40"
                >
                  {HEATMAP_PAGES.map((page) => (
                    <option
                      key={page.id}
                      value={page.id}
                      className="bg-[#0b0e14]"
                    >
                      {page.label}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.025] p-1">

                  {HEATMAP_DEVICES.map((device) => (
                    <button
                      key={device}
                      type="button"
                      onClick={() =>
                        handleHeatmapDeviceChange(device)
                      }
                      disabled={heatmapLoading}
                      className={`rounded-md px-3 py-1.5 text-[11px] capitalize transition disabled:opacity-40 ${
                        heatmapDevice === device
                          ? "bg-white/[0.1] text-white"
                          : "text-white/40 hover:text-white"
                      }`}
                    >
                      {device}
                    </button>
                  ))}

                </div>

              </div>

            </div>

            <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">

              {/* CLICK DENSITY */}

              <div>

                <p className="mb-3 text-[9px] uppercase tracking-[0.25em] text-white/20">
                  Click density ({formatNumber(heatmapClicks.length)} clicks)
                </p>

                {heatmapLoading ? (

                  <EmptyState text="Loading heatmap..." />

                ) : heatmapClicks.length > 0 ? (

                  <div
                    className="grid overflow-hidden rounded-xl border border-white/[0.07]"
                    style={{
                      gridTemplateColumns: `repeat(${HEATMAP_GRID_COLS}, 1fr)`,
                      aspectRatio: `${HEATMAP_GRID_COLS} / ${HEATMAP_GRID_ROWS}`,
                    }}
                  >

                    {heatmapGrid.map((intensity, index) => (
                      <div
                        key={index}
                        style={{
                          backgroundColor:
                            intensity > 0
                              ? `rgba(238, 49, 52, ${Math.min(
                                  1,
                                  intensity * 0.9 + 0.1
                                )})`
                              : "rgba(255,255,255,0.02)",
                        }}
                      />
                    ))}

                  </div>

                ) : (

                  <EmptyState text="No click data yet for this page/device." />

                )}

              </div>

              {/* WEBSITE VISITS */}

              <div>

                <p className="mb-3 text-[9px] uppercase tracking-[0.25em] text-white/20">
                  Website visits (last {days} days)
                </p>

                {totalUsers > 0 ? (

                  <>

                    <div className="flex flex-col items-center gap-6 sm:flex-row">

                      <div className="relative h-[168px] w-[168px] shrink-0">

                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: "New users", value: newUsers || 0 },
                                {
                                  name: "Returning users",
                                  value: returningUsers || 0,
                                },
                              ]}
                              dataKey="value"
                              innerRadius={58}
                              outerRadius={78}
                              startAngle={90}
                              endAngle={-270}
                              paddingAngle={returningUsers > 0 && newUsers > 0 ? 3 : 0}
                              stroke="none"
                            >
                              <Cell fill="#ffffff" />
                              <Cell fill="rgba(255,255,255,0.15)" />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>

                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                          <p className="text-2xl font-light tracking-tight">
                            {formatNumber(totalUsers)}
                          </p>
                          <p className="mt-1 text-center text-[9px] uppercase tracking-[0.2em] text-white/30">
                            Total visitors
                          </p>
                        </div>

                      </div>

                      <div className="w-full space-y-4">

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-white" />
                            <span className="text-sm text-white/50">
                              New users
                            </span>
                          </div>
                          <span className="text-sm text-white/75">
                            {formatNumber(newUsers)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-white/20" />
                            <span className="text-sm text-white/50">
                              Returning users
                            </span>
                          </div>
                          <span className="text-sm text-white/75">
                            {formatNumber(returningUsers)}
                          </span>
                        </div>

                      </div>

                    </div>

                    <div className="mt-6 space-y-5">

                      <PerformanceRow
                        label="Page views"
                        value={formatNumber(pageViews)}
                      />

                      <PerformanceRow
                        label="Avg. engagement"
                        value={formatDuration(averageEngagement)}
                      />

                    </div>

                  </>

                ) : (

                  <EmptyState text="No visitor data available yet." />

                )}

              </div>

            </div>

            {heatmapError && (
              <p className="mt-5 text-xs text-red-300/80">
                {heatmapError}
              </p>
            )}

          </section>

          {/* USER JOURNEY */}

          <section
            id="journey"
            className="mt-5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 lg:p-6"
          >

            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

              <div>

                <p className="text-[9px] uppercase tracking-[0.3em] text-white/25">
                  Behavior
                </p>

                <h3 className="mt-2 text-lg font-medium">
                  User Journey
                </h3>

                <p className="mt-2 text-xs text-white/25">
                  {journeyLoading
                    ? "Loading..."
                    : `${formatNumber(
                        totalJourneySessions
                      )} sessions · last ${days} days`}
                </p>

              </div>

              <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.025] p-1">

                {HEATMAP_DEVICES.map((device) => (
                  <button
                    key={device}
                    type="button"
                    onClick={() =>
                      handleHeatmapDeviceChange(device)
                    }
                    disabled={journeyLoading}
                    className={`rounded-md px-3 py-1.5 text-[11px] capitalize transition disabled:opacity-40 ${
                      heatmapDevice === device
                        ? "bg-white/[0.1] text-white"
                        : "text-white/40 hover:text-white"
                    }`}
                  >
                    {device}
                  </button>
                ))}

              </div>

            </div>

            {journeyLoading ? (

              <EmptyState text="Loading user journey..." />

            ) : totalJourneySessions > 0 ? (

              <div className="space-y-8">

                {/* TOP JOURNEY METRICS */}

                <div className="grid gap-4 sm:grid-cols-3">

                  <StatCard
                    icon={<Route size={17} />}
                    title="Journey sessions"
                    value={formatNumber(
                      totalJourneySessions
                    )}
                    description={`Last ${days} days`}
                  />

                  <StatCard
                    icon={<ArrowRight size={17} />}
                    title="Screens / session"
                    value={avgScreensPerSession.toFixed(
                      1
                    )}
                    description="Average path length"
                  />

                  <StatCard
                    icon={<Target size={17} />}
                    title="Contact reach"
                    value={`${contactReachPercent.toFixed(
                      1
                    )}%`}
                    description={`${formatNumber(
                      contactReachCount
                    )} sessions reached Contact`}
                  />

                </div>

                {/* FLOW: connected screen cards with arrows */}

                <div>

                  <p className="mb-4 text-[9px] uppercase tracking-[0.25em] text-white/20">
                    Most common paths
                  </p>

                  <div className="space-y-4">

                    {topPaths.map((row) => {
                      const percent =
                        (row.count /
                          totalJourneySessions) *
                        100;

                      return (
                        <div
                          key={row.path.join("|")}
                          className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4"
                        >

                          <div className="flex flex-wrap items-center gap-y-3">

                            {row.path.map(
                              (step, index) => {
                                const presence =
                                  screenPresence.get(
                                    step
                                  ) || 0;

                                const presencePercent =
                                  (presence /
                                    totalJourneySessions) *
                                  100;

                                return (
                                  <div
                                    key={`${step}-${index}`}
                                    className="flex items-center"
                                  >

                                    {index > 0 && (
                                      <ArrowRight
                                        size={14}
                                        className="mx-2 shrink-0 text-white/20"
                                      />
                                    )}

                                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">

                                      <p className="text-xs font-medium text-white/80">
                                        {journeyLabel(
                                          step
                                        )}
                                      </p>

                                      <p className="mt-0.5 text-[10px] text-white/30">
                                        {formatNumber(
                                          presence
                                        )}{" "}
                                        ·{" "}
                                        {presencePercent.toFixed(
                                          0
                                        )}
                                        %
                                      </p>

                                    </div>

                                  </div>
                                );
                              }
                            )}

                          </div>

                          <div className="mt-3 flex items-center justify-between">

                            <span className="text-[10px] uppercase tracking-[0.2em] text-white/25">
                              Full path
                            </span>

                            <span className="text-xs text-white/50">
                              {formatNumber(row.count)}{" "}
                              sessions ·{" "}
                              {percent.toFixed(1)}%
                            </span>

                          </div>

                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className="h-full rounded-full bg-white/70 transition-all duration-700"
                              style={{
                                width: `${percent}%`,
                              }}
                            />
                          </div>

                        </div>
                      );
                    })}

                  </div>

                </div>

                {/* ENTRY + TRANSITIONS + DROP-OFF */}

                <div className="grid gap-6 lg:grid-cols-3">

                  {/* ENTRY SCREENS */}

                  <div>

                    <p className="mb-3 text-[9px] uppercase tracking-[0.25em] text-white/20">
                      Entry screens
                    </p>

                    <div className="space-y-4">

                      {entryScreens.map((row) => (
                        <PerformanceRow
                          key={row.page}
                          label={journeyLabel(row.page)}
                          value={`${formatNumber(
                            row.count
                          )} (${(
                            (row.count /
                              totalJourneySessions) *
                            100
                          ).toFixed(0)}%)`}
                        />
                      ))}

                    </div>

                  </div>

                  {/* TOP TRANSITIONS */}

                  <div>

                    <p className="mb-3 text-[9px] uppercase tracking-[0.25em] text-white/20">
                      Top next-screen transitions
                    </p>

                    <div className="space-y-4">

                      {topTransitions.map((row) => (
                        <PerformanceRow
                          key={`${row.from}-${row.to}`}
                          label={`${journeyLabel(
                            row.from
                          )} → ${journeyLabel(row.to)}`}
                          value={formatNumber(row.count)}
                        />
                      ))}

                    </div>

                  </div>

                  {/* DROP-OFF POINTS */}

                  <div>

                    <p className="mb-3 text-[9px] uppercase tracking-[0.25em] text-white/20">
                      Drop-off points
                    </p>

                    <div className="space-y-4">

                      {dropoffStats
                        .slice(0, 6)
                        .map((row) => (
                          <PerformanceRow
                            key={row.page}
                            label={journeyLabel(
                              row.page
                            )}
                            value={`${row.dropoffRate.toFixed(
                              0
                            )}% (${formatNumber(
                              row.exitCount
                            )}/${formatNumber(
                              row.visits
                            )})`}
                          />
                        ))}

                    </div>

                  </div>

                </div>

              </div>

            ) : (

              <EmptyState text="No journey data yet for this date range." />

            )}

            {journeyError && (
              <p className="mt-5 text-xs text-red-300/80">
                {journeyError}
              </p>
            )}

          </section>

          {/* CONVERSION FUNNEL */}

          <section
            id="funnel"
            className="mt-5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 lg:p-6"
          >

            <div className="mb-6">

              <p className="text-[9px] uppercase tracking-[0.3em] text-white/25">
                Behavior
              </p>

              <h3 className="mt-2 text-lg font-medium">
                Conversion Funnel
              </h3>

              <p className="mt-2 text-xs text-white/25">
                Home → Explore → 360 View / Gallery /
                Amenities / Floor Plans → Contact
              </p>

            </div>

            {journeyLoading ? (

              <EmptyState text="Loading funnel..." />

            ) : totalJourneySessions > 0 ? (

              <div className="space-y-5">

                {funnelSteps.map((step, index) => (
                  <div key={step.id}>

                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">

                      <span className="text-sm text-white/70">
                        {index + 1}. {step.label}
                      </span>

                      <span className="text-xs text-white/40">
                        {formatNumber(step.count)} users
                        · {step.percentOfTotal.toFixed(
                          1
                        )}% of total
                        {index > 0 && (
                          <>
                            {" "}
                            ·{" "}
                            {step.conversionFromPrevious.toFixed(
                              1
                            )}
                            % from previous
                            {step.dropOffFromPrevious >
                              0 && (
                              <span className="text-red-300/70">
                                {" "}
                                (
                                {step.dropOffFromPrevious.toFixed(
                                  1
                                )}
                                % drop-off)
                              </span>
                            )}
                          </>
                        )}
                      </span>

                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-white/70 transition-all duration-700"
                        style={{
                          width: `${step.percentOfTotal}%`,
                        }}
                      />
                    </div>

                  </div>
                ))}

              </div>

            ) : (

              <EmptyState text="No journey data yet for this date range." />

            )}

          </section>

          {/* BUTTON ANALYTICS (real-time, Supabase-backed) */}

          <section
            id="buttons"
            className="mt-5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 lg:p-6"
          >

            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

              <div>

                <p className="text-[9px] uppercase tracking-[0.3em] text-white/25">
                  Interactions
                </p>

                <h3 className="mt-2 text-lg font-medium">
                  Button Analytics
                </h3>

                <p className="mt-2 text-xs text-white/25">
                  Real-time · last {days} days
                </p>

              </div>

              <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.025] p-1">

                {HEATMAP_DEVICES.map((device) => (
                  <button
                    key={device}
                    type="button"
                    onClick={() =>
                      handleHeatmapDeviceChange(device)
                    }
                    disabled={buttonAnalyticsLoading}
                    className={`rounded-md px-3 py-1.5 text-[11px] capitalize transition disabled:opacity-40 ${
                      heatmapDevice === device
                        ? "bg-white/[0.1] text-white"
                        : "text-white/40 hover:text-white"
                    }`}
                  >
                    {device}
                  </button>
                ))}

              </div>

            </div>

            {buttonAnalyticsLoading ? (

              <EmptyState text="Loading button analytics..." />

            ) : totalButtonClicks > 0 ? (

              <div className="space-y-8">

                <div className="grid gap-4 sm:grid-cols-2">

                  <StatCard
                    icon={
                      <MousePointerClick size={17} />
                    }
                    title="Total clicks"
                    value={formatNumber(
                      totalButtonClicks
                    )}
                    description={`Last ${days} days`}
                  />

                  <StatCard
                    icon={<Smartphone size={17} />}
                    title="Devices tracked"
                    value={formatNumber(
                      clicksByDevice.length
                    )}
                    description="Distinct device types"
                  />

                </div>

                <div className="grid gap-6 lg:grid-cols-2">

                  {/* CLICKS BY BUTTON */}

                  <div>

                    <p className="mb-3 text-[9px] uppercase tracking-[0.25em] text-white/20">
                      Clicks by button
                    </p>

                    <div className="space-y-4">

                      {clicksByButton.map((row) => (
                        <PerformanceRow
                          key={row.name}
                          label={row.name}
                          value={`${formatNumber(
                            row.count
                          )} (${(
                            (row.count /
                              totalButtonClicks) *
                            100
                          ).toFixed(0)}%)`}
                        />
                      ))}

                    </div>

                  </div>

                  {/* DEVICE BREAKDOWN */}

                  <div>

                    <p className="mb-3 text-[9px] uppercase tracking-[0.25em] text-white/20">
                      Device breakdown
                    </p>

                    <div className="space-y-4">

                      {clicksByDevice.map((row) => (
                        <PerformanceRow
                          key={row.device}
                          label={
                            row.device
                              .charAt(0)
                              .toUpperCase() +
                            row.device.slice(1)
                          }
                          value={`${formatNumber(
                            row.count
                          )} (${(
                            (row.count /
                              totalButtonClicks) *
                            100
                          ).toFixed(0)}%)`}
                        />
                      ))}

                    </div>

                  </div>

                </div>

                {/* CLICKS OVER TIME */}

                <div>

                  <p className="mb-3 text-[9px] uppercase tracking-[0.25em] text-white/20">
                    Clicks over time
                  </p>

                  <div className="h-[220px] w-full">

                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <AreaChart data={clicksOverTime}>

                        <defs>
                          <linearGradient
                            id="buttonClicksFill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#ffffff"
                              stopOpacity={0.15}
                            />
                            <stop
                              offset="100%"
                              stopColor="#ffffff"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>

                        <CartesianGrid
                          stroke="rgba(255,255,255,0.05)"
                          vertical={false}
                        />

                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fill: "rgba(255,255,255,0.28)",
                            fontSize: 10,
                          }}
                        />

                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fill: "rgba(255,255,255,0.28)",
                            fontSize: 10,
                          }}
                        />

                        <Tooltip
                          contentStyle={{
                            background: "#10141c",
                            border:
                              "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "10px",
                            color: "#fff",
                            fontSize: "12px",
                          }}
                        />

                        <Area
                          type="monotone"
                          dataKey="clicks"
                          stroke="#ffffff"
                          strokeWidth={1.5}
                          fill="url(#buttonClicksFill)"
                        />

                      </AreaChart>
                    </ResponsiveContainer>

                  </div>

                </div>

              </div>

            ) : (

              <EmptyState text="No button click data yet for this date range/device." />

            )}

            {buttonAnalyticsError && (
              <p className="mt-5 text-xs text-red-300/80">
                {buttonAnalyticsError}
              </p>
            )}

          </section>

          {/* ERROR */}

          {gaError && (

            <section className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/[0.03] p-5">

              <p className="text-[9px] uppercase tracking-[0.3em] text-red-400/60">
                GA4 Connection Error
              </p>

              <p className="mt-2 text-sm text-red-300/80">
                Unable to load Google Analytics data.
              </p>

            </section>

          )}

          {/* SUCCESS */}

          {gaData?.success && (

            <section className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.03] p-5">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-[9px] uppercase tracking-[0.3em] text-emerald-400/60">
                    GA4 Connected
                  </p>

                  <p className="mt-2 text-sm text-emerald-300/80">
                    Live analytics data successfully received from Google Analytics.
                  </p>

                </div>

                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[9px] text-emerald-400">
                  LIVE DATA
                </span>

              </div>

              <p className="mt-3 text-xs text-white/30">
                Property ID:{" "}
                {gaData.propertyId}
              </p>

            </section>

          )}

          <footer className="mt-10 border-t border-white/[0.06] pt-6 text-[10px] text-white/20">
            JP Infra Analytics Dashboard
          </footer>

        </main>

      </div>

    </div>
  );
}

/* -------------------------------------------------------
   STAT CARD
------------------------------------------------------- */

function StatCard({
  icon,
  title,
  value,
  change,
  description,
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition hover:border-white/[0.12]">

      <div className="flex items-start justify-between">

        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.045] text-white/40">
          {icon}
        </div>

        <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] text-emerald-400">
          {change}
        </span>

      </div>

      <p className="mt-5 text-[9px] uppercase tracking-[0.25em] text-white/30">
        {title}
      </p>

      <p className="mt-3 text-3xl font-light tracking-tight">
        {value}
      </p>

      <p className="mt-2 text-[11px] text-white/25">
        {description}
      </p>

    </div>
  );
}

/* -------------------------------------------------------
   PERFORMANCE ROW
------------------------------------------------------- */

function PerformanceRow({
  label,
  value,
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.05] pb-4">

      <span className="text-sm text-white/40">
        {label}
      </span>

      <span className="text-sm text-white/75">
        {value}
      </span>

    </div>
  );
}

/* -------------------------------------------------------
   EMPTY STATE
------------------------------------------------------- */

function EmptyState({ text }) {
  return (
    <div className="flex h-full min-h-[100px] items-center justify-center text-sm text-white/25">
      {text}
    </div>
  );
}

export default AdminDashboard;