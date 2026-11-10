import { useState } from "react";
import { supabase } from "../lib/supabase";

type Mode = "login" | "signup";

function Logo() {
  return (
    <div className="logo">
      <div className="logo-mark">
        <span>C</span>
        <i />
      </div>
      <div>
        <strong>CICI</strong>
        <small>Cicilan Cerdas</small>
      </div>
    </div>
  );
}

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const isSignup = mode === "signup";
  const formValid = email.trim().length > 3 && password.length >= 6;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setInfo("");
    if (!formValid) return;
    setLoading(true);
    try {
      if (isSignup) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        setInfo("Pendaftaran berhasil. Periksa email kamu untuk konfirmasi (jika diaktifkan), lalu masuk.");
        setMode("login");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <Logo />
        <div className="auth-heading">
          <h1>{isSignup ? "Buat akun CICI" : "Masuk ke CICI"}</h1>
          <p>
            {isSignup
              ? "Daftar dengan email dan kata sandi untuk mulai mengelola cicilan."
              : "Masuk untuk melihat dashboard dan proyeksi arus kasmu."}
          </p>
        </div>
        <form onSubmit={submit} className="auth-form">
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@email.com"
              required
            />
          </label>
          <label className="field">
            <span>Kata sandi</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimal 6 karakter"
              minLength={6}
              required
            />
          </label>
          {error && <div className="auth-error">{error}</div>}
          {info && <div className="auth-info">{info}</div>}
          <button className="button primary auth-submit" type="submit" disabled={!formValid || loading}>
            {loading ? "Memproses..." : isSignup ? "Daftar" : "Masuk"}
          </button>
        </form>
        <button
          className="button ghost auth-switch"
          type="button"
          onClick={() => {
            setMode(isSignup ? "login" : "signup");
            setError("");
            setInfo("");
          }}
        >
          {isSignup ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar"}
        </button>
      </div>
    </div>
  );
}
