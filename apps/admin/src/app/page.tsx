// The admin portal (decision D17, D30): built in Phase 1 from the approved mockup.
// It runs on its own subdomain behind Cloudflare Access; it has no public pages.
export default function AdminHome() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-4 px-6">
      <h1 className="font-display text-4xl font-bold">Admin</h1>
      <p className="text-muted-foreground">Signed-in team members only.</p>
    </main>
  );
}
