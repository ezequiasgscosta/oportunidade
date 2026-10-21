alter table public.tracks
  add column if not exists location text not null default 'Desconhecido'
  check (char_length(btrim(location)) between 1 and 120);