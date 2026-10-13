create or replace function public.create_profile_for_new_user()
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
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.create_profile_for_new_user();

insert into public.profiles (id, display_name)
select
    u.id,
    coalesce(
        nullif(left(trim(u.raw_user_meta_data ->> 'display_name'), 40), ''),
        'Čtenář'
    )
from auth.users as u
on conflict (id) do nothing;

create or replace function public.get_leaderboard()
returns table (
    rank_position bigint,
    display_name text,
    total_minutes bigint,
    current_streak bigint
)
language sql
stable
security definer
set search_path = ''
as $$
    with app_date as (
        select (now() at time zone 'Europe/Prague')::date as today
    ),
    eligible_profiles as (
        select p.id, p.display_name
        from public.profiles as p
        where p.competition_enabled
    ),
    totals as (
        select
            e.user_id,
            coalesce(sum(e.minutes), 0)::bigint as total_minutes,
            coalesce(sum(e.books), 0)::bigint as total_books,
            coalesce(
                sum(e.minutes) filter (
                    where e.entry_date between app_date.today - 6 and app_date.today
                ),
                0
            )::numeric / 7 as weekly_daily_average
        from public.reading_entries as e
        join eligible_profiles as p on p.id = e.user_id
        cross join app_date
        group by e.user_id
    ),
    numbered_reading_days as (
        select
            e.user_id,
            e.entry_date - row_number() over (
                partition by e.user_id
                order by e.entry_date
            )::integer as streak_group,
            e.entry_date
        from public.reading_entries as e
        join eligible_profiles as p on p.id = e.user_id
        cross join app_date
        where e.minutes > 0
          and e.entry_date between app_date.today - 3660 and app_date.today
    ),
    streaks as (
        select
            d.user_id,
            count(*)::bigint as current_streak
        from numbered_reading_days as d
        cross join app_date
        group by d.user_id, d.streak_group, app_date.today
        having max(d.entry_date) between app_date.today - 1 and app_date.today
    ),
    ranked as (
        select
            row_number() over (
                order by
                    coalesce(t.total_minutes, 0) desc,
                    coalesce(s.current_streak, 0) desc,
                    coalesce(t.total_books, 0) desc,
                    coalesce(t.weekly_daily_average, 0) desc,
                    p.display_name collate "C" asc
            ) as rank_position,
            p.display_name,
            coalesce(t.total_minutes, 0)::bigint as total_minutes,
            coalesce(s.current_streak, 0)::bigint as current_streak,
            coalesce(t.total_books, 0)::bigint as total_books,
            coalesce(t.weekly_daily_average, 0)::numeric as weekly_daily_average
        from eligible_profiles as p
        left join totals as t on t.user_id = p.id
        left join streaks as s on s.user_id = p.id
    )
    select r.rank_position, r.display_name, r.total_minutes, r.current_streak
    from ranked as r
    order by
        r.total_minutes desc,
        r.current_streak desc,
        r.total_books desc,
        r.weekly_daily_average desc,
        r.display_name collate "C" asc;
$$;

revoke all on function public.get_leaderboard() from public;
grant execute on function public.get_leaderboard() to anon, authenticated;
