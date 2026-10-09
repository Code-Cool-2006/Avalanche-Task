import { useEffect, useState } from "react";
import { Film, Mail, Lock, User, Phone, ShieldCheck, Eye, EyeOff, ArrowLeft, Loader2, Ticket, QrCode, Armchair } from "lucide-react";
import { useAuth } from "./AuthContext";
import "./auth.css";

const strength = (p) => {
  let s = 0;
  if (p.length >= 10) s++;
  if (p.length >= 14) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p) && /[^a-zA-Z0-9]/.test(p)) s++;
  return s; // 0..4
};
const LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"];

function Field({ icon: Icon, label, id, type = "text", value, onChange, ...rest }) {
  const [show, setShow] = useState(false);
  const isPw = type === "password";
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-input-wrap">
        <Icon size={16} aria-hidden="true" />
        <input id={id} type={isPw && show ? "text" : type} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
        {isPw && (
          <button type="button" className="auth-eye" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

function SubmitBtn({ busy, children }) {
  return (
    <button className="auth-btn" disabled={busy}>
      {busy ? <Loader2 size={18} className="auth-spin" /> : children}
    </button>
  );
}

function StrengthMeter({ value }) {
  const s = strength(value);
  if (!value) return null;
  return (
    <div className="auth-strength" aria-live="polite">
      <div className="auth-strength-bars">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={i <= s ? `on lvl-${s}` : ""} />
        ))}
      </div>
      <small>{LABELS[s]}</small>
    </div>
  );
}

function OtpInput({ value, onChange }) {
  return (
    <div className="auth-field">
      <label htmlFor="otp">6-digit code</label>
      <input
        id="otp"
        className="auth-otp"
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

  const titles = {
    login: ["Welcome back", "Sign in to book your next show."],
    register: ["Create your account", "Join CineShow in under a minute."],
    verify: ["Verify your email", "Enter the code we just sent you."],
    forgot: ["Forgot password", "We'll email you a reset code."],
    reset: ["Set a new password", "Enter the code and choose a new password."],
  };
  const [title, sub] = titles[mode];
  return (
    <main className="auth-root">
      <aside className="auth-hero" aria-hidden="true">
        <div className="auth-brand">
          <span className="auth-logo"><Film size={22} /></span>
          <span className="auth-brand-name">CINESHOW</span>
        </div>
        <h2>Your seat.<br />Your screen.<br /><em>Your night.</em></h2>
        <ul>
          <li><Ticket size={18} /> Instant e-tickets for every show</li>
          <li><Armchair size={18} /> Pick the exact seats you want</li>
          <li><QrCode size={18} /> Skip the queue with QR entry</li>
          <li><ShieldCheck size={18} /> Email-verified, encrypted accounts</li>
        </ul>
      </aside>

      <section className="auth-panel">
        <div className="auth-card" key={mode}>
          {["verify", "forgot", "reset"].includes(mode) && (
            <button type="button" className="auth-back" onClick={() => go("login")}>
              <ArrowLeft size={15} /> Back to sign in
            </button>
          )}
          <h1>{title}</h1>
          <p className="auth-sub">{sub}</p>
          <div role="alert" aria-live="assertive">
            {err && <div className="auth-msg err">{err}</div>}
          </div>
          {info && <div className="auth-msg ok" role="status">{info}</div>}

          {mode === "login" && (
            <form onSubmit={login} noValidate>
              <Field id="email" label="Email" icon={Mail} type="email" value={f.email} onChange={set("email")} autoComplete="email" required />
              <Field id="password" label="Password" icon={Lock} type="password" value={f.password} onChange={set("password")} autoComplete="current-password" required />
              <button type="button" className="auth-link right" onClick={() => go("forgot")}>Forgot password?</button>
              <SubmitBtn busy={busy}>Sign in</SubmitBtn>
              <p className="auth-switch">New here? <button type="button" className="auth-link" onClick={() => go("register")}>Create an account</button></p>
            </form>
          )}

          {mode === "register" && (
            <form onSubmit={register} noValidate>
              <Field id="name" label="Full name" icon={User} value={f.name} onChange={set("name")} autoComplete="name" required />
              <Field id="email" label="Email" icon={Mail} type="email" value={f.email} onChange={set("email")} autoComplete="email" required />
              <Field id="phone" label="Phone (optional)" icon={Phone} type="tel" value={f.phone} onChange={set("phone")} autoComplete="tel" />
              <Field id="password" label="Password" icon={Lock} type="password" value={f.password} onChange={set("password")} autoComplete="new-password" required minLength={10} />
              <StrengthMeter value={f.password} />
              <p className="auth-hint">At least 10 characters with letters and numbers.</p>
              <SubmitBtn busy={busy}>Create account</SubmitBtn>
              <p className="auth-switch">Already registered? <button type="button" className="auth-link" onClick={() => go("login")}>Sign in</button></p>
            </form>
          )}

          {mode === "verify" && (
            <form onSubmit={verify} noValidate>
              <OtpInput value={f.code} onChange={set("code")} />
              <SubmitBtn busy={busy}>Verify &amp; continue</SubmitBtn>
              <p className="auth-switch">
                Didn't get it?{" "}
                <button type="button" className="auth-link" disabled={cooldown > 0} onClick={resend}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
              </p>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={forgot} noValidate>
              <Field id="email" label="Email" icon={Mail} type="email" value={f.email} onChange={set("email")} autoComplete="email" required />
              <SubmitBtn busy={busy}>Send reset code</SubmitBtn>
            </form>
          )}

          {mode === "reset" && (
            <form onSubmit={reset} noValidate>
              <OtpInput value={f.code} onChange={set("code")} />
              <Field id="password" label="New password" icon={Lock} type="password" value={f.password} onChange={set("password")} autoComplete="new-password" required />
              <StrengthMeter value={f.password} />
              <SubmitBtn busy={busy}>Update password</SubmitBtn>
              <p className="auth-switch">
                <button type="button" className="auth-link" disabled={cooldown > 0} onClick={resend}>
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
