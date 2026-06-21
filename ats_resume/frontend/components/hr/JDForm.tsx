"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Plus, 
  X, 
  Briefcase, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Rocket, 
  Cpu, 
  Save,
  Loader2,
  Trash2
} from "lucide-react";
import { internshipApi } from "@/lib/api";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const jdSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  company: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  is_remote: z.boolean().default(false),
  experience_level: z.enum(["ENTRY", "JUNIOR", "MID", "SENIOR"]),
  short_description: z.string().max(500, "Max 500 characters").optional(),
  application_deadline: z.string().optional(),
  responsibilities: z.array(z.string()).min(1, "Add at least one responsibility"),
  required_skills: z.array(z.string()).min(1, "Add at least one required skill"),
  preferred_skills: z.array(z.string()).optional(),
  tools_and_technologies: z.array(z.string()).optional(),
  expected_projects: z.array(z.string()).optional(),
  full_jd_text: z.string().optional(),
});

type JDFormValues = z.infer<typeof jdSchema>;

interface JDFormProps {
  initialData?: any;
  id?: string;
}

export default function JDForm({ initialData, id }: JDFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
  } = useForm<JDFormValues>({
    resolver: zodResolver(jdSchema),
    defaultValues: {
      title: "",
      company: "CAPVIA",
      is_remote: false,
      responsibilities: [""],
      required_skills: [""],
      preferred_skills: [],
      tools_and_technologies: [],
      expected_projects: [],
      ...initialData,
      experience_level: (initialData?.experience_level?.toUpperCase() as any) || "ENTRY",
    },
  });

  const { fields: respFields, append: appendResp, remove: removeResp } = useFieldArray({
    control,
    name: "responsibilities",
  } as any);

  const { fields: reqFields, append: appendReq, remove: removeReq } = useFieldArray({
    control,
    name: "required_skills",
  } as any);

  const { fields: prefFields, append: appendPref, remove: removePref } = useFieldArray({
    control,
    name: "preferred_skills",
  } as any);

  const onSubmit = async (data: JDFormValues) => {
    setLoading(true);
    try {
      if (id && id !== "new") {
        await internshipApi.update(id, data);
        toast.success("Internship updated successfully!");
      } else {
        const result = await internshipApi.create(data);
        toast.success("Internship posted successfully!");
        router.push(`/hr/internship/${result.id}`);
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const message = Array.isArray(detail) 
        ? detail[0]?.msg 
        : (typeof detail === "string" ? detail : "Something went wrong");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl mx-auto pb-20">
      {/* ─── Header Section ─── */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            {id && id !== "new" ? "Edit Internship" : "Post New Internship"}
          </h1>
          <p className="text-slate-500 mt-1">Fill in the details to attract the best talent.</p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary gap-2 min-w-[140px]"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {id && id !== "new" ? "Save Changes" : "Post JD"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ─── Main Content ─── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="card p-6 space-y-4 animate-slide-up delay-100">
            <div className="flex items-center gap-2 text-indigo-600 font-semibold mb-2">
              <Briefcase size={20} />
              <span>Basic Information</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="label">Job Title *</label>
                <input
                  {...register("title")}
                  className={`input ${errors.title ? "input-error" : ""}`}
                  placeholder="e.g. Fullstack Developer Intern"
                />
                {errors.title && <p className="text-rose-500 text-xs mt-1">{errors.title.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Company</label>
                  <input {...register("company")} className="input" />
                </div>
                <div>
                  <label className="label">Department</label>
                  <input {...register("department")} className="input" placeholder="e.g. Engineering" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input {...register("location")} className="input pl-10" placeholder="e.g. Bangalore, IN" />
                  </div>
                </div>
                <div className="flex flex-col justify-center">
                  <label className="label">Work Mode</label>
                  <div className="flex items-center gap-4 h-[45px]">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" {...register("is_remote")} className="w-4 h-4 rounded text-indigo-600" />
                      <span className="text-sm text-slate-600">Remote Friendly</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Responsibilities */}
          <div className="card p-6 animate-slide-up delay-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                <CheckCircle2 size={20} />
                <span>Responsibilities *</span>
              </div>
              <button
                type="button"
                onClick={() => appendResp("")}
                className="btn-ghost btn-sm text-emerald-600 hover:bg-emerald-50"
              >
                <Plus size={14} /> Add
              </button>
            </div>
            
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {respFields.map((field, index) => (
                  <motion.div
                    key={field.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-2"
                  >
                    <input
                      {...register(`responsibilities.${index}` as const)}
                      className="input"
                      placeholder={`Responsibility #${index + 1}`}
                    />
                    {respFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeResp(index)}
                        className="p-2 text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {errors.responsibilities && <p className="text-rose-500 text-xs mt-1">{errors.responsibilities.message}</p>}
            </div>
          </div>

          {/* Full JD Text */}
          <div className="card p-6 animate-slide-up delay-300">
            <label className="label">Detailed Job Description (Optional)</label>
            <textarea
              {...register("full_jd_text")}
              className="input min-h-[200px] font-sans leading-relaxed py-3"
              placeholder="Paste the full job description text here for better AI analysis..."
            />
          </div>
        </div>

        {/* ─── Sidebar ─── */}
        <div className="space-y-6">
          {/* Metadata & Requirements */}
          <div className="card p-6 space-y-5 animate-slide-in delay-100">
            <div>
              <label className="label flex items-center gap-2">
                <Calendar size={16} /> Application Deadline
              </label>
              <input type="date" {...register("application_deadline")} className="input" />
            </div>

            <div>
              <label className="label">Experience Level</label>
              <select {...register("experience_level")} className="input appearance-none">
                <option value="ENTRY">Entry Level (0-1 yrs)</option>
                <option value="JUNIOR">Junior (1-2 yrs)</option>
                <option value="MID">Mid Level (2-4 yrs)</option>
                <option value="SENIOR">Senior (4+ yrs)</option>
              </select>
            </div>
          </div>

          {/* Required Skills */}
          <div className="card p-6 animate-slide-in delay-200">
            <div className="flex items-center justify-between mb-4">
              <label className="label flex items-center gap-2 mb-0">
                <Rocket size={16} className="text-indigo-500" /> Required Skills *
              </label>
              <button
                type="button"
                onClick={() => appendReq("")}
                className="text-indigo-600 hover:text-indigo-700"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="space-y-2">
              {reqFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <input
                    {...register(`required_skills.${index}` as const)}
                    className="input text-xs h-[36px]"
                    placeholder="e.g. React"
                  />
                  {reqFields.length > 1 && (
                    <button type="button" onClick={() => removeReq(index)} className="text-slate-400">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Technologies & Tools */}
          <div className="card p-6 animate-slide-in delay-300">
            <div className="flex items-center justify-between mb-4">
              <label className="label flex items-center gap-2 mb-0">
                <Cpu size={16} className="text-slate-500" /> Tools & Tech
              </label>
              <button
                type="button"
                onClick={() => {
                  const current = watch("tools_and_technologies") || [];
                  // We don't have useFieldArray for these optional ones to keep UI clean, 
                  // but we can manually handle them.
                }}
                className="text-slate-400"
              >
                {/* Simplified for now */}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 italic">Separate items with commas or enter below.</p>
            <textarea
              className="input mt-2 text-xs h-[100px]"
              placeholder="Git, Docker, Figma, AWS..."
              {...register("tools_and_technologies", {
                setValueAs: (v) => Array.isArray(v) ? v : v.split(",").map((s: string) => s.trim()).filter(Boolean)
              })}
            />
          </div>
        </div>
      </div>
    </form>
  );
}
