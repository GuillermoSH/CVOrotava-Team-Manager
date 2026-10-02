-- Point lookup for allowlist checks (.eq email) instead of full table scan.
create index if not exists idx_allowed_emails_email
  on public.allowed_emails (email);
