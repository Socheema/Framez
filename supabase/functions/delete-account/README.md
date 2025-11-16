# delete-account (Supabase Edge Function)

Deletes the currently authenticated user from Supabase Auth using the service role.

## What it does
- Validates the caller using the bearer token from the request (must be the same user as `userId` in the body)
- Uses the service-role key to call `auth.admin.deleteUser(userId)`
- Returns `{ success: true }` on success

## Deploy

1) Install Supabase CLI (if you don't have it):

```bash
npm i -g supabase
```

2) Login and link your project:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

3) Set required secrets for the function:

```bash
supabase secrets set \
  SUPABASE_URL="https://YOUR-PROJECT-ref.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY" \
  SUPABASE_ANON_KEY="YOUR_ANON_KEY"
```

4) Deploy the function:

```bash
supabase functions deploy delete-account
```

5) (Optional) Test locally:

```bash
supabase functions serve --env-file .env.local --no-verify-jwt
```

## Invoke (client)

The app already calls this function from `EditProfileModal`:

```js
await supabase.functions.invoke('delete-account', { body: { userId } })
```

The request must include a valid Authorization bearer token (handled by the Supabase JS client).