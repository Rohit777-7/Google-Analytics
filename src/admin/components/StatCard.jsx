function StatCard({
  title,
  value,
  change,
  description,
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition hover:border-white/[0.12]">

      <div className="flex items-start justify-between">
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">
          {title}
        </p>

        {change && (
          <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-400">
            {change}
          </span>
        )}
      </div>

      <p className="mt-5 text-3xl font-light tracking-tight">
        {value}
      </p>

      {description && (
        <p className="mt-2 text-xs text-white/25">
          {description}
        </p>
      )}
    </div>
  );
}

export default StatCard;