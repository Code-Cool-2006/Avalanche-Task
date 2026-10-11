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

function BioCineShowLogo() {
  return (
    <div className="cineverse-brand">
      <span className="cineverse-brand-name">BIO CINESHOW</span>
      <span className="brand-sub-badge" style={{ marginLeft: 8 }}>1926</span>
    </div>
  );
}

function StarSparkle({ style }) {
  return <span className="star-sparkle" style={style}>★</span>;
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
          <BioCineShowLogo />
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
              {isRegister ? "JOIN BIO CINESHOW" : "WELCOME BACK"}
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
              alt={isRegister ? "Bio CineShow Premiere & Filmmaking Assets" : "Bio CineShow Popcorn & Cinema Treats"}
              className="cine-hero-illustration-img"
            />
          </div>
        </div>

        {/* Hero Footer without confusing scroll dots */}
        <div className="cine-hero-footer">
          <span className="cine-footer-tag">
            {isRegister ? "STOCKHOLM 1926 • ARTHOUSE CINEMA" : "EST. 1926 • CLASSIC SCREENINGS"}
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
