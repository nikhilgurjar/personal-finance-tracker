// app/login/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useFinanceData } from "@/hooks/use-finance-data"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { isConfigured } from "@/lib/firebase"
import { AlertCircle, ShieldAlert, Eye, EyeOff, TrendingUp, PieChart, Wallet } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const { user, loginWithEmail, registerWithEmail, loginWithGoogle } = useFinanceData()

  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      router.push("/dashboard")
    }
  }, [user, router])

  const switchTab = (tab: "signin" | "signup") => {
    setActiveTab(tab)
    setError("")
    setEmail("")
    setPassword("")
    setName("")
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!email || !password) {
      setError("Please enter both email and password.")
      return
    }
    setLoading(true)
    try {
      await loginWithEmail(email, password)
      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please verify credentials.")
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!email || !password || !name) {
      setError("Please fill out all fields.")
      return
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }
    setLoading(true)
    try {
      await registerWithEmail(email, password, name)
      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message || "Failed to create account.")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError("")
    setLoading(true)
    try {
      await loginWithGoogle()
      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message || "Google Authentication failed.")
    } finally {
      setLoading(false)
    }
  }

  const handleBypassDemo = () => {
    loginWithEmail("demo@finio.io", "password")
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen w-full flex" style={{ fontFamily: "'Inter', sans-serif", backgroundColor: "#f8f9fa" }}>
      
      {/* ── LEFT PANEL ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[52%] p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #016630 0%, #009689 60%, #00bfa5 100%)" }}
      >
        {/* Background blobs */}
        <div style={{
          position: "absolute", top: "-80px", right: "-80px",
          width: "320px", height: "320px", borderRadius: "50%",
          background: "rgba(255,255,255,0.07)", pointerEvents: "none"
        }} />
        <div style={{
          position: "absolute", bottom: "60px", left: "-60px",
          width: "260px", height: "260px", borderRadius: "50%",
          background: "rgba(255,255,255,0.06)", pointerEvents: "none"
        }} />
        <div style={{
          position: "absolute", bottom: "-40px", right: "120px",
          width: "160px", height: "160px", borderRadius: "50%",
          background: "rgba(255,255,255,0.05)", pointerEvents: "none"
        }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div style={{
            width: "40px", height: "40px", borderRadius: "12px",
            background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1px solid rgba(255,255,255,0.25)"
          }}>
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: "22px", letterSpacing: "-0.3px" }}>Finio</span>
        </div>

        {/* Main headline */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-4">
            <h1 style={{
              color: "#ffffff", fontWeight: 800, fontSize: "42px",
              lineHeight: "1.15", letterSpacing: "-1px"
            }}>
              Your finances,<br />crystal clear.
            </h1>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "16px", lineHeight: "1.6", maxWidth: "380px" }}>
              Track spending, manage budgets, and grow your savings — all in one beautiful dashboard.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-col gap-3">
            {[
              { icon: TrendingUp, label: "Real-time spending analytics" },
              { icon: PieChart,   label: "Smart budget categorization" },
              { icon: Wallet,     label: "Secure client-side encryption" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div style={{
                  width: "34px", height: "34px", borderRadius: "10px",
                  background: "rgba(255,255,255,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0
                }}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span style={{ color: "rgba(255,255,255,0.88)", fontSize: "14px", fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom caption */}
        <p className="relative z-10" style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px" }}>
          © 2025 Finio · Personal Finance Tracker
        </p>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12" style={{ backgroundColor: "#ffffff" }}>
        
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div style={{
            width: "36px", height: "36px", borderRadius: "10px",
            background: "#016630", display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Wallet className="h-4 w-4 text-white" />
          </div>
          <span style={{ color: "#016630", fontWeight: 700, fontSize: "20px" }}>Finio</span>
        </div>

        <div className="w-full max-w-[400px]">

          {/* Tab switcher — Google style */}
          <div className="flex mb-8" style={{ borderBottom: "2px solid #e8eaed" }}>
            {(["signin", "signup"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => switchTab(tab)}
                style={{
                  flex: 1,
                  paddingBottom: "14px",
                  fontSize: "15px",
                  fontWeight: activeTab === tab ? 600 : 400,
                  color: activeTab === tab ? "#016630" : "#5f6368",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  borderBottom: activeTab === tab ? "2px solid #016630" : "2px solid transparent",
                  marginBottom: "-2px",
                  transition: "all 0.2s ease",
                  letterSpacing: "0.01em"
                }}
              >
                {tab === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#202124", letterSpacing: "-0.4px", marginBottom: "6px" }}>
              {activeTab === "signin" ? "Welcome back" : "Get started for free"}
            </h2>
            <p style={{ fontSize: "14px", color: "#5f6368" }}>
              {activeTab === "signin"
                ? "Sign in to your Finio account"
                : "Create your account in seconds"}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "12px 14px", borderRadius: "10px",
              background: "#fce8e6", border: "1px solid #f5c6c3",
              marginBottom: "16px"
            }}>
              <AlertCircle style={{ width: "16px", height: "16px", color: "#c5221f", flexShrink: 0 }} />
              <span style={{ fontSize: "13px", color: "#c5221f", fontWeight: 500 }}>{error}</span>
            </div>
          )}

          {/* ── SIGN IN FORM ── */}
          {activeTab === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <Label htmlFor="si-email" style={{ fontSize: "13px", fontWeight: 500, color: "#3c4043", display: "block", marginBottom: "6px" }}>
                  Email address
                </Label>
                <Input
                  id="si-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    height: "46px", borderRadius: "10px", fontSize: "14px",
                    border: "1.5px solid #dadce0", backgroundColor: "#fff",
                    color: "#202124", outline: "none", width: "100%",
                    paddingLeft: "14px", paddingRight: "14px",
                    transition: "border-color 0.15s"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#016630"}
                  onBlur={(e) => e.target.style.borderColor = "#dadce0"}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label htmlFor="si-pass" style={{ fontSize: "13px", fontWeight: 500, color: "#3c4043" }}>
                    Password
                  </Label>
                  <button type="button" style={{ fontSize: "13px", color: "#016630", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: "relative" }}>
                  <Input
                    id="si-pass"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      height: "46px", borderRadius: "10px", fontSize: "14px",
                      border: "1.5px solid #dadce0", backgroundColor: "#fff",
                      color: "#202124", width: "100%",
                      paddingLeft: "14px", paddingRight: "44px",
                      transition: "border-color 0.15s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#016630"}
                    onBlur={(e) => e.target.style.borderColor = "#dadce0"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute", right: "12px", top: "50%",
                      transform: "translateY(-50%)", background: "none",
                      border: "none", cursor: "pointer", color: "#80868b", padding: "2px"
                    }}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", height: "46px", borderRadius: "10px",
                  background: loading ? "#ccc" : "#016630",
                  color: "#fff", fontWeight: 600, fontSize: "15px",
                  border: "none", cursor: loading ? "not-allowed" : "pointer",
                  marginTop: "4px", letterSpacing: "0.01em",
                  transition: "background 0.2s, transform 0.1s",
                  boxShadow: "0 2px 8px rgba(1,102,48,0.25)"
                }}
              >
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          )}

          {/* ── SIGN UP FORM ── */}
          {activeTab === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <Label htmlFor="su-name" style={{ fontSize: "13px", fontWeight: 500, color: "#3c4043", display: "block", marginBottom: "6px" }}>
                  Full name
                </Label>
                <Input
                  id="su-name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    height: "46px", borderRadius: "10px", fontSize: "14px",
                    border: "1.5px solid #dadce0", backgroundColor: "#fff",
                    color: "#202124", width: "100%",
                    paddingLeft: "14px", paddingRight: "14px",
                    transition: "border-color 0.15s"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#016630"}
                  onBlur={(e) => e.target.style.borderColor = "#dadce0"}
                />
              </div>
              <div>
                <Label htmlFor="su-email" style={{ fontSize: "13px", fontWeight: 500, color: "#3c4043", display: "block", marginBottom: "6px" }}>
                  Email address
                </Label>
                <Input
                  id="su-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    height: "46px", borderRadius: "10px", fontSize: "14px",
                    border: "1.5px solid #dadce0", backgroundColor: "#fff",
                    color: "#202124", width: "100%",
                    paddingLeft: "14px", paddingRight: "14px",
                    transition: "border-color 0.15s"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#016630"}
                  onBlur={(e) => e.target.style.borderColor = "#dadce0"}
                />
              </div>
              <div>
                <Label htmlFor="su-pass" style={{ fontSize: "13px", fontWeight: 500, color: "#3c4043", display: "block", marginBottom: "6px" }}>
                  Password <span style={{ color: "#80868b", fontWeight: 400 }}>(min. 6 characters)</span>
                </Label>
                <div style={{ position: "relative" }}>
                  <Input
                    id="su-pass"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      height: "46px", borderRadius: "10px", fontSize: "14px",
                      border: "1.5px solid #dadce0", backgroundColor: "#fff",
                      color: "#202124", width: "100%",
                      paddingLeft: "14px", paddingRight: "44px",
                      transition: "border-color 0.15s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#016630"}
                    onBlur={(e) => e.target.style.borderColor = "#dadce0"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute", right: "12px", top: "50%",
                      transform: "translateY(-50%)", background: "none",
                      border: "none", cursor: "pointer", color: "#80868b", padding: "2px"
                    }}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", height: "46px", borderRadius: "10px",
                  background: loading ? "#ccc" : "#016630",
                  color: "#fff", fontWeight: 600, fontSize: "15px",
                  border: "none", cursor: loading ? "not-allowed" : "pointer",
                  marginTop: "4px", letterSpacing: "0.01em",
                  transition: "background 0.2s",
                  boxShadow: "0 2px 8px rgba(1,102,48,0.25)"
                }}
              >
                {loading ? "Creating account…" : "Create account"}
              </Button>
            </form>
          )}

          {/* ── DIVIDER ── */}
          {isConfigured && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div style={{ flex: 1, height: "1px", background: "#e8eaed" }} />
                <span style={{ fontSize: "13px", color: "#80868b", fontWeight: 500 }}>or</span>
                <div style={{ flex: 1, height: "1px", background: "#e8eaed" }} />
              </div>

              {/* Google Button — exact Google style */}
              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleLogin}
                style={{
                  width: "100%", height: "46px", borderRadius: "10px",
                  background: "#fff", border: "1.5px solid #dadce0",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: "10px", cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "14px", fontWeight: 500, color: "#3c4043",
                  transition: "background 0.15s, box-shadow 0.15s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f8f9fa")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
              >
                {/* Official Google G icon */}
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
                Continue with Google
              </button>
            </>
          )}

          {/* ── OFFLINE DEMO BYPASS ── */}
          {!isConfigured && (
            <div style={{
              marginTop: "20px", padding: "14px 16px", borderRadius: "12px",
              background: "#fff8e1", border: "1.5px solid #ffe082"
            }}>
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert style={{ width: "16px", height: "16px", color: "#f9a825", flexShrink: 0 }} />
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#e65100" }}>Offline Demo Mode</span>
              </div>
              <p style={{ fontSize: "12px", color: "#795548", lineHeight: "1.6", marginBottom: "10px" }}>
                Firebase is not configured. Click below to explore the dashboard with mock data.
              </p>
              <button
                onClick={handleBypassDemo}
                style={{
                  width: "100%", height: "38px", borderRadius: "8px",
                  background: "#f9a825", color: "#fff", fontWeight: 600,
                  fontSize: "13px", border: "none", cursor: "pointer",
                  transition: "background 0.15s"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f57f17")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#f9a825")}
              >
                Try Demo (No Login Required)
              </button>
            </div>
          )}

          {/* Bottom note */}
          <p style={{ fontSize: "12px", color: "#80868b", textAlign: "center", marginTop: "24px", lineHeight: "1.6" }}>
            By continuing, you agree to Finio's{" "}
            <span style={{ color: "#016630", cursor: "pointer", fontWeight: 500 }}>Terms</span>
            {" "}and{" "}
            <span style={{ color: "#016630", cursor: "pointer", fontWeight: 500 }}>Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  )
}
