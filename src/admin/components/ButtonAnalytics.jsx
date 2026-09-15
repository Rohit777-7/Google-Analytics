import { MousePointerClick } from "lucide-react";

const buttons = [
  {
    name: "360 View",
    clicks: 1284,
  },
  {
    name: "Floor Plan",
    clicks: 842,
  },
  {
    name: "Amenities",
    clicks: 617,
  },
  {
    name: "Location",
    clicks: 421,
  },
  {
    name: "Contact",
    clicks: 238,
  },
];

function ButtonAnalytics() {
  const max = Math.max(...buttons.map((item) => item.clicks));

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 lg:p-6">

      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05]">
          <MousePointerClick
            size={16}
            className="text-white/50"
          />
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/30">
            Interactions
          </p>

          <h2 className="mt-2 text-lg font-medium">
            Most clicked buttons
          </h2>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {buttons.map((button) => {
          const percentage =
            (button.clicks / max) * 100;

          return (
            <div key={button.name}>

              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-white/60">
                  {button.name}
                </span>

                <span className="text-xs text-white/35">
                  {button.clicks.toLocaleString()}
                </span>
              </div>

              <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-white/70 transition-all"
                  style={{
                    width: `${percentage}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ButtonAnalytics;