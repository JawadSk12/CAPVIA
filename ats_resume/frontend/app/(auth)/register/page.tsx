"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Briefcase, Eye, EyeOff, GraduationCap, Lock, Mail, User, Zap } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import clsx from "clsx";

const schema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email:     z.string().email("Enter a valid email address"),
  password:  z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/[0-9]/, "Must include a number"),
  confirm:   z.string(),
  role:      z.enum(["STUDENT", "HR"]),
}).refine((d) => d.password === d.confirm, {
  message: "Passwords do not match",
  path: ["confirm"],
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: "STUDENT" },
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: FormValues) => {
    try {
      const user = await registerUser({
        full_name: data.full_name,
        email:     data.email,
        password:  data.password,
        role:      data.role,
      });
      toast.success("Account created! Welcome to CAPVIA.");
      const userRole = user.role?.toUpperCase();
      if (userRole === "HR") router.push("/hr/dashboard");
      else router.push("/student/dashboard");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail[0]?.msg
        : typeof detail === "string"
        ? detail
        : "Registration failed. Try again.";
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 hero-gradient flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/2 translate-y-1/2" />

        <div className="relative z-10 max-w-md text-white text-center space-y-6">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto backdrop-blur-sm">
            <Zap size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold leading-tight">
            Join Thousands of<br />Top Candidates
          </h1>
          <p className="text-lg text-white/80">
            Create your free account and start analyzing your resume in minutes.
          </p>

          <div className="space-y-3 text-left bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            {[
              { icon: "🎯", title: "ATS Score", desc: "Know exactly how ATS systems see your resume" },
              { icon: "🧠", title: "AI Insights", desc: "Get personalized skill gap analysis and rewrites" },
              { icon: "💼", title: "Internships", desc: "Match your profile to the best opportunities" },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <span className="text-2xl">{f.icon}</span>
                <div>
                  <p className="font-semibold text-sm">{f.title}</p>
                  <p className="text-xs text-white/70">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md animate-slide-up py-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-bold text-xl text-slate-800">
              CAP<span className="text-indigo-600">VIA</span>
            </span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800">Create your account</h2>
            <p className="text-slate-500 mt-1">Free forever — no credit card required</p>
          </div>

          {/* Role selector */}
          <div className="mb-6">
            <p className="label">I am a…</p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: "STUDENT", label: "Student / Candidate", icon: GraduationCap, desc: "Upload & analyze resumes" },
                { value: "HR",      label: "HR Manager",           icon: Briefcase,     desc: "Review & rank candidates" },
              ] as const).map(({ value, label, icon: Icon, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue("role", value)}
                  className={clsx(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all duration-150",
                    selectedRole === value
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  <Icon size={22} />
                  <div>
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full name */}
            <div>
              <label htmlFor="full_name" className="label">Full name</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="full_name"
                  type="text"
                  placeholder="Huzaifa Ansari"
                  className={`input pl-10 ${errors.full_name ? "input-error" : ""}`}
                  {...register("full_name")}
                />
              </div>
              {errors.full_name && <p className="mt-1 text-xs text-rose-500">{errors.full_name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="label">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="reg-email"
                  type="email"
                  placeholder="you@example.com"
                  className={`input pl-10 ${errors.email ? "input-error" : ""}`}
                  {...register("email")}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  className={`input pl-10 pr-10 ${errors.password ? "input-error" : ""}`}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password.message}</p>}
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="confirm" className="label">Confirm password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="confirm"
                  type="password"
                  placeholder="Repeat your password"
                  className={`input pl-10 ${errors.confirm ? "input-error" : ""}`}
                  {...register("confirm")}
                />
              </div>
              {errors.confirm && <p className="mt-1 text-xs text-rose-500">{errors.confirm.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full btn-lg mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-600 font-semibold hover:text-indigo-700">
              Sign in
            </Link>
          </p>
          <p className="mt-3 text-center text-xs text-slate-400">
            By creating an account, you agree to our{" "}
            <a href="/terms" className="underline">Terms</a> and{" "}
            <a href="/privacy" className="underline">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
