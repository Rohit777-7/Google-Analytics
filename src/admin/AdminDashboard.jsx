import { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Clock3,
  Eye,
  LogOut,
  Menu,
  RefreshCw,
  Users,
} from "lucide-react";

import {
  Area,
  AreaChart,
  CartesianGrid,
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

/* -------------------------------------------------------
   DASHBOARD
------------------------------------------------------- */

function AdminDashboard() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] =
    useState("dashboard");

  const [refreshing, setRefreshing] = useState(false);

  const [gaData, setGaData] = useState(null);
  const [gaError, setGaError] = useState(null);

  /* -----------------------------------------------------
     LOAD GA4
  ----------------------------------------------------- */

  const loadAnalytics = async () => {
    try {
      setRefreshing(true);
      setGaError(null);

      console.log("Calling GA4 Edge Function...");

      const { data, error } =
        await supabase.functions.invoke(
          "rapid-handler",
          {
            body: {},
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
  }, []);

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

  const realtimeReport =
    reports.realtime;

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

  const realtimeRows =
    getRows(realtimeReport);

  const liveVisitors =
    realtimeRows.reduce(
      (total, row) =>
        total + getMetric(row, 0),
      0
    );

  const livePages =
    realtimeRows
      .map((row) => ({
        page: getDimension(row, 0),
        users: getMetric(row, 0),
      }))
      .sort(
        (a, b) => b.users - a.users
      )
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

              <div className="flex h-10 items-center rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 text-xs text-white/40">
                Last 30 Days
              </div>

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

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <StatCard
              icon={<Users size={17} />}
              title="Total users"
              value={formatNumber(
                totalUsers
              )}
              change="GA4"
              description="Last 30 days"
            />

            <StatCard
              icon={<Activity size={17} />}
              title="Sessions"
              value={formatNumber(
                sessions
              )}
              change="GA4"
              description="Last 30 days"
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
                Last 30 days
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

            <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">

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

            {/* CLICK EVENTS */}

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

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 lg:p-6">

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