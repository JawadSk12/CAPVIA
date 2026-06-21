import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveInterviewConfig } from '../data/questions';
import { AuthService } from '../services/authService';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Internship {
  id: string;
  company: string;
  companyEmoji: string;
  gradientFrom: string;
  gradientTo: string;
  role: string;
  location: string;
  type: string;
  duration: string;
  stipend: string;
  category: string;
  postedDaysAgo: number;
  skills: string[];
  description: string;
  requirements: string[];
  perks: string[];
}

// ─── Data ──────────────────────────────────────────────────────────────────────

const INTERNSHIPS: Internship[] = [
  {
    id: 'int-001',
    company: 'Nexora Technologies',
    companyEmoji: '⚛️',
    gradientFrom: '#3B82F6',
    gradientTo: '#06B6D4',
    role: 'Frontend Intern',
    location: 'Remote',
    type: 'Internship',
    duration: '3 Months',
    stipend: '₹15,000/mo',
    category: 'Frontend',
    postedDaysAgo: 2,
    skills: ['React', 'JavaScript', 'HTML/CSS', 'REST APIs', 'Responsive Design'],
    description:
      'Join our product team to build cutting-edge web interfaces used by 500K+ users. You will collaborate directly with senior engineers and designers to ship real features in our flagship SaaS dashboard. This is a high-ownership role — your code goes to production.',
    requirements: [
      'Proficiency in React.js and modern JavaScript (ES6+)',
      'Solid understanding of HTML5, CSS3, and responsive layouts',
      'Experience consuming REST APIs from a frontend',
      'Familiarity with Git and team-based workflows',
      'Bonus: TypeScript, Tailwind CSS, or Next.js exposure',
    ],
    perks: ['PPO opportunity', 'Mentorship from senior SWEs', 'Certificate & LOR'],
  },
  {
    id: 'int-002',
    company: 'DataRoom AI',
    companyEmoji: '🤖',
    gradientFrom: '#EC4899',
    gradientTo: '#F43F5E',
    role: 'ML / AI Intern',
    location: 'Remote',
    type: 'Internship',
    duration: '4 Months',
    stipend: '₹20,000/mo',
    category: 'ML/AI',
    postedDaysAgo: 1,
    skills: ['Python', 'scikit-learn', 'Feature Engineering', 'Model Evaluation', 'NumPy'],
    description:
      'Work on real ML pipelines powering our AI-driven document intelligence product. You will clean datasets, train classification models, evaluate performance metrics, and help ship ML-powered features to production. Direct exposure to MLOps tooling.',
    requirements: [
      'Strong Python skills with NumPy and Pandas',
      'Experience training/evaluating ML models with scikit-learn',
      'Understanding of classification, regression, and feature engineering',
      'Ability to read and interpret research papers',
      'Bonus: PyTorch or TensorFlow experience',
    ],
    perks: ['Research co-authorship opportunity', 'GPU cloud credits', 'Flexible hours'],
  },
  {
    id: 'int-003',
    company: 'CloudArc Systems',
    companyEmoji: '☁️',
    gradientFrom: '#0EA5E9',
    gradientTo: '#6366F1',
    role: 'DevOps / Cloud Intern',
    location: 'Remote',
    type: 'Internship',
    duration: '3 Months',
    stipend: '₹18,000/mo',
    category: 'DevOps',
    postedDaysAgo: 3,
    skills: ['Linux', 'Docker', 'CI/CD', 'Bash Scripting', 'Cloud Basics'],
    description:
      'Help our infrastructure team build and maintain scalable deployment pipelines for 12 microservices. You will write Dockerfiles, set up GitHub Actions CI/CD, and learn cloud infrastructure hands-on in a fast-paced startup environment.',
    requirements: [
      'Comfort with Linux command line and Bash scripting',
      'Familiarity with Docker and containerization concepts',
      'Basic understanding of CI/CD pipelines',
      'Awareness of AWS, GCP, or Azure fundamentals',
      'Bonus: Kubernetes or Terraform exposure',
    ],
    perks: ['AWS Free Tier credits provided', 'Home office stipend', 'Certificate'],
  },
  {
    id: 'int-004',
    company: 'Serenova Labs',
    companyEmoji: '🛠️',
    gradientFrom: '#10B981',
    gradientTo: '#34D399',
    role: 'Backend Intern',
    location: 'Remote',
    type: 'Internship',
    duration: '3 Months',
    stipend: '₹16,000/mo',
    category: 'Backend',
    postedDaysAgo: 4,
    skills: ['Node.js', 'REST APIs', 'SQL', 'Authentication', 'Server Architecture'],
    description:
      'Build and maintain REST APIs consumed by our mobile and web clients. You will design database schemas, implement JWT-based authentication, write unit tests, and integrate third-party APIs. Our backend serves 200K+ daily active users.',
    requirements: [
      'Node.js and Express.js proficiency',
      'Solid understanding of RESTful API design',
      'Experience with SQL databases (PostgreSQL or MySQL)',
      'Knowledge of authentication patterns (JWT, OAuth basics)',
      'Bonus: Redis, WebSockets, or MongoDB experience',
    ],
    perks: ['Full-stack exposure', 'Monthly team catch-ups', 'Performance bonus'],
  },
  {
    id: 'int-005',
    company: 'VaultStack',
    companyEmoji: '🔒',
    gradientFrom: '#EF4444',
    gradientTo: '#F97316',
    role: 'Cybersecurity Intern',
    location: 'Remote',
    type: 'Internship',
    duration: '3 Months',
    stipend: '₹17,000/mo',
    category: 'Security',
    postedDaysAgo: 5,
    skills: ['Networking', 'OWASP', 'Authentication', 'Encryption', 'Vulnerability Scanning'],
    description:
      'Join our security team to perform vulnerability assessments, review code for security flaws, and help implement security best practices across all our product surfaces. You\'ll learn from certified ethical hackers and security engineers.',
    requirements: [
      'Understanding of networking protocols (TCP/IP, HTTP, DNS)',
      'Familiarity with OWASP Top 10 vulnerabilities',
      'Basic knowledge of encryption and authentication mechanisms',
      'Exposure to tools like Burp Suite, Nmap, or Wireshark',
      'Bonus: CTF competition experience',
    ],
    perks: ['CEH study materials provided', 'Bug bounty participation', 'LOR'],
  },
  {
    id: 'int-006',
    company: 'Prism UX Studio',
    companyEmoji: '🎨',
    gradientFrom: '#D946EF',
    gradientTo: '#EC4899',
    role: 'UI/UX Design Intern',
    location: 'Remote',
    type: 'Internship',
    duration: '2 Months',
    stipend: '₹12,000/mo',
    category: 'Design',
    postedDaysAgo: 6,
    skills: ['Figma', 'Wireframing', 'User Research', 'Prototyping', 'Design Systems'],
    description:
      'Create beautiful, user-centered interfaces for our B2B SaaS clients. You\'ll run user research sessions, create wireframes, build high-fidelity Figma prototypes, and collaborate with frontend developers to ensure pixel-perfect implementation.',
    requirements: [
      'Proficiency in Figma (auto-layout, components, variants)',
      'Strong understanding of UX principles and design thinking',
      'Experience with user research methods and usability testing',
      'Ability to create and maintain design systems',
      'Bonus: Motion design or Framer experience',
    ],
    perks: ['Portfolio-ready projects', 'Figma Pro license included', 'Mentorship'],
  },
  {
    id: 'int-007',
    company: 'Stackline Corp',
    companyEmoji: '🔄',
    gradientFrom: '#8B5CF6',
    gradientTo: '#6366F1',
    role: 'Full Stack Intern',
    location: 'Remote',
    type: 'Internship',
    duration: '4 Months',
    stipend: '₹22,000/mo',
    category: 'Full Stack',
    postedDaysAgo: 1,
    skills: ['React', 'Node.js', 'Databases', 'REST APIs', 'Deployment'],
    description:
      'Build complete features end-to-end: from designing the database schema to wiring up the API to building the React UI. You\'ll work across the entire stack, participate in sprint planning, and ship features that real users depend on. High growth, high ownership.',
    requirements: [
      'Solid React.js with hooks for frontend development',
      'Node.js / Express for backend API development',
      'Experience with databases (SQL or NoSQL)',
      'Understanding of full deployment workflows (Vercel, Railway, etc.)',
      'Bonus: GraphQL, Redis, or Docker',
    ],
    perks: ['PPO pathway', 'Equity discussion post-internship', 'Remote-first culture'],
  },
  {
    id: 'int-008',
    company: 'GreenByte Analytics',
    companyEmoji: '📊',
    gradientFrom: '#14B8A6',
    gradientTo: '#06B6D4',
    role: 'Data Analyst Intern',
    location: 'Remote',
    type: 'Internship',
    duration: '3 Months',
    stipend: '₹14,000/mo',
    category: 'Data',
    postedDaysAgo: 7,
    skills: ['SQL', 'Excel', 'Data Visualization', 'EDA', 'Python Basics'],
    description:
      'Dive deep into our user behavior datasets to extract actionable insights for the product and marketing teams. You\'ll write SQL queries, build dashboards in Tableau/Power BI, perform EDA in Python/Pandas, and present findings to stakeholders.',
    requirements: [
      'Strong SQL skills (joins, window functions, aggregations)',
      'Proficiency in Excel or Google Sheets for analysis',
      'Ability to create clear data visualizations and tell data stories',
      'Basic Python with Pandas for data wrangling',
      'Bonus: Tableau, Power BI, or Looker experience',
    ],
    perks: ['Direct stakeholder interaction', 'Analytics tool licenses', 'Certificate'],
  },
  {
    id: 'int-009',
    company: 'PixelBridge Mobile',
    companyEmoji: '📱',
    gradientFrom: '#22C55E',
    gradientTo: '#84CC16',
    role: 'Android Intern',
    location: 'Remote',
    type: 'Internship',
    duration: '3 Months',
    stipend: '₹15,000/mo',
    category: 'Mobile',
    postedDaysAgo: 8,
    skills: ['Kotlin', 'Android SDK', 'Activities & Fragments', 'REST APIs', 'Room DB'],
    description:
      'Develop features for our Android app with 100K+ downloads on the Play Store. You\'ll build UI with Jetpack Compose, integrate REST APIs, manage local data with Room, and ensure smooth UX through performance optimization and testing.',
    requirements: [
      'Kotlin programming proficiency',
      'Understanding of Android SDK, Activities, and Fragment lifecycle',
      'Experience integrating RESTful APIs in Android apps',
      'Familiarity with Room Database or SQLite',
      'Bonus: Jetpack Compose, Coroutines, or MVVM architecture',
    ],
    perks: ['Play Store shipping experience', 'Google developer tools', 'LOR'],
  },
  {
    id: 'int-010',
    company: 'PythonLabs',
    companyEmoji: '🐍',
    gradientFrom: '#F59E0B',
    gradientTo: '#F97316',
    role: 'Python Intern',
    location: 'Remote',
    type: 'Internship',
    duration: '2 Months',
    stipend: '₹13,000/mo',
    category: 'Python',
    postedDaysAgo: 3,
    skills: ['Python', 'Pandas', 'Data Cleaning', 'EDA', 'Visualization'],
    description:
      'Use Python to automate workflows, clean and transform datasets, and build data pipelines for our analytics infrastructure. You\'ll write production-quality Python scripts, use Pandas for data manipulation, and create meaningful visualizations.',
    requirements: [
      'Strong Python programming fundamentals',
      'Experience with Pandas for data wrangling and transformation',
      'Ability to perform exploratory data analysis',
      'Matplotlib / Seaborn for data visualization',
      'Bonus: Web scraping (BeautifulSoup/Scrapy) or automation (Selenium)',
    ],
    perks: ['Flexible schedule', 'Certification support', 'Real project experience'],
  },
  {
    id: 'int-011',
    company: 'BugZero QA',
    companyEmoji: '🧪',
    gradientFrom: '#F59E0B',
    gradientTo: '#EAB308',
    role: 'QA / Testing Intern',
    location: 'Remote',
    type: 'Internship',
    duration: '2 Months',
    stipend: '₹11,000/mo',
    category: 'QA',
    postedDaysAgo: 10,
    skills: ['Manual Testing', 'Test Cases', 'Selenium Basics', 'Bug Reporting', 'SDLC'],
    description:
      'Ensure our products ship bug-free by writing comprehensive test cases, executing regression suites, and automating test scenarios with Selenium. You\'ll work closely with the dev team in an Agile sprint cycle and gain hands-on QA experience.',
    requirements: [
      'Understanding of SDLC and software testing methodologies',
      'Ability to write clear, reproducible test cases',
      'Familiarity with Selenium WebDriver basics',
      'Experience creating bug reports in tools like Jira',
      'Bonus: API testing with Postman or RestAssured',
    ],
    perks: ['ISTQB study support', 'Exposure to full product lifecycle', 'Certificate'],
  },
  {
    id: 'int-012',
    company: 'ChainForge',
    companyEmoji: '⛓️',
    gradientFrom: '#6366F1',
    gradientTo: '#8B5CF6',
    role: 'Blockchain Intern',
    location: 'Remote',
    type: 'Internship',
    duration: '3 Months',
    stipend: '₹18,000/mo',
    category: 'Blockchain',
    postedDaysAgo: 2,
    skills: ['Solidity', 'Web3.js', 'Ethereum', 'Smart Contracts', 'Blockchain Basics'],
    description:
      'Build and deploy smart contracts on Ethereum and EVM-compatible chains for our DeFi product. You\'ll write Solidity code, test contracts with Hardhat, integrate them with a React frontend via Web3.js/ethers.js, and help audit existing contracts.',
    requirements: [
      'Understanding of blockchain fundamentals and Ethereum architecture',
      'Basic Solidity smart contract development',
      'Familiarity with Web3.js or ethers.js',
      'Experience with Hardhat or Truffle testing frameworks',
      'Bonus: DeFi/NFT protocol experience or Rust for Solana',
    ],
    perks: ['Crypto stipend option', 'Token allocation discussion', 'Global remote team'],
  },
];

const CATEGORIES = ['All', 'Frontend', 'Backend', 'Full Stack', 'ML/AI', 'DevOps', 'Data', 'Python', 'Mobile', 'Security', 'Design', 'QA', 'Blockchain'];

// ─── Sub-components ────────────────────────────────────────────────────────────

const SkillTag: React.FC<{ skill: string }> = ({ skill }) => (
  <span className="dash-skill-tag">{skill}</span>
);

const StatBadge: React.FC<{ value: string; label: string; icon: string }> = ({ value, label, icon }) => (
  <div className="dash-stat-badge">
    <span className="dash-stat-icon">{icon}</span>
    <div>
      <div className="dash-stat-value">{value}</div>
      <div className="dash-stat-label">{label}</div>
    </div>
  </div>
);

// ─── Card ──────────────────────────────────────────────────────────────────────

const InternshipCard: React.FC<{ job: Internship; onApply: (job: Internship) => void; index: number }> = ({
  job,
  onApply,
  index,
}) => {
  const [expanded, setExpanded] = useState(false);
  const daysLabel = job.postedDaysAgo === 1 ? '1 day ago' : `${job.postedDaysAgo} days ago`;

  return (
    <div
      className="dash-card"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* gradient top bar */}
      <div
        className="dash-card-bar"
        style={{ background: `linear-gradient(90deg, ${job.gradientFrom}, ${job.gradientTo})` }}
      />

      <div className="dash-card-body">
        {/* Header row */}
        <div className="dash-card-header">
          <div
            className="dash-company-avatar"
            style={{ background: `linear-gradient(135deg, ${job.gradientFrom}33, ${job.gradientTo}33)`, border: `1px solid ${job.gradientFrom}44` }}
          >
            <span className="dash-company-emoji">{job.companyEmoji}</span>
          </div>

          <div className="dash-header-info">
            <div className="dash-company-name">{job.company}</div>
            <h2 className="dash-role-title">{job.role}</h2>
          </div>

          <div className="dash-posted-badge">{daysLabel}</div>
        </div>

        {/* Meta row */}
        <div className="dash-meta-row">
          <span className="dash-meta-chip">📍 {job.location}</span>
          <span className="dash-meta-chip">⏱ {job.duration}</span>
          <span className="dash-meta-chip dash-stipend">💰 {job.stipend}</span>
          <span className="dash-meta-chip dash-type">{job.type}</span>
        </div>

        {/* Skills */}
        <div className="dash-skills-row">
          {job.skills.map(s => <SkillTag key={s} skill={s} />)}
        </div>

        {/* Description */}
        <p className="dash-description">{job.description}</p>

        {/* Requirements — expandable */}
        <div className="dash-requirements-block">
          <button
            className="dash-expand-btn"
            onClick={() => setExpanded(e => !e)}
          >
            <span>{expanded ? '▲' : '▼'}</span>
            <span>{expanded ? 'Hide Requirements' : 'View Requirements'}</span>
          </button>

          {expanded && (
            <ul className="dash-req-list">
              {job.requirements.map((r, i) => (
                <li key={i} className="dash-req-item">
                  <span className="dash-req-dot" style={{ background: job.gradientFrom }} />
                  {r}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Perks */}
        <div className="dash-perks-row">
          {job.perks.map(p => (
            <span key={p} className="dash-perk-chip">✓ {p}</span>
          ))}
        </div>

        {/* CTA */}
        <button
          className="dash-apply-btn"
          style={{ background: `linear-gradient(135deg, ${job.gradientFrom}, ${job.gradientTo})` }}
          onClick={() => onApply(job)}
          id={`apply-${job.id}`}
        >
          <span>Apply Now</span>
          <span className="dash-apply-arrow">→</span>
        </button>
      </div>
    </div>
  );
};

// ─── Main Dashboard ────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [applying, setApplying] = useState<string | null>(null);

  const session = AuthService.getSession();

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login', { replace: true });
  };

  const filtered = useMemo(() => {
    return INTERNSHIPS.filter(job => {
      const matchCat = activeCategory === 'All' || job.category === activeCategory;
      const matchSearch =
        search.trim() === '' ||
        job.role.toLowerCase().includes(search.toLowerCase()) ||
        job.company.toLowerCase().includes(search.toLowerCase()) ||
        job.skills.some(s => s.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [activeCategory, search]);

  const handleApply = (job: Internship) => {
    setApplying(job.id);
    saveInterviewConfig({ role: job.role, skills: job.skills, company: job.company });
    setTimeout(() => navigate('/intern/validation'), 400);
  };

  return (
    <div className="dash-root">
      {/* Background blobs */}
      <div className="dash-blob dash-blob-1" />
      <div className="dash-blob dash-blob-2" />
      <div className="dash-blob dash-blob-3" />

      {/* ── Nav ── */}
      <nav className="dash-nav">
        <div className="dash-nav-inner">
          <div className="dash-nav-brand">
            <div className="dash-nav-logo">
              <span>🎯</span>
            </div>
            <span className="dash-nav-name">IntelliRecruit</span>
            <span className="dash-nav-tag">AI Interview Platform</span>
          </div>
          <div className="dash-nav-right">
            <div className="dash-nav-status">
              <span className="dash-live-dot" />
              <span className="dash-live-text">Live Openings</span>
            </div>
            {session && (
              <div className="dash-nav-user">
                <span className="dash-nav-greeting">👋 {session.name}</span>
                <button className="dash-logout-btn" onClick={handleLogout} id="btn-logout">
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="dash-hero">
        <div className="dash-hero-inner">
          <div className="dash-hero-eyebrow">
            <span className="dash-eyebrow-dot" />
            <span>2024 Summer Internship Cycle · 12 Positions Open</span>
          </div>

          <h1 className="dash-hero-title">
            Find Your Perfect<br />
            <span className="dash-hero-gradient">Internship Match</span>
          </h1>

          <p className="dash-hero-subtitle">
            Browse real internship openings, explore full job descriptions, and apply directly to an AI-powered video interview — all in one place.
          </p>

          <div className="dash-stats-row">
            <StatBadge value="12" label="Open Positions" icon="💼" />
            <StatBadge value="₹11K–22K" label="Stipend Range" icon="💰" />
            <StatBadge value="20–30 min" label="Interview Duration" icon="⏱" />
            <StatBadge value="100% Remote" label="Work Mode" icon="🌐" />
          </div>
        </div>
      </header>

      {/* ── Filter Bar ── */}
      <div className="dash-filter-bar">
        <div className="dash-filter-inner">
          {/* Search */}
          <div className="dash-search-wrap">
            <span className="dash-search-icon">🔍</span>
            <input
              id="dash-search"
              type="text"
              placeholder="Search roles, companies, or skills…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="dash-search-input"
            />
            {search && (
              <button className="dash-search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          {/* Category tabs */}
          <div className="dash-cat-tabs">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`dash-cat-tab ${activeCategory === cat ? 'dash-cat-active' : ''}`}
                id={`cat-${cat.toLowerCase().replace(/\//g, '-').replace(/ /g, '-')}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Results count ── */}
      <div className="dash-results-bar">
        <div className="dash-results-inner">
          <span className="dash-results-count">
            Showing <strong>{filtered.length}</strong> internship{filtered.length !== 1 ? 's' : ''}
            {activeCategory !== 'All' && <span> in <strong>{activeCategory}</strong></span>}
            {search && <span> matching "<strong>{search}</strong>"</span>}
          </span>
        </div>
      </div>

      {/* ── Card Grid ── */}
      <main className="dash-grid-wrap">
        <div className="dash-grid">
          {filtered.length > 0 ? (
            filtered.map((job, i) => (
              <div key={job.id} className={applying === job.id ? 'dash-card-applying' : ''}>
                <InternshipCard job={job} onApply={handleApply} index={i} />
              </div>
            ))
          ) : (
            <div className="dash-empty">
              <span className="dash-empty-icon">🔭</span>
              <p className="dash-empty-title">No internships found</p>
              <p className="dash-empty-sub">Try a different category or search term</p>
              <button className="dash-empty-reset" onClick={() => { setActiveCategory('All'); setSearch(''); }}>
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="dash-footer">
        <p>🔒 AI-proctored · Secure · Fair · Built by IntelliRecruit</p>
      </footer>
    </div>
  );
};

export default Dashboard;
