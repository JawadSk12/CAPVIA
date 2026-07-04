import React, { useState, useRef, forwardRef } from 'react';
import { Eye, EyeOff, Search, Upload, ChevronDown, Check } from 'lucide-react';
import { cn } from '../utils';

// ==========================================
// 1. Unified Input (Text)
// ==========================================
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col space-y-1.5 text-left">
        {label && (
          <label htmlFor={id} className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-4 text-slate-400 pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            id={id}
            className={cn(
              'w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-[#0D47A1] focus:ring-2 focus:ring-[#0D47A1]/10 rounded-[16px] px-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200',
              leftIcon && 'pl-11',
              rightIcon && 'pr-11',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/10',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-4 text-slate-400 pointer-events-none flex items-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
        {!error && helperText && <span className="text-xs text-slate-400">{helperText}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';

// ==========================================
// 2. Search Input
// ==========================================
export const SearchInput = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  return (
    <Input
      ref={ref}
      leftIcon={<Search className="h-4.5 w-4.5" />}
      placeholder="Search..."
      {...props}
    />
  );
});
SearchInput.displayName = 'SearchInput';

// ==========================================
// 3. Password Input
// ==========================================
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, 'rightIcon'>>((props, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Input
      ref={ref}
      type={showPassword ? 'text' : 'password'}
      rightIcon={
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
        >
          {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
        </button>
      }
      {...props}
    />
  );
});
PasswordInput.displayName = 'PasswordInput';

// ==========================================
// 4. Textarea
// ==========================================
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col space-y-1.5 text-left">
        {label && (
          <label htmlFor={id} className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            'w-full min-h-[120px] bg-white border border-slate-200 hover:border-slate-300 focus:border-[#0D47A1] focus:ring-2 focus:ring-[#0D47A1]/10 rounded-[16px] px-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 resize-y',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/10',
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
        {!error && helperText && <span className="text-xs text-slate-400">{helperText}</span>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

// ==========================================
// 5. Select
// ==========================================
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, children, id, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col space-y-1.5 text-left">
        {label && (
          <label htmlFor={id} className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={id}
            className={cn(
              'w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-[#0D47A1] focus:ring-2 focus:ring-[#0D47A1]/10 rounded-[16px] px-4 py-3.5 text-sm text-slate-800 outline-none appearance-none transition-all duration-200',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/10',
              className
            )}
            {...props}
          >
            {children}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <ChevronDown className="h-4.5 w-4.5" />
          </div>
        </div>
        {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
        {!error && helperText && <span className="text-xs text-slate-400">{helperText}</span>}
      </div>
    );
  }
);
Select.displayName = 'Select';

// ==========================================
// 6. Custom Dropdown Menu
// ==========================================
export interface DropdownOption {
  value: string;
  label: string;
}

export interface DropdownProps {
  label?: string;
  options: DropdownOption[];
  selectedValue: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  options,
  selectedValue,
  onChange,
  placeholder = 'Select Option',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const activeOption = options.find((opt) => opt.value === selectedValue);

  return (
    <div className={cn('w-full flex flex-col space-y-1.5 text-left relative', className)} ref={containerRef}>
      {label && (
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white border border-slate-200 hover:border-slate-300 focus:border-[#0D47A1] rounded-[16px] px-4 py-3.5 text-sm text-slate-800 shadow-sm outline-none transition-all duration-200"
      >
        <span>{activeOption ? activeOption.label : placeholder}</span>
        <ChevronDown className={cn('h-4.5 w-4.5 text-slate-400 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+6px)] left-0 w-full bg-white border border-slate-100 rounded-[16px] shadow-lg py-1.5 z-50 max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left transition-colors"
            >
              <span>{option.label}</span>
              {selectedValue === option.value && <Check className="h-4 w-4 text-[#0D47A1]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 7. OTP Input Component
// ==========================================
interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (otp: string) => void;
  label?: string;
  error?: string;
}

export const OTPInput: React.FC<OTPInputProps> = ({ length = 6, value, onChange, label, error }) => {
  const inputsRef = useRef<HTMLInputElement[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    if (isNaN(Number(val))) return;

    const otpArray = value.split('');
    otpArray[index] = val.substring(val.length - 1);
    const newOtp = otpArray.join('');
    onChange(newOtp);

    // Forward Focus
    if (val && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').slice(0, length);
    if (isNaN(Number(pastedText))) return;
    onChange(pastedText);
    inputsRef.current[Math.min(pastedText.length, length - 1)]?.focus();
  };

  return (
    <div className="flex flex-col space-y-2 text-left">
      {label && (
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
          {label}
        </span>
      )}
      <div className="flex items-center space-x-2">
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            type="text"
            maxLength={1}
            value={value[i] || ''}
            onChange={(e) => handleInputChange(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onPaste={handlePaste}
            ref={(el) => {
              if (el) inputsRef.current[i] = el;
            }}
            className={cn(
              'w-12 h-14 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#0D47A1] focus:ring-2 focus:ring-[#0D47A1]/10 rounded-[16px] text-center text-lg font-bold text-slate-800 outline-none transition-all duration-150',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
            )}
          />
        ))}
      </div>
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  );
};

// ==========================================
// 8. Drag and Drop File Upload
// ==========================================
interface FileUploadProps {
  label?: string;
  accept?: string;
  maxSizeMB?: number;
  onFileSelect: (file: File | null) => void;
  selectedFileName?: string;
  error?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  accept = '.pdf,.doc,.docx',
  maxSizeMB = 5,
  onFileSelect,
  selectedFileName,
  error,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const processFile = (file: File) => {
    setLocalError(null);

    // Size limit verification
    if (file.size > maxSizeMB * 1024 * 1024) {
      setLocalError(`File exceeds maximum size of ${maxSizeMB}MB.`);
      onFileSelect(null);
      return;
    }

    onFileSelect(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full flex flex-col space-y-1.5 text-left">
      {label && (
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
          {label}
        </span>
      )}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed border-slate-200 hover:border-[#0D47A1] bg-slate-50 hover:bg-slate-50/50 rounded-[20px] p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 min-h-[160px]',
          isDragActive && 'border-[#0D47A1] bg-[#42A5F5]/5',
          (error || localError) && 'border-red-500 hover:border-red-500 bg-red-50/20'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
        <div className="p-3 bg-white shadow-sm rounded-full mb-3 text-slate-500">
          <Upload className="h-5 w-5" />
        </div>
        <p className="text-sm font-semibold text-slate-700">
          {selectedFileName ? selectedFileName : 'Drag & drop file here or click to browse'}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Supports PDF, DOC, DOCX up to {maxSizeMB}MB
        </p>
      </div>
      {(error || localError) && (
        <span className="text-xs text-red-500 font-medium">{error || localError}</span>
      )}
    </div>
  );
};
