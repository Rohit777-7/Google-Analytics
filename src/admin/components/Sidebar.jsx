import {
  Activity,
  BarChart3,
  Filter,
  FileText,
  Flame,
  Globe2,
  LayoutDashboard,
  LogOut,
  MousePointerClick,
  Route,
  Settings,
  Smartphone,
  X,
} from "lucide-react";

const navigation = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    id: "dashboard",
  },
  {
    label: "Live Visitors",
    icon: Activity,
    id: "live",
  },
  {
    label: "Pages",
    icon: FileText,
    id: "pages",
  },
  {
    label: "Button Analytics",
    icon: MousePointerClick,
    id: "buttons",
  },
  {
    label: "User Journey",
    icon: Route,
    id: "journey",
  },
  {
    label: "Traffic Sources",
    icon: BarChart3,
    id: "traffic",
  },
  {
    label: "Devices",
    icon: Smartphone,
    id: "devices",
  },
  {
    label: "Locations",
    icon: Globe2,
    id: "locations",
  },
  {
    label: "Heatmaps",
    icon: Flame,
    id: "heatmaps",
  },
  {
    label: "Conversion Funnel",
    icon: Filter,
    id: "funnel",
  },
];

function Sidebar({
  open,
  setOpen,
  activeSection,
  setActiveSection,
  onLogout,
}) {
  const handleNavigation = (id) => {
    setActiveSection(id);
    setOpen(false);

    // The dashboard is one continuous page, not separate routed views —
    // jump to the matching section instead of switching content.
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 z-50 flex h-screen w-[260px]
          flex-col border-r border-white/[0.07]
          bg-[#090c12]
          transition-transform duration-300
          lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* BRAND */}
        <div className="flex h-[92px] items-center justify-between border-b border-white/[0.07] px-7">
          <div>
            <p className="text-[15px] font-medium tracking-[0.28em] text-white">
              JP INFRA
            </p>

            <p className="mt-2 text-[8px] uppercase tracking-[0.4em] text-white/30">
              Analytics
            </p>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="text-white/30 transition hover:text-white lg:hidden"
          >
            <X size={19} strokeWidth={1.5} />
          </button>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 overflow-y-auto px-4 py-7">
          <p className="mb-3 px-3 text-[9px] uppercase tracking-[0.32em] text-white/25">
            Workspace
          </p>

          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  className={`
                    group flex w-full items-center gap-3
                    rounded-xl px-3 py-3
                    text-left text-[13px]
                    transition-all duration-200
                    ${
                      active
                        ? "bg-white/[0.075] text-white"
                        : "text-white/40 hover:bg-white/[0.035] hover:text-white"
                    }
                  `}
                >
                  <Icon
                    size={17}
                    strokeWidth={1.5}
                    className={`
                      transition
                      ${
                        active
                          ? "text-white"
                          : "text-white/35 group-hover:text-white"
                      }
                    `}
                  />

                  <span>{item.label}</span>

                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </button>
              );
            })}
          </div>

          {/* SYSTEM */}
          <p className="mb-3 mt-10 px-3 text-[9px] uppercase tracking-[0.32em] text-white/25">
            System
          </p>

          <button
            onClick={() => handleNavigation("settings")}
            className={`
              group flex w-full items-center gap-3 rounded-xl
              px-3 py-3 text-left text-[13px]
              transition
              ${
                activeSection === "settings"
                  ? "bg-white/[0.075] text-white"
                  : "text-white/40 hover:bg-white/[0.035] hover:text-white"
              }
            `}
          >
            <Settings
              size={17}
              strokeWidth={1.5}
              className="text-white/35 group-hover:text-white"
            />

            <span>Settings</span>
          </button>
        </nav>

        {/* USER / LOGOUT */}
        <div className="border-t border-white/[0.07] p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/[0.035] p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-xs font-medium text-black">
              A
            </div>

            <div className="min-w-0">
              <p className="truncate text-xs text-white/80">
                Administrator
              </p>

              <p className="mt-0.5 truncate text-[10px] text-white/30">
                Analytics access
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="
              flex w-full items-center gap-3 rounded-lg
              px-3 py-2.5 text-xs text-white/35
              transition hover:bg-white/[0.035] hover:text-white
            "
          >
            <LogOut size={16} strokeWidth={1.5} />

            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;