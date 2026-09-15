import { useEffect, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function AdminLogin() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        navigate("/admin/dashboard", { replace: true });
      }
    };

    checkSession();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    navigate("/admin/dashboard", { replace: true });
  };

  return (
    <main className="min-h-screen bg-[#070a10] text-white">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* LEFT */}
        <div className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.08),transparent_35%),linear-gradient(135deg,#111722,#06080d)]" />

          <div className="absolute left-12 top-12 z-10">
            <p className="text-xs uppercase tracking-[0.45em] text-white/40">
              JP Infra
            </p>
          </div>

          <div className="absolute bottom-14 left-12 z-10 max-w-lg">
            <p className="mb-5 text-xs uppercase tracking-[0.4em] text-white/40">
              Private Analytics
            </p>

            <h1 className="text-5xl font-light leading-tight xl:text-6xl">
              Understand how
              <br />
              visitors experience
              <br />
              your website.
            </h1>

            <p className="mt-6 max-w-md text-sm leading-7 text-white/45">
              Monitor visitors, engagement, page performance and
              interactions from one private analytics workspace.
            </p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">

            <div className="mb-10 lg:hidden">
              <p className="text-xs uppercase tracking-[0.4em] text-white/40">
                JP Infra
              </p>
            </div>

            <div className="mb-10">
              <p className="mb-3 text-xs uppercase tracking-[0.35em] text-white/35">
                Administrator
              </p>

              <h2 className="text-4xl font-light">
                Welcome back
              </h2>

              <p className="mt-3 text-sm text-white/40">
                Sign in to access your analytics dashboard.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">

              {/* EMAIL */}
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/40">
                  Email
                </label>

                <div className="relative">
                  <Mail
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                  />

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    required
                    disabled={loading}
                    className="h-14 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-12 pr-4 text-sm outline-none transition placeholder:text-white/20 focus:border-white/30 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/40">
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                  />

                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    className="h-14 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-12 pr-12 text-sm outline-none transition placeholder:text-white/20 focus:border-white/30 disabled:opacity-50"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 transition hover:text-white disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </div>

              {/* ERROR */}
              {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {/* LOGIN */}
              <button
                type="submit"
                disabled={loading}
                className="h-14 w-full rounded-xl bg-white text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="mt-8 flex items-center gap-3 text-[11px] text-white/25">
              <div className="h-px flex-1 bg-white/10" />
              <span>PRIVATE ADMIN AREA</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}

export default AdminLogin;