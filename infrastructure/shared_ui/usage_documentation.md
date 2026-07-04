# CAPVIA Component Library - Usage Documentation

This document explains how to set up the Tailwind CSS config to load the design tokens and provides code usage snippets for the shared components library.

---

## 1. Tailwind Config Integration

To ensure the classes resolve properly across all modules, update each project's `tailwind.config.ts` (or `tailwind.config.js`) to extend the design tokens:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    // Include the shared infrastructure folder so tailwind parses its styles:
    "/Volumes/KINGSTON/CAPVIA/infrastructure/shared_ui/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0D47A1',
          hover: '#0A3B85',
          light: '#E3F2FD',
        },
        secondary: {
          DEFAULT: '#42A5F5',
          hover: '#1E88E5',
          light: '#E1F5FE',
        },
        accent: {
          DEFAULT: '#FFC107',
          hover: '#FFB300',
        },
        success: {
          DEFAULT: '#10B981',
          hover: '#059669',
        },
        warning: {
          DEFAULT: '#F59E0B',
          hover: '#D97706',
        },
        danger: {
          DEFAULT: '#EF4444',
          hover: '#DC2626',
        },
        background: '#FFFFFF',
        surface: '#F8FAFC',
      },
      fontFamily: {
        heading: ['Outfit', 'Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        card: '20px',
        button: '16px',
        input: '16px',
        dialog: '24px',
      },
      boxShadow: {
        soft: '0 4px 10px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
        professional: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 16px -6px rgba(0, 0, 0, 0.03)',
        minimal: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
      }
    },
  },
  plugins: [],
};
export default config;
```

---

## 2. Component Code Snippets

Import components directly from the shared entry point:
```typescript
import { Button, Input, Card, Table, Dialog } from '../../../infrastructure/shared_ui';
```

### 1. Buttons
```tsx
import { Button } from '@shared_ui';

function Example() {
  return (
    <div className="flex space-x-2">
      <Button variant="primary" onClick={() => console.log('Primary')}>Primary Button</Button>
      <Button variant="secondary" isLoading>Loading State</Button>
      <Button variant="outline" disabled>Disabled State</Button>
    </div>
  );
}
```

### 2. Inputs, Select, OTP & File Upload
```tsx
import { Input, PasswordInput, SearchInput, Select, OTPInput, FileUpload } from '@shared_ui';

function FormExample() {
  const [otp, setOtp] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);

  return (
    <div className="space-y-4">
      <Input label="Full Name" placeholder="John Doe" />
      <PasswordInput label="Password" placeholder="••••••••" />
      <Select label="Role Selection">
        <option value="student">Student</option>
        <option value="hr">HR Manager</option>
      </Select>
      <OTPInput label="Activation Code" length={6} value={otp} onChange={setOtp} />
      <FileUpload label="Resume PDF" onFileSelect={setFile} selectedFileName={file?.name} />
    </div>
  );
}
```

### 3. Cards
```tsx
import { MetricCard, CandidateCard, JobCard } from '@shared_ui';
import { Users } from 'lucide-react';

function DashboardGrid() {
  return (
    <div className="grid grid-cols-3 gap-6">
      <MetricCard
        label="Total Candidates"
        value={242}
        icon={Users}
        trend={{ value: 12.5, isPositive: true }}
      />
      <JobCard
        title="Software Engineer Intern"
        companyName="CAPVIA Corp"
        location="Remote"
        stipend="$2,000/mo"
        applicantsCount={14}
        status="published"
        onActionClick={() => console.log('Manage')}
      />
      <CandidateCard
        name="Alex Smith"
        email="alex@example.com"
        atsScore={82}
        simulationScore={91}
        interviewScore={76}
        tier="A"
        violationsCount={0}
        onViewDetails={() => console.log('Details')}
      />
    </div>
  );
}
```

### 4. Enterprise Tables
```tsx
import { Table, Column } from '@shared_ui';

interface User {
  id: string;
  name: string;
  role: string;
  status: string;
}

const columns: Column<User>[] = [
  { key: 'name', header: 'Full Name', isSortable: true },
  { key: 'role', header: 'System Role', isSortable: true },
  { key: 'status', header: 'Account Status', render: (row) => (
    <span className={row.status === 'active' ? 'text-emerald-500 font-bold' : 'text-slate-400'}>
      {row.status}
    </span>
  )}
];

const mockData = [
  { id: '1', name: 'Alice', role: 'Student', status: 'active' },
  { id: '2', name: 'Bob', role: 'HR', status: 'inactive' }
];

function UsersTable() {
  return (
    <Table
      data={mockData}
      columns={columns}
      searchableKey="name"
      searchPlaceholder="Search candidates..."
    />
  );
}
```

### 5. Dialogs (Modals)
```tsx
import { Dialog, Button } from '@shared_ui';

function ModalDemo() {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>Open Dialog</Button>
      <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} title="Confirm Action">
        <p className="text-sm text-slate-600">Are you sure you want to proceed with this candidate selection?</p>
        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => setIsOpen(false)}>Confirm</Button>
        </div>
      </Dialog>
    </div>
  );
}
```
