-- Seed data for local/staging testing.
-- Uses existing profile rows (no auth.users creation) and is safe to re-run.

-- Step 1: Promote existing non-admin profiles into predictable test roles.
with ranked_profiles as (
  select
    id,
    row_number() over (order by created_at nulls last, id) as rn
  from public.profiles
  where coalesce(lower(role), 'public') <> 'admin'
)
update public.profiles p
set
  role = case
    when rp.rn <= 4 then 'doctor'
    when rp.rn <= 6 then 'student'
    else 'public'
  end,
  status = 'verified',
  approval_status = 'verified',
  verified = true,
  full_name = case
    when coalesce(nullif(trim(p.full_name), ''), '') <> '' then p.full_name
    when rp.rn = 1 then 'Dr. Arjun Dhakad'
    when rp.rn = 2 then 'Dr. Kavita Dhakad'
    when rp.rn = 3 then 'Dr. Mehul Dhakad'
    when rp.rn = 4 then 'Dr. Nidhi Dhakad'
    when rp.rn = 5 then 'Rohit Dhakad'
    when rp.rn = 6 then 'Priya Dhakad'
    else concat('Member ', rp.rn)
  end,
  age = coalesce(p.age, 24 + rp.rn),
  gender = coalesce(p.gender, case when rp.rn % 2 = 0 then 'female' else 'male' end),
  phone = coalesce(p.phone, concat('+91900000', lpad((100 + rp.rn)::text, 3, '0'))),
  state = coalesce(p.state, 'Madhya Pradesh'),
  district = coalesce(
    p.district,
    case
      when rp.rn in (1, 2) then 'Indore'
      when rp.rn in (3, 4) then 'Ujjain'
      when rp.rn in (5, 6) then 'Dewas'
      else 'Bhopal'
    end
  ),
  city = coalesce(
    p.city,
    case
      when rp.rn in (1, 2) then 'Indore'
      when rp.rn in (3, 4) then 'Ujjain'
      when rp.rn in (5, 6) then 'Dewas'
      else 'Bhopal'
    end
  ),
  qualification = case
    when rp.rn <= 4 then coalesce(p.qualification, 'MBBS, MD')
    else p.qualification
  end,
  specialization = case
    when rp.rn = 1 then coalesce(p.specialization, 'Cardiology')
    when rp.rn = 2 then coalesce(p.specialization, 'Pediatrics')
    when rp.rn = 3 then coalesce(p.specialization, 'Orthopedics')
    when rp.rn = 4 then coalesce(p.specialization, 'General Medicine')
    else p.specialization
  end,
  experience = case
    when rp.rn = 1 then coalesce(p.experience, '12 years')
    when rp.rn = 2 then coalesce(p.experience, '9 years')
    when rp.rn = 3 then coalesce(p.experience, '7 years')
    when rp.rn = 4 then coalesce(p.experience, '6 years')
    else p.experience
  end,
  clinic_name = case
    when rp.rn = 1 then coalesce(p.clinic_name, 'Dhakad Heart Clinic')
    when rp.rn = 2 then coalesce(p.clinic_name, 'Child Care Center')
    when rp.rn = 3 then coalesce(p.clinic_name, 'Bone & Joint Clinic')
    when rp.rn = 4 then coalesce(p.clinic_name, 'Community Health Center')
    else p.clinic_name
  end,
  course = case
    when rp.rn in (5, 6) then coalesce(p.course, 'MBBS')
    else p.course
  end,
  college = case
    when rp.rn = 5 then coalesce(p.college, 'Government Medical College, Indore')
    when rp.rn = 6 then coalesce(p.college, 'RD Gardi Medical College, Ujjain')
    else p.college
  end,
  academic_year = case
    when rp.rn = 5 then coalesce(p.academic_year, '3rd Year')
    when rp.rn = 6 then coalesce(p.academic_year, 'Final Year')
    else p.academic_year
  end,
  gotra = case
    when rp.rn in (5, 6) then coalesce(p.gotra, 'Dhakad')
    else p.gotra
  end,
  show_phone = case
    when rp.rn <= 4 then true
    else coalesce(p.show_phone, false)
  end,
  updated_at = now()
from ranked_profiles rp
where p.id = rp.id;

-- Step 2: Seed committee members from verified doctors.
insert into public.committee_members (user_id, full_name, designation, tier, rank, state, district, status, approval_status)
select
  p.id,
  p.full_name,
  case row_number() over (order by p.full_name)
    when 1 then 'National President'
    when 2 then 'National Secretary'
    else 'National Coordinator'
  end,
  'national',
  row_number() over (order by p.full_name),
  null,
  null,
  'approved',
  'approved'
from public.profiles p
where lower(coalesce(p.role, '')) = 'doctor'
  and p.verified = true
  and not exists (
    select 1
    from public.committee_members cm
    where cm.user_id = p.id
      and cm.tier = 'national'
  )
limit 3;

insert into public.committee_members (user_id, full_name, designation, tier, rank, state, district, status, approval_status)
select
  p.id,
  p.full_name,
  'State Member',
  'state',
  row_number() over (order by p.full_name),
  coalesce(p.state, 'Madhya Pradesh'),
  null,
  'approved',
  'approved'
from public.profiles p
where lower(coalesce(p.role, '')) = 'doctor'
  and p.verified = true
  and not exists (
    select 1
    from public.committee_members cm
    where cm.user_id = p.id
      and cm.tier = 'state'
  )
limit 4;

insert into public.committee_members (user_id, full_name, designation, tier, rank, state, district, status, approval_status)
select
  p.id,
  p.full_name,
  'District Member',
  'district',
  row_number() over (order by p.full_name),
  coalesce(p.state, 'Madhya Pradesh'),
  coalesce(p.district, 'Indore'),
  'approved',
  'approved'
from public.profiles p
where lower(coalesce(p.role, '')) = 'doctor'
  and p.verified = true
  and not exists (
    select 1
    from public.committee_members cm
    where cm.user_id = p.id
      and cm.tier = 'district'
  )
limit 6;

-- Step 3: Seed a few active expiring stories.
insert into public.stories (title, content, expires_at)
select
  'Annual Meet 2026',
  '<p>Annual community meet will be held next Sunday at 11:00 AM.</p>',
  now() + interval '5 days'
where not exists (
  select 1 from public.stories where title = 'Annual Meet 2026'
);

insert into public.stories (title, content, expires_at)
select
  'Blood Donation Drive',
  '<p>Join the district blood donation drive this weekend.</p>',
  now() + interval '3 days'
where not exists (
  select 1 from public.stories where title = 'Blood Donation Drive'
);

insert into public.stories (title, content, expires_at)
select
  'Student Mentorship Session',
  '<p>Verified doctors will mentor medical students on Saturday evening.</p>',
  now() + interval '7 days'
where not exists (
  select 1 from public.stories where title = 'Student Mentorship Session'
);
