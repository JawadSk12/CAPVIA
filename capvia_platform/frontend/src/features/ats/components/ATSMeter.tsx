"use client";

/**
 * frontend/components/ats/ATSMeter.tsx
 * ───────────────────────────────────────
 * Animated circular gauge that displays the ATS score (0–100).
 *
 * Features:
 * - SVG circle with stroke-dashoffset animation
 * - Color transition: red → amber → green based on score
 * - Spring animation: score counts up from 0 on mount
 * - Percentile badge below the score
 * - Pulse animation ring for emphasis
 */

import { useEffect, useRef, useState } from "react";
import { motion, useAnimation, useMotionValue, useTransform, animate } from "framer-motion";
import { ScoreBand, ConfidenceLabel } from "@/types/ats";

interface ATSMeterProps {
    score: number;
    percentile?: number;
    scoreBand: ScoreBand;
    confidenceLabel?: ConfidenceLabel;
    detectedRole?: string;
    size?: number;
    animated?: boolean;
}

// Score → CSS color
const SCORE_COLORS: Record<ScoreBand, { primary: string; glow: string; text: string }> = {
    STRONG: {
        primary: "url(#strongGrad)",
        glow: "rgba(0, 212, 170, 0.3)",
        text: "#00d4aa",
    },
    GOOD: {
        primary: "url(#goodGrad)",
        glow: "rgba(108, 99, 255, 0.3)",
        text: "#6c63ff",
    },
    FAIR: {
        primary: "url(#fairGrad)",
        glow: "rgba(245, 158, 11, 0.3)",
        text: "#f59e0b",
    },
    WEAK: {
        primary: "url(#weakGrad)",
        glow: "rgba(255, 107, 107, 0.3)",
        text: "#ff6b6b",
    },
};

const BAND_LABELS: Record<ScoreBand, string> = {
    STRONG: "Strong Candidate",
    GOOD: "Good Candidate",
    FAIR: "Fair Candidate",
    WEAK: "Needs Improvement",
};

export default function ATSMeter({
    score,
    percentile,
    scoreBand,
    confidenceLabel = "HIGH",
    detectedRole,
    size = 200,
    animated = true,
}: ATSMeterProps) {
    const [displayScore, setDisplayScore] = useState(0);
    const safeBand = (scoreBand?.toUpperCase() as ScoreBand) || "WEAK";
    const colors = SCORE_COLORS[safeBand] || SCORE_COLORS.WEAK;

    const radius = size * 0.38;
    const circumference = 2 * Math.PI * radius;
    const cx = size / 2;
    const cy = size / 2;
    const strokeWidth = size * 0.07;

    // Animate score counter
    useEffect(() => {
        if (!animated) {
            setDisplayScore(Math.round(score));
            return;
        }
        const controls = animate(0, Math.round(score), {
            duration: 1.8,
            ease: [0.25, 0.46, 0.45, 0.94],
            onUpdate: (v) => setDisplayScore(Math.round(v)),
        });
        return controls.stop;
    }, [score, animated]);

    // Compute dash offset for the ring fill
    const targetOffset = circumference - (score / 100) * circumference;

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Detected role badge */}
            {detectedRole && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="px-3 py-1 rounded-full text-xs font-mono font-medium border"
                    style={{
                        background: "rgba(108, 99, 255, 0.08)",
                        borderColor: "rgba(108, 99, 255, 0.25)",
                        color: "#9898b8",
                    }}
                >
                    {detectedRole}
                </motion.div>
            )}

            {/* SVG Ring */}
            <div className="relative" style={{ width: size, height: size }}>
                {/* Glow background */}
                <motion.div
                    className="absolute inset-0 rounded-full"
                    animate={{
                        boxShadow: `0 0 ${size * 0.15}px ${colors.glow}`,
                    }}
                    transition={{ duration: 1, delay: 0.5 }}
                />

                <svg
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                    style={{ transform: "rotate(-90deg)" }}
                >
                    <defs>
                        {/* STRONG gradient */}
                        <linearGradient id="strongGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#00d4aa" />
                            <stop offset="100%" stopColor="#00b894" />
                        </linearGradient>
                        {/* GOOD gradient */}
                        <linearGradient id="goodGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#6c63ff" />
                            <stop offset="100%" stopColor="#00d4aa" />
                        </linearGradient>
                        {/* FAIR gradient */}
                        <linearGradient id="fairGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" />
                            <stop offset="100%" stopColor="#fbbf24" />
                        </linearGradient>
                        {/* WEAK gradient */}
                        <linearGradient id="weakGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#ff6b6b" />
                            <stop offset="100%" stopColor="#ef4444" />
                        </linearGradient>
                    </defs>

                    {/* Background track */}
                    <circle
                        cx={cx}
                        cy={cy}
                        r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth={strokeWidth}
                    />

                    {/* Animated score ring */}
                    <motion.circle
                        cx={cx}
                        cy={cy}
                        r={radius}
                        fill="none"
                        stroke={colors.primary}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: targetOffset }}
                        transition={{
                            duration: 1.8,
                            ease: [0.25, 0.46, 0.45, 0.94],
                            delay: 0.2,
                        }}
                        style={{ filter: `drop-shadow(0 0 8px ${colors.glow})` }}
                    />

                    {/* Tick marks at 25, 50, 75 */}
                    {[25, 50, 75].map((mark) => {
                        const angle = (mark / 100) * 360 - 90;
                        const rad = (angle * Math.PI) / 180;
                        const outerR = radius + strokeWidth / 2 + 4;
                        const innerR = radius - strokeWidth / 2 - 4;
                        return (
                            <line
                                key={mark}
                                x1={cx + outerR * Math.cos(rad)}
                                y1={cy + outerR * Math.sin(rad)}
                                x2={cx + innerR * Math.cos(rad)}
                                y2={cy + innerR * Math.sin(rad)}
                                stroke="rgba(255,255,255,0.15)"
                                strokeWidth={1.5}
                            />
                        );
                    })}
                </svg>

                {/* Center content */}
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center"
                    style={{ transform: "rotate(0deg)" }}
                >
                    <motion.div
                        className="font-black leading-none"
                        style={{
                            fontSize: size * 0.22,
                            color: colors.text,
                            fontFamily: "'DM Mono', monospace",
                            letterSpacing: "-0.02em",
                        }}
                    >
                        {displayScore}
                    </motion.div>
                    <div
                        className="font-mono font-medium mt-1"
                        style={{
                            fontSize: size * 0.065,
                            color: "#5a5a7a",
                            letterSpacing: "0.1em",
                        }}
                    >
                        ATS SCORE
                    </div>
                </div>
            </div>

            {/* Band label */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="text-center"
            >
                <div
                    className="font-bold text-base"
                    style={{ color: colors.text }}
                >
                    {BAND_LABELS[scoreBand]}
                </div>
                {percentile !== undefined && (
                    <div className="text-sm font-mono mt-1" style={{ color: "#9898b8" }}>
                        Beats{" "}
                        <span style={{ color: colors.text, fontWeight: 600 }}>
                            {Math.round(percentile)}%
                        </span>{" "}
                        of candidates
                    </div>
                )}
            </motion.div>

            {/* Confidence badge */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                }}
            >
                <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                        background:
                            confidenceLabel === "HIGH"
                                ? "#00d4aa"
                                : confidenceLabel === "MEDIUM"
                                    ? "#f59e0b"
                                    : "#ff6b6b",
                    }}
                />
                <span className="text-xs font-mono" style={{ color: "#5a5a7a" }}>
                    AI Confidence:{" "}
                    <span style={{ color: "#9898b8" }}>{confidenceLabel}</span>
                </span>
            </motion.div>
        </div>
    );
}