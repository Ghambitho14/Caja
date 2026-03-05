-- Roles y aprobación de usuarios
-- Admin fijo: bel4ndria.d.jhon@gmail.com

create table if not exists public.app_users (
	user_id uuid primary key references auth.users(id) on delete cascade,
	email text not null,
	role text not null default 'user' check (role in ('admin', 'user')),
	status text not null default 'pending' check (status in ('pending', 'active', 'blocked')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists app_users_status_idx on public.app_users(status);
create index if not exists app_users_role_idx on public.app_users(role);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

drop trigger if exists app_users_set_updated_at on public.app_users;
create trigger app_users_set_updated_at
before update on public.app_users
for each row execute function public.set_updated_at();

create or replace function public.sync_auth_user_to_app_users()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	admin_email constant text := 'bel4ndria.d.jhon@gmail.com';
	safe_email text := lower(coalesce(new.email, ''));
begin
	insert into public.app_users (user_id, email, role, status)
	values (
		new.id,
		safe_email,
		case when safe_email = admin_email then 'admin' else 'user' end,
		case when safe_email = admin_email then 'active' else 'pending' end
	)
	on conflict (user_id) do update
	set email = excluded.email;
	return new;
end;
$$;

drop trigger if exists on_auth_user_created_to_app_users on auth.users;
create trigger on_auth_user_created_to_app_users
after insert on auth.users
for each row execute function public.sync_auth_user_to_app_users();

insert into public.app_users (user_id, email, role, status)
select
	au.id,
	lower(coalesce(au.email, '')) as email,
	case when lower(coalesce(au.email, '')) = 'bel4ndria.d.jhon@gmail.com' then 'admin' else 'user' end as role,
	case when lower(coalesce(au.email, '')) = 'bel4ndria.d.jhon@gmail.com' then 'active' else 'pending' end as status
from auth.users au
on conflict (user_id) do update
set email = excluded.email;

update public.app_users
set role = 'admin', status = 'active'
where lower(email) = 'bel4ndria.d.jhon@gmail.com';

update public.app_users
set role = 'user'
where lower(email) <> 'bel4ndria.d.jhon@gmail.com';

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.app_users u
		where u.user_id = auth.uid()
			and u.role = 'admin'
			and u.status = 'active'
	);
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.app_users u
		where u.user_id = auth.uid()
			and u.status = 'active'
	);
$$;

alter table public.app_users enable row level security;

do $$
declare
	p record;
begin
	for p in
		select schemaname, tablename, policyname
		from pg_policies
		where schemaname = 'public'
			and tablename in ('app_users', 'pedidos', 'gastos', 'metas', 'ajustes', 'ajustes_semana')
	loop
		execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
	end loop;
end
$$;

create policy app_users_select_self_or_admin on public.app_users
for select to authenticated
using (auth.uid() = user_id or public.is_admin_user());

create policy app_users_update_admin_only on public.app_users
for update to authenticated
using (public.is_admin_user())
with check (
	public.is_admin_user()
	and role in ('admin', 'user')
	and status in ('pending', 'active', 'blocked')
	and (role = 'user' or lower(email) = 'bel4ndria.d.jhon@gmail.com')
);

create policy pedidos_select_own on public.pedidos
for select to authenticated
using (auth.uid() = user_id and public.is_active_user());

create policy pedidos_insert_own on public.pedidos
for insert to authenticated
with check (auth.uid() = user_id and public.is_active_user());

create policy pedidos_update_own on public.pedidos
for update to authenticated
using (auth.uid() = user_id and public.is_active_user())
with check (auth.uid() = user_id and public.is_active_user());

create policy pedidos_delete_own on public.pedidos
for delete to authenticated
using (auth.uid() = user_id and public.is_active_user());

create policy gastos_select_own on public.gastos
for select to authenticated
using (auth.uid() = user_id and public.is_active_user());

create policy gastos_insert_own on public.gastos
for insert to authenticated
with check (auth.uid() = user_id and public.is_active_user());

create policy gastos_update_own on public.gastos
for update to authenticated
using (auth.uid() = user_id and public.is_active_user())
with check (auth.uid() = user_id and public.is_active_user());

create policy gastos_delete_own on public.gastos
for delete to authenticated
using (auth.uid() = user_id and public.is_active_user());

create policy metas_select_own on public.metas
for select to authenticated
using (auth.uid() = user_id and public.is_active_user());

create policy metas_insert_own on public.metas
for insert to authenticated
with check (auth.uid() = user_id and public.is_active_user());

create policy metas_update_own on public.metas
for update to authenticated
using (auth.uid() = user_id and public.is_active_user())
with check (auth.uid() = user_id and public.is_active_user());

create policy metas_delete_own on public.metas
for delete to authenticated
using (auth.uid() = user_id and public.is_active_user());

create policy ajustes_select_own on public.ajustes
for select to authenticated
using (auth.uid() = user_id and public.is_active_user());

create policy ajustes_insert_own on public.ajustes
for insert to authenticated
with check (auth.uid() = user_id and public.is_active_user());

create policy ajustes_update_own on public.ajustes
for update to authenticated
using (auth.uid() = user_id and public.is_active_user())
with check (auth.uid() = user_id and public.is_active_user());

create policy ajustes_delete_own on public.ajustes
for delete to authenticated
using (auth.uid() = user_id and public.is_active_user());

create policy ajustes_semana_select_own on public.ajustes_semana
for select to authenticated
using (auth.uid() = user_id and public.is_active_user());

create policy ajustes_semana_insert_own on public.ajustes_semana
for insert to authenticated
with check (auth.uid() = user_id and public.is_active_user());

create policy ajustes_semana_update_own on public.ajustes_semana
for update to authenticated
using (auth.uid() = user_id and public.is_active_user())
with check (auth.uid() = user_id and public.is_active_user());

create policy ajustes_semana_delete_own on public.ajustes_semana
for delete to authenticated
using (auth.uid() = user_id and public.is_active_user());
