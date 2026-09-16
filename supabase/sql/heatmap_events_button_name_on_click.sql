-- No schema change is actually required for this: button_name (added in
-- heatmap_events_add_button_click.sql) is nullable, and the existing
-- heatmap_events_payload_matches_type constraint's 'click' branch only
-- requires x_pct/y_pct to be non-null — it already permits button_name
-- to also be set on a 'click' row. Run this only to swap the earlier
-- partial index (built for event_type='button_click', which is no
-- longer written) for one that matches the real query pattern: clicks
-- that carry a button_name, regardless of event_type.

drop index if exists heatmap_events_button_click_idx;

create index if not exists heatmap_events_button_name_idx
  on public.heatmap_events (button_name, created_at)
  where button_name is not null;
