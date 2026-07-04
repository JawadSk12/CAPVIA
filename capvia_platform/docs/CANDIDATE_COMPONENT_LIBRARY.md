# CAPVIA Candidate Component Library

This document lists the reusable component system created and updated for the Candidate Dashboard.

## 1. Containers & Cards

### Card (features/interview/components/UI/Card.tsx)
A premium container supporting elevation shadows and clean borders.
```tsx
export const Card: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-slate-100 p-8 shadow-sm ${className}`}>
    {children}
  </div>
);
```

## 2. Interactive Elements

### Button (features/interview/components/UI/Button.tsx)
The primary action button supporting loader spinners and state variants.
```tsx
export const Button: React.FC<ButtonProps> = ({ variant = 'primary', loading, children, ...props }) => {
  // Styles:
  // - Primary: bg-[#0D47A1] hover:bg-[#0b3c8a] text-white
  // - Secondary: bg-white hover:bg-slate-50 border-slate-200 text-slate-700
  // - Danger: bg-rose-600 hover:bg-rose-700 text-white
};
```

## 3. Dynamic Telemetry Components

### MicBars (DeviceValidation.tsx)
Displays real-time voice signal level using animated vertical bars.
- Inactive: Slate grey (`bg-slate-200`)
- Active: Violet (`bg-indigo-500`)
- Peak Warning: Crimson (`bg-rose-500`)

### SoundWaves (DeviceValidation.tsx)
Plays a pleasant audio chime animation using multiple concentric ping layers (`animate-ping`).

### ScoreBar (Results.tsx)
Displays quantitative progress or match accuracy metrics.
- High Range (>= 75%): Emerald Green (`bg-emerald-500`)
- Medium Range (>= 50%): Amber Gold (`bg-amber-550`)
- Low Range (< 50%): Rose Red (`bg-rose-500`)
