-- Refill the expanded mosaic without waiting for the monthly refresh.
update world_atlas_countries
set next_refresh_at = now()
where country_code = 'RU' and jsonb_array_length(posters) < 24;
