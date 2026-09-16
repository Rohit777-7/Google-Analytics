-- Adds a third event_type, 'pageview', to the existing heatmap_events
-- table — one row per screen change, giving a real ordered per-session
-- log to reconstruct navigation paths from (User Journey feature).
-- Run this once in the Supabase SQL Editor, after heatmap_events.sql.

alter table public.heatmap_events
  drop constraint if exists heatmap_events_event_type_check;

alter table public.heatmap_events
  add constraint heatmap_events_event_type_check
  check (event_type in ('click', 'scroll', 'pageview'));

alter table public.heatmap_events
  drop constraint if exists heatmap_events_payload_matches_type;

alter table public.heatmap_events
  add constraint heatmap_events_payload_matches_type
  check (
    (event_type = 'click' and x_pct is not null and y_pct is not null)
    or
    (event_type = 'scroll' and scroll_depth is not null)
    or
    (event_type = 'pageview')
  );

-- Speeds up grouping pageview rows by session and ordering by time, the
-- access pattern the User Journey panel uses.
create index if not exists heatmap_events_session_created_idx
  on public.heatmap_events (session_id, created_at)
  where event_type = 'pageview';
