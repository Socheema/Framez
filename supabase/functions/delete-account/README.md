# delete-account (Supabase Edge Function)

Cascade deletes a user's entire footprint (DB rows + storage) and then removes the Auth user. Runs with the service role after verifying the caller.

## What it does
- Validates the caller using the bearer token from the request (must be the same user as `userId` in the body)
- Deletes related data in this order:
  1. messages sent by the user
  2. messages in conversations involving the user
  3. conversations involving the user
  4. likes by the user
  5. comments by the user
  6. follows where the user is follower or following
  7. gathers post image paths, deletes posts
  8. gathers avatar path, deletes profile row
  9. removes storage objects from `posts` and `avatars` buckets
  10. deletes the auth user (`auth.admin.deleteUser`)
- Returns a structured JSON with per-table counts, steps taken, and any errors. If some steps fail, returns status 207 and includes `errors`.

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

```js
const { data, error } = await supabase.functions.invoke('delete-account', {
  body: { userId: user.id }
});

if (error) {
  // Show a friendly error
}

// data has shape:
// {
//   userId: '...',
//   success: boolean,
//   counts: { likes?: number, comments?: number, ... },
//   steps: [ { table?: string, deleted?: number } | { bucket?: string, removed?: number } | { auth: 'user_deleted' } ],
//   errors: [ { table?: string, bucket?: string, step?: string, message: string } ]
// }
```

The request must include a valid Authorization bearer token (Supabase JS adds it automatically for authenticated users).
