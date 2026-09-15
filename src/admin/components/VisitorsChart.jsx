import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { day: "Sep 1", users: 320 },
  { day: "Sep 2", users: 410 },
  { day: "Sep 3", users: 370 },
  { day: "Sep 4", users: 520 },
  { day: "Sep 5", users: 480 },
  { day: "Sep 6", users: 690 },
  { day: "Sep 7", users: 610 },
  { day: "Sep 8", users: 760 },
  { day: "Sep 9", users: 720 },
  { day: "Sep 10", users: 880 },
  { day: "Sep 11", users: 820 },
  { day: "Sep 12", users: 940 },
];

function VisitorsChart() {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 lg:p-6">

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/30">
            Audience
          </p>

          <h2 className="mt-2 text-lg font-medium">
            Visitors over time
          </h2>
        </div>

        <select className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/60 outline-none">
          <option className="bg-[#0b0e14]">
            Last 7 Days
          </option>

          <option className="bg-[#0b0e14]">
            Last 30 Days
          </option>

          <option className="bg-[#0b0e14]">
            Last 90 Days
          </option>
        </select>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient
                id="visitorGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="#ffffff"
                  stopOpacity={0.16}
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
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "rgba(255,255,255,0.3)",
                fontSize: 10,
              }}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "rgba(255,255,255,0.3)",
                fontSize: 10,
              }}
            />

            <Tooltip
              contentStyle={{
                background: "#10141c",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                color: "#fff",
              }}
            />

            <Area
              type="monotone"
              dataKey="users"
              stroke="#ffffff"
              strokeWidth={1.5}
              fill="url(#visitorGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default VisitorsChart;