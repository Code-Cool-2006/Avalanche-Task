import { useEffect, useState } from "react";
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "./AuthContext";
import loginIllustrationImg from "../assets/cinema-login-items.jpg";
import signupIllustrationImg from "../assets/cinema-signup-items.jpg";
import cineverseLogoImg from "../assets/cineverse-brand-logo.jpg";
import clapperBadgeImg from "../assets/cinema-clapper-badge.jpg";
import vipTicketBadgeImg from "../assets/cinema-vip-ticket-badge.jpg";
import popcornBadgeImg from "../assets/cinema-popcorn-sticker.jpg";
import "./auth.css";

function CineverseLogo() {
  return (
    <div className="cineverse-brand">
      <img src={cineverseLogoImg} alt="Cineverse Emblem" className="cineverse-brand-emblem-img" />
      <span className="cineverse-brand-name">CINEVERSE</span>
    </div>
  );
}

function StarSparkle({ style }) {
  return <span className="star-sparkle" style={style}>★</span>;
}

function SocialLoginRow() {
  return (
    <div className="cine-social-row">
      <button type="button" className="btn-social-item" title="Continue with Google" aria-label="Google">
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"/>
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.34 24 12 24z"/>
          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.99 0 12s.46 3.84 1.26 5.42l4.02-3.15z"/>
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
        </svg>
      </button>

      <button type="button" className="btn-social-item" title="Continue with Facebook" aria-label="Facebook">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      </button>

      <button type="button" className="btn-social-item" title="Continue with Apple" aria-label="Apple">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#111111">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.42c.6-1.02 1.01-2.44.89-3.86-1.22.05-2.69.82-3.56 1.84-.78.9-1.46 2.34-1.28 3.73 1.36.1 2.74-.7 3.95-1.71"/>
        </svg>
      </button>
    </div>
  );
}

function Field({ icon: Icon, label, id, type = "text", value, onChange, placeholder, ...rest }) {
  const [show, setShow] = useState(false);
  const isPw = type === "password";
  return (
    <div className="cine-auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="cine-input-wrap">
        <Icon size={16} className="cine-input-icon" aria-hidden="true" />
        <input
          id={id}
          type={isPw && show ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          {...rest}
        />
        {isPw && (
          <button
            type="button"
            className="cine-eye-btn"
            onClick={() => setShow(!show)}
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

function SubmitBtn({ busy, label }) {
  return (
    <button className="cine-btn-cta" disabled={busy}>
      {busy ? (
        <Loader2 size={18} className="cine-spin" />
      ) : (
        <>
          <span>{label}</span>
          <ArrowRight size={16} />
        </>
      )}
    </button>
  );
}

function OtpInput({ value, onChange }) {
  return (
    <div className="cine-auth-field">
      <label htmlFor="otp">6-DIGIT CODE</label>
      <input
        id="otp"
        className="cine-otp-input"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="••••••"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        autoFocus
      />
    </div>
  );
}

export default function AuthPage() {
  const { call, setUser } = useAuth();
  // mode: login | register | verify | forgot | reset
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "", code: "" });
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const go = (m) => {
    setMode(m);
    setErr("");
    setInfo("");
  };

  const submit = (fn) => async (e) => {
    e.preventDefault();
    setErr("");
    setInfo("");
    setBusy(true);
    try {
      await fn();
    } catch (x) {
      if (x.needsVerification) {
        go("verify");
        setInfo("Your email isn't verified yet. We sent you a new code.");
        setCooldown(60);
      } else setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  const login = submit(async () => setUser((await call("login", { email: f.email, password: f.password })).user));
  const register = submit(async () => {
    await call("register", { name: f.name, email: f.email, phone: f.phone, password: f.password });
    go("verify");
    setInfo(`We emailed a 6-digit code to ${f.email}.`);
    setCooldown(60);
  });
  const verify = submit(async () => setUser((await call("verify-otp", { email: f.email, code: f.code })).user));
  const forgot = submit(async () => {
    await call("forgot", { email: f.email });
    go("reset");
    setInfo("If that account exists, a reset code is on its way.");
    setCooldown(60);
  });
  const reset = submit(async () => {
    const d = await call("reset", { email: f.email, code: f.code, password: f.password });
    setF((p) => ({ ...p, code: "", password: "" }));
    go("login");
    setInfo(d.message);
  });
  const resend = async () => {
    setErr("");
    try {
      await call(mode === "verify" ? "resend-otp" : "forgot", { email: f.email });
      setInfo("New code sent.");
      setCooldown(60);
    } catch (x) {
      setErr(x.message);
    }
  };

  const isRegister = mode === "register";

  return (
    <main className="cine-auth-root">
      {/* LEFT CINEMA HERO PANEL */}
      <aside className="cine-hero-panel" aria-hidden="true">
        {/* Top Header with Brand Logo & Navigation */}
        <div className="cine-hero-top-nav">
          <CineverseLogo />
          <nav className="cine-top-links">
            <span className="nav-item">Movies</span>
            <span className="nav-item">Shows</span>
            <span className="nav-item">Bookings</span>
          </nav>
        </div>

        {/* Hero Copy & Generated Cinema Graphic */}
        <div className="cine-hero-body">
          <div className="cine-hero-copy">
            <span className="cine-overline">
              {isRegister ? "JOIN CINEVERSE" : "WELCOME BACK"}
            </span>

            {isRegister ? (
              <h1 className="cine-hero-heading">
                Ready for your<br />
                <em>next show?</em>
              </h1>
            ) : (
              <h1 className="cine-hero-heading">
                Let's get you<br />
                <em>seated.</em>
              </h1>
            )}

            <p className="cine-hero-desc">
              {isRegister
                ? "Create an account and start exploring a world of movies."
                : "Your next favourite movie is just a login away."}
            </p>

            {/* Generated Perks Component Badges */}
            <div className="cine-hero-perks-row">
              <div className="perk-pill">
                <img src={popcornBadgeImg} alt="Popcorn treat" className="perk-pill-img" />
                <span>Gourmet Treats</span>
              </div>
              <div className="perk-pill">
                <img src={vipTicketBadgeImg} alt="VIP Pass" className="perk-pill-img" />
                <span>Instant M-Tickets</span>
              </div>
            </div>
          </div>

          {/* AI-Generated Cinema Items Illustration */}
          <div className="cine-hero-graphic-wrap">
            <img
              key={mode}
              src={isRegister ? signupIllustrationImg : loginIllustrationImg}
              alt={isRegister ? "Cineverse Premiere & Filmmaking Assets" : "Cineverse Popcorn & Cinema Treats"}
              className="cine-hero-illustration-img"
            />
          </div>
        </div>

        {/* Hero Footer */}
        <div className="cine-hero-footer">
          <div className="cine-dots-pagination">
            <span className="dot active" />
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
          <span className="cine-footer-tag">
            {isRegister ? "DISCOVER • EXPLORE" : "WATCH • REPEAT"}
          </span>
        </div>
      </aside>

      {/* RIGHT WARM CREAM FORM PANEL */}
      <section className="cine-form-panel">
        <div className="cine-form-box" key={mode}>
          <StarSparkle style={{ position: "absolute", top: "18px", right: "20px", color: "#f4b815", fontSize: "14px" }} />

          {/* Back button for recovery / verification sub-flows */}
          {["verify", "forgot", "reset"].includes(mode) && (
            <button type="button" className="cine-back-btn" onClick={() => go("login")}>
              <ArrowLeft size={15} /> Back to Sign In
            </button>
          )}

          {/* Top Form Generated Badge Component */}
          <div className="cine-form-top-badge">
            <img
              src={isRegister ? vipTicketBadgeImg : clapperBadgeImg}
              alt="Cinema Badge"
              className="cine-form-badge-img"
            />
          </div>

          <h2 className="cine-form-title">
            {mode === "login" && "Welcome Back"}
            {mode === "register" && "Create Account"}
            {mode === "verify" && "Verify Email"}
            {mode === "forgot" && "Forgot Password"}
            {mode === "reset" && "Set New Password"}
          </h2>

          <p className="cine-form-sub">
            {mode === "login" && "Log in to continue your movie journey."}
            {mode === "register" && "Ready for your next show? Join us today."}
            {mode === "verify" && "Enter the 6-digit code sent to your email."}
            {mode === "forgot" && "We'll email you a recovery code."}
            {mode === "reset" && "Enter the code and choose a new password."}
          </p>

          {/* Alert messages */}
          <div role="alert" aria-live="assertive">
            {err && <div className="cine-msg err">{err}</div>}
          </div>
          {info && <div className="cine-msg ok" role="status">{info}</div>}

          {/* LOGIN FORM */}
          {mode === "login" && (
            <form onSubmit={login} noValidate>
              <Field
                id="email"
                label="EMAIL OR PHONE"
                icon={Mail}
                type="email"
                value={f.email}
                onChange={set("email")}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />

              <Field
                id="password"
                label="PASSWORD"
                icon={Lock}
                type="password"
                value={f.password}
                onChange={set("password")}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />

              <div className="cine-forgot-row">
                <button type="button" className="cine-link-inline" onClick={() => go("forgot")}>
                  Forgot password?
                </button>
              </div>

              <SubmitBtn busy={busy} label="LOGIN" />

              <div className="cine-divider">
                <span>OR CONTINUE WITH</span>
              </div>

              <SocialLoginRow />

              <p className="cine-switch-prompt">
                Don't have an account?{" "}
                <button type="button" className="cine-link-action" onClick={() => go("register")}>
                  Sign up
                </button>
              </p>
            </form>
          )}

          {/* SIGN UP / REGISTER FORM */}
          {mode === "register" && (
            <form onSubmit={register} noValidate>
              <Field
                id="name"
                label="FULL NAME"
                icon={User}
                value={f.name}
                onChange={set("name")}
                placeholder="Your full name"
                autoComplete="name"
                required
              />

              <Field
                id="email"
                label="EMAIL OR PHONE"
                icon={Mail}
                type="email"
                value={f.email}
                onChange={set("email")}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />

              <Field
                id="password"
                label="PASSWORD"
                icon={Lock}
                type="password"
                value={f.password}
                onChange={set("password")}
                placeholder="Create a password"
                autoComplete="new-password"
                required
                minLength={8}
              />

              <SubmitBtn busy={busy} label="SIGN UP" />

              <div className="cine-divider">
                <span>OR CONTINUE WITH</span>
              </div>

              <SocialLoginRow />

              <p className="cine-switch-prompt">
                Already have an account?{" "}
                <button type="button" className="cine-link-action" onClick={() => go("login")}>
                  Log In
                </button>
              </p>
            </form>
          )}

          {/* VERIFY OTP FORM */}
          {mode === "verify" && (
            <form onSubmit={verify} noValidate>
              <OtpInput value={f.code} onChange={set("code")} />
              <SubmitBtn busy={busy} label="VERIFY & CONTINUE" />
              <p className="cine-switch-prompt">
                Didn't get it?{" "}
                <button type="button" className="cine-link-inline" disabled={cooldown > 0} onClick={resend}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
              </p>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === "forgot" && (
            <form onSubmit={forgot} noValidate>
              <Field
                id="email"
                label="EMAIL OR PHONE"
                icon={Mail}
                type="email"
                value={f.email}
                onChange={set("email")}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
              <SubmitBtn busy={busy} label="SEND RESET CODE" />
            </form>
          )}

          {/* RESET PASSWORD FORM */}
          {mode === "reset" && (
            <form onSubmit={reset} noValidate>
              <OtpInput value={f.code} onChange={set("code")} />
              <Field
                id="password"
                label="NEW PASSWORD"
                icon={Lock}
                type="password"
                value={f.password}
                onChange={set("password")}
                placeholder="Choose a new password"
                autoComplete="new-password"
                required
              />
              <SubmitBtn busy={busy} label="UPDATE PASSWORD" />
              <p className="cine-switch-prompt">
                <button type="button" className="cine-link-inline" disabled={cooldown > 0} onClick={resend}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
              </p>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
