# Architecture notes

Mudra Sanchay follows the LLD in `docs/Mudra_Sanchay_Development_Plan_LLD_User_Stories.md`.

```text
React PWA on Netlify
        |
        | HTTPS + access token
        v
Node.js API as Netlify Functions
        |
        +---- Supabase Auth
        +---- PostgreSQL database
        +---- Supabase Storage
```

Local development uses an in-memory API so the first vertical slice works without a Supabase project:

1. Register owner
2. Onboard business, pickup and Ugaon → Pimpalgaon route
3. Add farmer
4. Create trip and crate entries (50 × INR 25 = INR 1,250)
5. Record payment and view farmer ledger

When `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, later work should replace the in-memory store with repositories against Postgres. The service-role key must never be shipped to the React app.
