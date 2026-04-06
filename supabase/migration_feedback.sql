-- Tabla para feedback de usuarios
create table feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  tipo text not null check (tipo in ('fallo', 'funcion', 'categoria', 'otro')),
  mensaje text not null,
  email text,
  created_at timestamptz default now()
);

-- RLS
alter table feedback enable row level security;

-- Cualquier usuario autenticado puede insertar
create policy "Authenticated users can insert feedback"
  on feedback for insert to authenticated with check (true);

-- Solo el dueño puede ver su feedback (opcional)
create policy "Users can read own feedback"
  on feedback for select to authenticated using (auth.uid() = user_id);
