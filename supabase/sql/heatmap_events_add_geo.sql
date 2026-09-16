-- Adds nullable country/city columns to heatmap_events, populated by a
-- privacy-safe server-side geolocation fallback: Vercel's edge network
-- resolves coarse geolocation (country/city) from the request's IP
-- address and exposes it as request headers (x-vercel-ip-country,
-- x-vercel-ip-city) BEFORE the request reaches any application code.
-- The site's api/geo.js edge function reads only those headers and
-- returns the resolved strings — the raw IP address is never read,
-- stored, or logged anywhere in this system. This is a real, additional
-- signal (a different IP-geolocation database than GA4 uses), not a
-- guess — and it's independent of GA4, which is left completely
-- unchanged. No existing columns or constraints are modified.

alter table public.heatmap_events
  add column if not exists country text;

alter table public.heatmap_events
  add column if not exists city text;

create index if not exists heatmap_events_country_city_idx
  on public.heatmap_events (country, city)
  where country is not null;
