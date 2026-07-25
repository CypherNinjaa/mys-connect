import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      {/* Header / Navbar */}
      <header className="flex items-center justify-between border-b border-slate-800 px-8 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-900 font-bold text-amber-400">
            MYS
          </div>
          <div>
            <h1 className="font-semibold text-white">MYS CONNECT</h1>
            <p className="text-xs text-slate-400">Admin Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="rounded-lg bg-red-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700">
                Sign Up
              </button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            <UserButton showName />
          </SignedIn>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <div className="max-w-xl space-y-6">
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Maheshwari Yuva Sangathan
          </h2>
          <p className="text-lg text-slate-400">
            Enterprise Admin Portal — Member Verification, Event Management, Notices & Analytics
          </p>

          <SignedOut>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur">
              <p className="text-sm text-slate-300">
                Please sign in with your administrator account to access management features.
              </p>
            </div>
          </SignedOut>

          <SignedIn>
            <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/30 p-6 backdrop-blur">
              <p className="text-sm font-medium text-emerald-400">
                ✅ Authenticated — Admin Dashboard Active
              </p>
            </div>
          </SignedIn>
        </div>
      </main>
    </div>
  );
}
