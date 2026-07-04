import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight, AlertTriangle, Shield, CheckCircle, Clock } from 'lucide-react';
import { cn } from '../utils';

// ==========================================
// 1. DashboardCard (Base Wrapper Card)
// ==========================================
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  className,
  children,
  title,
  subtitle,
  headerAction,
  footer,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-white border border-slate-100 rounded-[20px] shadow-sm overflow-hidden flex flex-col',
        className
      )}
      {...props}
    >
      {(title || subtitle || headerAction) && (
        <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
          <div className="text-left">
            {title && <h3 className="text-base font-bold text-slate-800 font-heading">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {headerAction && <div className="flex items-center space-x-2">{headerAction}</div>}
        </div>
      )}
      <div className="p-6 flex-1 flex flex-col">{children}</div>
      {footer && <div className="px-6 py-4 border-t border-slate-50 bg-slate-50/50">{footer}</div>}
    </div>
  );
};

// ==========================================
// 2. MetricCard
// ==========================================
interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtext?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon: Icon,
  iconColor = 'text-[#0D47A1]',
  trend,
  subtext,
  className,
}) => {
  return (
    <div className={cn('bg-white border border-slate-100 rounded-[20px] shadow-sm p-6 text-left relative', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 font-heading">{label}</p>
          <h4 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-1.5 font-heading">{value}</h4>
        </div>
        {Icon && (
          <div className={cn('p-3 bg-slate-50 rounded-[12px]', iconColor)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {(trend || subtext) && (
        <div className="flex items-center space-x-2 mt-4 text-xs">
          {trend && (
            <span
              className={cn(
                'inline-flex items-center font-bold px-2 py-0.5 rounded-full',
                trend.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              )}
            >
              {trend.isPositive ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
              {trend.value}%
            </span>
          )}
          {subtext && <span className="text-slate-400">{subtext}</span>}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 3. AnalyticsCard
// ==========================================
interface AnalyticsCardProps extends CardProps {
  value?: string | number;
  badge?: React.ReactNode;
}

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  subtitle,
  headerAction,
  value,
  badge,
  children,
  className,
  ...props
}) => {
  return (
    <Card
      title={title}
      subtitle={subtitle}
      headerAction={headerAction || badge}
      className={className}
      {...props}
    >
      {value && (
        <div className="mb-4 text-left">
          <span className="text-3xl font-extrabold text-slate-800 font-heading tracking-tight">{value}</span>
        </div>
      )}
      <div className="flex-1 min-h-[220px] w-full flex items-center justify-center">
        {children}
      </div>
    </Card>
  );
};

// ==========================================
// 4. FeatureCard
// ==========================================
interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actionLabel?: string;
  onActionClick?: () => void;
  className?: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon: Icon,
  actionLabel,
  onActionClick,
  className,
}) => {
  return (
    <div className={cn('bg-white border border-slate-100 rounded-[20px] shadow-sm p-6 text-left flex flex-col', className)}>
      <div className="p-3 bg-blue-50/50 border border-blue-50 text-[#0D47A1] rounded-[16px] w-fit mb-4">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-bold text-slate-800 font-heading">{title}</h3>
      <p className="text-xs text-slate-400 leading-relaxed mt-2 flex-1">{description}</p>
      {actionLabel && onActionClick && (
        <button
          onClick={onActionClick}
          className="text-xs font-bold text-[#0D47A1] hover:text-[#0A3B85] inline-flex items-center mt-4 transition-colors focus:outline-none"
        >
          <span>{actionLabel}</span>
          <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
        </button>
      )}
    </div>
  );
};

// ==========================================
// 5. JobCard (Internships Listings)
// ==========================================
interface JobCardProps {
  title: string;
  companyName: string;
  location: string;
  stipend: string;
  applicantsCount: number;
  status: 'draft' | 'published' | 'closed';
  onActionClick?: () => void;
  actionLabel?: string;
  className?: string;
}

export const JobCard: React.FC<JobCardProps> = ({
  title,
  companyName,
  location,
  stipend,
  applicantsCount,
  status,
  onActionClick,
  actionLabel = 'Manage Post',
  className,
}) => {
  const statusStyles = {
    draft: 'bg-slate-100 text-slate-600',
    published: 'bg-emerald-50 border border-emerald-100 text-emerald-600',
    closed: 'bg-rose-50 border border-rose-100 text-rose-600',
  };

  return (
    <div className={cn('bg-white border border-slate-100 rounded-[20px] shadow-sm p-6 text-left flex flex-col', className)}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-base font-bold text-slate-800 font-heading leading-tight">{title}</h3>
          <p className="text-xs font-semibold text-[#0D47A1] mt-0.5">{companyName}</p>
        </div>
        <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full', statusStyles[status])}>
          {status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 border-y border-slate-50 py-4 my-4 text-xs text-slate-500">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Location</p>
          <p className="font-semibold text-slate-700 mt-0.5">{location}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Stipend</p>
          <p className="font-semibold text-slate-700 mt-0.5">{stipend}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto">
        <span className="text-xs text-slate-400">
          <strong className="text-slate-700 font-bold">{applicantsCount}</strong> candidates
        </span>
        {onActionClick && (
          <button
            onClick={onActionClick}
            className="text-xs font-bold text-[#0D47A1] hover:text-[#0A3B85] transition-colors focus:outline-none"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 6. CandidateCard
// ==========================================
interface CandidateCardProps {
  name: string;
  email: string;
  atsScore?: number;
  simulationScore?: number;
  interviewScore?: number;
  compositeScore?: number;
  tier?: string;
  violationsCount?: number;
  onViewDetails?: () => void;
  className?: string;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  name,
  email,
  atsScore,
  simulationScore,
  interviewScore,
  compositeScore,
  tier,
  violationsCount = 0,
  onViewDetails,
  className,
}) => {
  return (
    <div className={cn('bg-white border border-slate-100 rounded-[20px] shadow-sm p-6 text-left flex flex-col relative', className)}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-800 font-heading leading-tight">{name}</h4>
          <p className="text-xs text-slate-400 mt-0.5">{email}</p>
        </div>
        {tier && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-blue-50 text-[#0D47A1] rounded-full">
            Tier {tier}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 bg-slate-50/50 rounded-[12px] p-3 my-3 text-center">
        <div>
          <p className="text-[9px] text-slate-400 font-bold uppercase">ATS</p>
          <p className="text-sm font-extrabold text-slate-700 mt-0.5">{atsScore !== undefined ? `${atsScore}%` : 'N/A'}</p>
        </div>
        <div>
          <p className="text-[9px] text-slate-400 font-bold uppercase">Simulation</p>
          <p className="text-sm font-extrabold text-slate-700 mt-0.5">{simulationScore !== undefined ? `${simulationScore}%` : 'N/A'}</p>
        </div>
        <div>
          <p className="text-[9px] text-slate-400 font-bold uppercase">Interview</p>
          <p className="text-sm font-extrabold text-slate-700 mt-0.5">{interviewScore !== undefined ? `${interviewScore}%` : 'N/A'}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center space-x-1.5 text-xs text-slate-400">
          {violationsCount > 0 ? (
            <span className="inline-flex items-center text-amber-600 font-medium">
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              {violationsCount} flags
            </span>
          ) : (
            <span className="inline-flex items-center text-emerald-600 font-medium">
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              Verified
            </span>
          )}
        </div>
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="text-xs font-bold text-[#0D47A1] hover:text-[#0A3B85] transition-colors focus:outline-none"
          >
            Review Profile
          </button>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 7. DNA Card
// ==========================================
export const DNACard: React.FC<CardProps> = ({ children, title = 'DNA Capability Radar', subtitle = 'Scored across 9 dimensional traits', ...props }) => {
  return (
    <Card title={title} subtitle={subtitle} {...props}>
      <div className="flex-1 w-full min-h-[300px] flex items-center justify-center">
        {children}
      </div>
    </Card>
  );
};

// ==========================================
// 8. ATSCard
// ==========================================
interface ATSCardProps {
  score: number;
  verdict: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  onActionClick?: () => void;
  className?: string;
}

export const ATSCard: React.FC<ATSCardProps> = ({
  score,
  verdict,
  matchedKeywords,
  missingKeywords,
  onActionClick,
  className,
}) => {
  return (
    <div className={cn('bg-white border border-slate-100 rounded-[20px] shadow-sm p-6 text-left flex flex-col', className)}>
      <div className="flex items-center justify-between pb-4 border-b border-slate-50 mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-800 font-heading">ATS Match Score</h4>
          <p className="text-xs text-slate-400 mt-0.5">Resume vs Job Description Match</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-extrabold text-[#0D47A1] font-heading">{score}%</span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Evaluation Verdict</span>
          <p className="text-sm font-semibold text-slate-700 mt-1">{verdict}</p>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 block">Keywords Found</span>
          <div className="flex flex-wrap gap-1.5">
            {matchedKeywords.map((kw, i) => (
              <span key={i} className="text-[10px] font-semibold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">
                {kw}
              </span>
            ))}
            {matchedKeywords.length === 0 && <span className="text-xs text-slate-400 italic">No keywords matched</span>}
          </div>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 block">Core Gaps</span>
          <div className="flex flex-wrap gap-1.5">
            {missingKeywords.map((kw, i) => (
              <span key={i} className="text-[10px] font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100">
                {kw}
              </span>
            ))}
            {missingKeywords.length === 0 && <span className="text-xs text-slate-400 italic">No missing keywords detected</span>}
          </div>
        </div>
      </div>

      {onActionClick && (
        <button
          onClick={onActionClick}
          className="w-full text-center mt-6 py-2.5 rounded-[12px] bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors border border-slate-100"
        >
          View Full Resume Parsing
        </button>
      )}
    </div>
  );
};

// ==========================================
// 9. SimulationCard
// ==========================================
interface SimulationCardProps {
  score: number;
  timeSpentMinutes: number;
  aiDependency: number; // 0 to 1
  suspicionLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  completedRounds: number;
  totalRounds: number;
  onActionClick?: () => void;
  className?: string;
}

export const SimulationCard: React.FC<SimulationCardProps> = ({
  score,
  timeSpentMinutes,
  aiDependency,
  suspicionLevel,
  completedRounds,
  totalRounds,
  onActionClick,
  className,
}) => {
  const suspicionColors = {
    LOW: 'text-emerald-600 bg-emerald-50 border border-emerald-100',
    MEDIUM: 'text-amber-600 bg-amber-50 border border-amber-100',
    HIGH: 'text-red-600 bg-red-50 border border-red-100',
  };

  return (
    <div className={cn('bg-white border border-slate-100 rounded-[20px] shadow-sm p-6 text-left flex flex-col', className)}>
      <div className="flex items-center justify-between pb-4 border-b border-slate-50 mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-800 font-heading">Simulation Score</h4>
          <p className="text-xs text-slate-400 mt-0.5">AssessAI Coding Execution</p>
        </div>
        <span className="text-2xl font-extrabold text-[#0D47A1] font-heading">{score}%</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Completed Tasks</span>
          <span className="text-sm font-bold text-slate-700 inline-flex items-center mt-1">
            <CheckCircle className="h-4 w-4 text-[#10B981] mr-1.5" />
            {completedRounds} / {totalRounds}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Time Elapsed</span>
          <span className="text-sm font-bold text-slate-700 inline-flex items-center mt-1">
            <Clock className="h-4 w-4 text-[#0D47A1] mr-1.5" />
            {timeSpentMinutes} min
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">AI Copilot Ratio</span>
          <span className="text-sm font-bold text-slate-700 inline-flex items-center mt-1">
            <Shield className="h-4 w-4 text-purple-600 mr-1.5" />
            {Math.round(aiDependency * 100)}%
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Plagiarism Risk</span>
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1.5 w-fit', suspicionColors[suspicionLevel])}>
            {suspicionLevel}
          </span>
        </div>
      </div>

      {onActionClick && (
        <button
          onClick={onActionClick}
          className="w-full text-center mt-6 py-2.5 rounded-[12px] bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors border border-slate-100"
        >
          View Execution Telemetry
        </button>
      )}
    </div>
  );
};

// ==========================================
// 10. InterviewCard
// ==========================================
interface InterviewCardProps {
  score: number;
  semanticAnswerScore: number;
  clarityScore: number;
  proctoringFlags: number;
  recommendedRole: string;
  onActionClick?: () => void;
  className?: string;
}

export const InterviewCard: React.FC<InterviewCardProps> = ({
  score,
  semanticAnswerScore,
  clarityScore,
  proctoringFlags,
  recommendedRole,
  onActionClick,
  className,
}) => {
  return (
    <div className={cn('bg-white border border-slate-100 rounded-[20px] shadow-sm p-6 text-left flex flex-col', className)}>
      <div className="flex items-center justify-between pb-4 border-b border-slate-50 mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-800 font-heading">Speech Evaluation</h4>
          <p className="text-xs text-slate-400 mt-0.5">IntelliRecruit Video Interview</p>
        </div>
        <span className="text-2xl font-extrabold text-[#0D47A1] font-heading">{score}%</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Semantic Depth</span>
          <p className="text-sm font-bold text-slate-700 mt-1">{semanticAnswerScore}%</p>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Speech Clarity</span>
          <p className="text-sm font-bold text-slate-700 mt-1">{clarityScore}%</p>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Integrity Flags</span>
          <p className={cn('text-sm font-bold mt-1', proctoringFlags > 0 ? 'text-amber-600' : 'text-emerald-600')}>
            {proctoringFlags} violations
          </p>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Role Fit Placement</span>
          <p className="text-xs font-bold text-[#0D47A1] truncate mt-1">{recommendedRole}</p>
        </div>
      </div>

      {onActionClick && (
        <button
          onClick={onActionClick}
          className="w-full text-center mt-6 py-2.5 rounded-[12px] bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors border border-slate-100"
        >
          Play Answer Recording
        </button>
      )}
    </div>
  );
};
