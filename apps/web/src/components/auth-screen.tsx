import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../hooks/use-auth";
import { api } from "../lib/api";
import { Brand, Icon } from "./brand";

export function AuthScreen({ register = false }: { register?: boolean }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const result = await api.post(register ? "/auth/register" : "/auth/login", { email, password, ...(register ? { adventurerName: name } : {}) });
      login(result.token, result.user); navigate("/dashboard");
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível entrar. Tente novamente."); }
    finally { setSaving(false); }
  }
  return <main className="auth-shell">
    <section className="auth-story" aria-label="HorizonQuest"><Brand /><div className="auth-story-content"><p className="eyebrow">CÓDIGO. CONQUISTAS. COMUNIDADE.</p><h2>Seu próximo <em>horizonte</em> começa aqui.</h2><p>Transforme desafios em experiência. Encontre sua guilda, construa projetos e escreva uma jornada que é só sua.</p></div><div className="auth-story-footer"><Icon name="quests" /><span>Aprenda construindo. Evolua compartilhando.</span></div></section>
    <section className="auth-form-side"><div className="auth-form-card"><div className="auth-mobile-brand"><Brand /></div><p className="eyebrow">{register ? "O PRIMEIRO PASSO" : "BEM-VINDO À GUILDA"}</p><h1>{register ? "Comece sua aventura." : "Sua jornada continua."}</h1><p className="auth-description">{register ? "Crie seu perfil de aventureiro e encontre seu próximo desafio." : "Entre na sua conta para retomar missões, explorar projetos e evoluir."}</p>
      <form className="auth-form" onSubmit={submit}>
        {register && <label className="auth-field">Nome de aventureiro<input required minLength={3} maxLength={80} autoComplete="nickname" value={name} onChange={e => setName(e.target.value)} placeholder="Como a guilda vai chamar você?" /></label>}
        <label className="auth-field">Email<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@exemplo.com" /></label>
        <label className="auth-field">Senha<input type="password" required minLength={6} autoComplete={register ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} placeholder={register ? "Pelo menos 6 caracteres" : "Sua senha"} /></label>
        {error && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
        <button className="hq-button" disabled={saving}>{saving ? "Aguarde..." : register ? "Criar minha conta" : "Entrar na guilda"}<Icon name="arrow" /></button>
      </form>
      <p className="auth-switch">{register ? "Já faz parte da guilda?" : "Sua primeira aventura?"} <Link to={register ? "/" : "/register"}>{register ? "Entrar na conta" : "Criar uma conta"}</Link></p>
    </div></section>
  </main>;
}
