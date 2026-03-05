-- Multiusuario con Supabase Auth
-- Aisla datos por user_id y reemplaza políticas permisivas.

alter table public.pedidos add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.gastos add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.metas add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.ajustes add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.ajustes_semana add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists pedidos_user_id_idx on public.pedidos(user_id);
create index if not exists gastos_user_id_idx on public.gastos(user_id);
create index if not exists metas_user_id_idx on public.metas(user_id);
create index if not exists ajustes_user_id_month_idx on public.ajustes(user_id, year, month);
create index if not exists ajustes_semana_user_id_month_idx on public.ajustes_semana(user_id, year, month, semana);

alter table public.pedidos enable row level security;
alter table public.gastos enable row level security;
alter table public.metas enable row level security;
alter table public.ajustes enable row level security;
alter table public.ajustes_semana enable row level security;

do $$
declare
	p record;
begin
	for p in
		select schemaname, tablename, policyname
		from pg_policies
		where schemaname = 'public'
			and tablename in ('pedidos', 'gastos', 'metas', 'ajustes', 'ajustes_semana')
	loop
		execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
	end loop;
end
$$;

create policy pedidos_select_own on public.pedidos
for select to authenticated
using (auth.uid() = user_id);

create policy pedidos_insert_own on public.pedidos
for insert to authenticated
with check (auth.uid() = user_id);

create policy pedidos_update_own on public.pedidos
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy pedidos_delete_own on public.pedidos
for delete to authenticated
using (auth.uid() = user_id);

create policy gastos_select_own on public.gastos
for select to authenticated
using (auth.uid() = user_id);

create policy gastos_insert_own on public.gastos
for insert to authenticated
with check (auth.uid() = user_id);

create policy gastos_update_own on public.gastos
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy gastos_delete_own on public.gastos
for delete to authenticated
using (auth.uid() = user_id);

create policy metas_select_own on public.metas
for select to authenticated
using (auth.uid() = user_id);

create policy metas_insert_own on public.metas
for insert to authenticated
with check (auth.uid() = user_id);

create policy metas_update_own on public.metas
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy metas_delete_own on public.metas
for delete to authenticated
using (auth.uid() = user_id);

create policy ajustes_select_own on public.ajustes
for select to authenticated
using (auth.uid() = user_id);

create policy ajustes_insert_own on public.ajustes
for insert to authenticated
with check (auth.uid() = user_id);

create policy ajustes_update_own on public.ajustes
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy ajustes_delete_own on public.ajustes
for delete to authenticated
using (auth.uid() = user_id);

create policy ajustes_semana_select_own on public.ajustes_semana
for select to authenticated
using (auth.uid() = user_id);

create policy ajustes_semana_insert_own on public.ajustes_semana
for insert to authenticated
with check (auth.uid() = user_id);

create policy ajustes_semana_update_own on public.ajustes_semana
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy ajustes_semana_delete_own on public.ajustes_semana
for delete to authenticated
using (auth.uid() = user_id);
