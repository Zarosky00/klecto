-- Keeps profile deletion and viewer-scoped view lookups indexed as the
-- engagement event table grows.
create index catalog_views_viewer_idx
  on public.catalog_views (viewer_id, created_at desc);
