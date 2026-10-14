create table public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    display_name text not null
        check (char_length(trim(display_name)) between 1 and 40),
    competition_enabled boolean not null default true,
    created_at timestamptz not null default now()
);

create table public.reading_entries (
    user_id uuid not null references auth.users (id) on delete cascade,
    entry_date date not null,
    minutes integer not null check (minutes between 0 and 1440),
    books integer not null default 0 check (books >= 0),
    created_at timestamptz not null default now(),
    primary key (user_id, entry_date)
);

alter table public.profiles enable row level security;
alter table public.reading_entries enable row level security;

revoke all on public.profiles, public.reading_entries from anon;
grant select, insert, update
    on public.profiles
    to authenticated;
grant select, insert, update, delete
    on public.reading_entries
    to authenticated;

create policy "Users can read their own profile"
    on public.profiles
    for select
    to authenticated
    using ((select auth.uid()) = id);

create policy "Users can create their own profile"
    on public.profiles
    for insert
    to authenticated
    with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
    on public.profiles
    for update
    to authenticated
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);

create policy "Users can read their own reading entries"
    on public.reading_entries
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

create policy "Users can create their own reading entries"
    on public.reading_entries
    for insert
    to authenticated
    with check (
        (select auth.uid()) = user_id
        and entry_date <= (now() at time zone 'Europe/Prague')::date
    );

create policy "Users can update their own reading entries"
    on public.reading_entries
    for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check (
        (select auth.uid()) = user_id
        and entry_date <= (now() at time zone 'Europe/Prague')::date
    );

create policy "Users can delete their own reading entries"
    on public.reading_entries
    for delete
    to authenticated
    using ((select auth.uid()) = user_id);

create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, display_name)
    values (
        new.id,
        coalesce(
            nullif(left(trim(new.raw_user_meta_data ->> 'display_name'), 40), ''),
            'Čtenář'
        )
    );
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.create_profile_for_new_user();
