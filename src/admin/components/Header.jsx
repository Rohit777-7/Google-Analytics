import { Menu, RefreshCw } from "lucide-react";

function Header({ setSidebarOpen }) {
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-white/[0.07] bg-[#080b12]/90 px-5 backdrop-blur-xl lg:px-8">

      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-white/50 lg:hidden"
        >
          <Menu size={21} />
        </button>

        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/30">
            Analytics
          </p>

          <h1 className="mt-1 text-lg font-medium">
            Overview
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">

        <div className="hidden items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-xs text-white/50 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          GA4 Connected
        </div>

        <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-white/40 transition hover:border-white/20 hover:text-white">
          <RefreshCw size={15} />
        </button>

      </div>
    </header>
  );
}

export default Header;