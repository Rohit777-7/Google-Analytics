import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const data = [
  {
    name: "Google",
    value: 42,
  },
  {
    name: "Direct",
    value: 28,
  },
  {
    name: "Social",
    value: 18,
  },
  {
    name: "Referral",
    value: 12,
  },
];

function TrafficOverview() {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 lg:p-6">

      <div>
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/30">
          Acquisition
        </p>

        <h2 className="mt-2 text-lg font-medium">
          Traffic sources
        </h2>
      </div>

      <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row">

        <div className="h-[190px] w-[190px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
              >
                {data.map((_, index) => (
                  <Cell
                    key={index}
                    fill={`rgba(255,255,255,${0.9 - index * 0.17})`}
                  />
                ))}
              </Pie>

              <Tooltip
                contentStyle={{
                  background: "#10141c",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="w-full space-y-4">
          {data.map((item, index) => (
            <div
              key={item.name}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: `rgba(255,255,255,${0.9 - index * 0.17})`,
                  }}
                />

                <span className="text-sm text-white/50">
                  {item.name}
                </span>
              </div>

              <span className="text-xs text-white/35">
                {item.value}%
              </span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default TrafficOverview;