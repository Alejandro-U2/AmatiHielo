create table if not exists public.weather_history (
  id bigserial primary key,
  date date not null unique,
  temperature numeric,
  temperature_max numeric,
  temperature_min numeric,
  humidity numeric,
  rain_probability numeric,
  wind_speed numeric,
  weather_code integer,
  created_at timestamptz not null default now()
);

alter table public.weather_history enable row level security;

create policy "Authenticated users can read weather history"
on public.weather_history
for select
to anon, authenticated
using (true);

create policy "Authenticated users can upsert weather history"
on public.weather_history
for insert
to anon, authenticated
with check (true);

create policy "Authenticated users can update weather history"
on public.weather_history
for update
to anon, authenticated
using (true)
with check (true);
