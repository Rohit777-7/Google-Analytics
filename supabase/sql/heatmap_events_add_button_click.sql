-- Adds a fourth event_type, 'button_click', to heatmap_events, plus the
-- button_name column it needs. This gives the admin dashboard a
-- real-time button analytics source (device breakdown, clicks over
-- time) that doesn't depend on GA4's custom-dimension propagation delay.
-- Run this once in the Supabase SQL Editor, after the previous
-- heatmap_events*.sql files.

alter table public.heatmap_events
  add column if not exists button_name text;

alter table public.heatmap_events
  drop constraint if exists heatmap_events_event_type_check;

alter table public.heatmap_events
  add constraint heatmap_events_event_type_check
  check (event_type in ('click', 'scroll', 'pageview', 'button_click'));

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
    or
    (event_type = 'button_click' and button_name is not null)
  );

create index if not exists heatmap_events_button_click_idx
  on public.heatmap_events (button_name, created_at)
  where event_type = 'button_click';
