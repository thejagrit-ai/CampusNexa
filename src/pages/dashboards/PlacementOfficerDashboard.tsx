import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Building2,
  Users,
  TrendingUp,
  Calendar,
  FileText,
  UserCheck,
  ArrowUpRight,
  CheckCircle,
  Clock,
  Target,
  Award,
  Loader2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { db } from '@/config/firebase';
import { 
  collection, 
  query, 
  getDocs, 
  where, 
  orderBy, 
  limit,
  onSnapshot
} from 'firebase/firestore';
import { Link } from 'react-router-dom';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export function PlacementOfficerDashboard() {
  const [stats, setStats] = useState({
    placed: 0,
    recruiters: 0,
    jobs: 0,
    applications: 0,
    eligibleStudents: 0,
    upcomingDrives: 0,
    avgPackage: "₹12.4L",
  });
  const [upcomingDrives, setUpcomingDrives] = useState<any[]>([]);
  const [recentPlacements, setRecentPlacements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time stats
    const unsubJobs = onSnapshot(collection(db, 'jobs'), (snap) => {
      setStats(prev => ({ ...prev, jobs: snap.size }));
    });

    const unsubRecruiters = onSnapshot(collection(db, 'recruiter_companies'), (snap) => {
      setStats(prev => ({ ...prev, recruiters: snap.size }));
    });

    const unsubApps = onSnapshot(query(collection(db, 'applications'), where('status', '==', 'hired')), (snap) => {
      setStats(prev => ({ ...prev, placed: snap.size }));
    });
    const unsubAllApplications = onSnapshot(collection(db, 'applications'), (snap) => {
      setStats(prev => ({ ...prev, applications: snap.size }));
    });
    const unsubStudents = onSnapshot(query(collection(db, 'users'), where('role', '==', 'student')), (snap) => {
      setStats(prev => ({ ...prev, eligibleStudents: snap.size }));
    });

    // Recent Placements
    const unsubRecent = onSnapshot(
      query(collection(db, 'applications'), where('status', '==', 'hired'), orderBy('updatedAt', 'desc'), limit(4)),
      (snap) => {
        setRecentPlacements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );

    // Upcoming Drives
    const unsubDrives = onSnapshot(
      query(collection(db, 'placement_drives'), where('status', '==', 'upcoming'), orderBy('date', 'asc'), limit(4)),
      (snap) => {
        setUpcomingDrives(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setStats(prev => ({ ...prev, upcomingDrives: snap.size }));
        setLoading(false);
      }
    );

    return () => {
      unsubJobs();
      unsubRecruiters();
      unsubApps();
      unsubAllApplications();
      unsubStudents();
      unsubRecent();
      unsubDrives();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="w-full min-w-0 space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border/70 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Placement operations</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">Placement Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage recruiters, drives, and student placements.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button variant="gradient" asChild>
            <Link to="/placements/drives">
              <Plus className="w-4 h-4 mr-2" />
              Schedule Drive
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <motion.div variants={item} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={UserCheck}
          label="Students Placed"
          value={stats.placed.toString()}
          subtext="Total hires this year"
          trend={`${((stats.placed/1420)*100).toFixed(1)}% rate`}
          trendUp
        />
        <StatCard
          icon={Building2}
          label="Active Recruiters"
          value={stats.recruiters.toString()}
          subtext="Verified partners"
        />
        <StatCard
          icon={Briefcase}
          label="Open Positions"
          value={stats.jobs.toString()}
          subtext="Active job listings"
          iconColor="text-accent"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Package"
          value={stats.avgPackage}
          subtext="Current batch avg"
          trend="+18% YoY"
          trendUp
          iconColor="text-success"
        />
        <StatCard icon={Users} label="Eligible students" value={stats.eligibleStudents.toString()} subtext="Student accounts" iconColor="text-primary" />
        <StatCard icon={FileText} label="Applications" value={stats.applications.toString()} subtext="All tracked applications" iconColor="text-accent" />
        <StatCard icon={Calendar} label="Upcoming drives" value={stats.upcomingDrives.toString()} subtext="Scheduled placement drives" iconColor="text-success" />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.85fr)]">
        {/* Left Column */}
        <div className="space-y-5">
          {/* Upcoming Drives */}
          <motion.div variants={item} className="card-elevated p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Schedule</p><h2 className="mt-1 text-lg font-semibold text-foreground">Upcoming drives</h2></div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/placements/drives">
                  View Calendar
                  <ArrowUpRight className="w-3.5 h-3.5 ml-2" />
                </Link>
              </Button>
            </div>
            <div className="space-y-3">
              {upcomingDrives.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No upcoming drives</div>
              ) : (
                upcomingDrives.map(drive => (
                  <DriveCard
                    key={drive.id}
                    company={drive.companyName}
                    role={drive.role}
                    date={drive.date.toDate().toLocaleDateString()}
                    slots={1} // Default or actual slots
                    registered={drive.registeredCount || 0}
                    status={drive.status === 'upcoming' ? 'confirmed' : 'pending'}
                  />
                ))
              )}
            </div>
          </motion.div>

          {/* Recent Placements */}
          <motion.div variants={item} className="card-elevated p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Outcomes</p><h2 className="mt-1 text-lg font-semibold text-foreground">Recent placements</h2></div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/placements/reports">
                  View All
                  <ArrowUpRight className="w-3.5 h-3.5 ml-2" />
                </Link>
              </Button>
            </div>
            <div className="space-y-3">
              {recentPlacements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No recent placements</div>
              ) : (
                recentPlacements.map(app => (
                  <PlacementRow
                    key={app.id}
                    name={app.studentName}
                    company={app.companyName}
                    role={app.jobTitle}
                    package={"₹12L"} // Placeholder for package
                  />
                ))
              )}
            </div>
          </motion.div>

          {/* Company Pipeline */}
          <motion.div variants={item} className="card-elevated p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Partnerships</p><h2 className="mt-1 text-lg font-semibold text-foreground">Recruiter pipeline</h2></div>
              <Button variant="ghost" size="sm" asChild>
                 <Link to="/placements/recruiters">
                  Manage
                  <ArrowUpRight className="w-3.5 h-3.5 ml-2" />
                </Link>
              </Button>
            </div>
            <div className="h-[190px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Contacted', value: 12, color: '#3b82f6' },
                  { name: 'Discussion', value: 8, color: '#f59e0b' },
                  { name: 'Confirmed', value: 5, color: '#8b5cf6' },
                  { name: 'Completed', value: 42, color: '#22c55e' },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                     cursor={{ fill: 'hsl(var(--accent)/0.1)' }}
                     contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {
                      [
                        { name: 'Contacted', value: 12, color: '#3b82f6' },
                        { name: 'Discussion', value: 8, color: '#f59e0b' },
                        { name: 'Confirmed', value: 5, color: '#8b5cf6' },
                        { name: 'Completed', value: 42, color: '#22c55e' },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Placement Progress */}
          <motion.div variants={item} className="card-elevated p-5">
            <div className="mb-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cohort overview</p><h2 className="mt-1 text-lg font-semibold text-foreground">Batch progress</h2></div>
            <div className="space-y-4">
              <div className="text-center">
              <div className="flex h-[170px] w-full justify-center">
                 <ResponsiveContainer width={170} height={170}>
                   <PieChart>
                     <Pie
                       data={[
                         { name: 'Placed', value: 856, color: '#22c55e' },
                         { name: 'Remaining', value: 564, color: 'hsl(var(--secondary))' },
                       ]}
                       cx="50%"
                       cy="50%"
                         innerRadius={50}
                         outerRadius={68}
                       startAngle={90}
                       endAngle={-270}
                       dataKey="value"
                     >
                       <Cell fill="#22c55e" />
                       <Cell fill="hsl(var(--secondary))" />
                     </Pie>
                     <Tooltip />
                     <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                       <tspan x="50%" dy="-0.5em" fontSize="24" fontWeight="bold" fill="hsl(var(--foreground))">60%</tspan>
                       <tspan x="50%" dy="1.5em" fontSize="12" fill="hsl(var(--muted-foreground))">Placed</tspan>
                     </text>
                   </PieChart>
                 </ResponsiveContainer>
              </div>
                <p className="text-sm text-muted-foreground mt-2">856 / 1,420 placed</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Target</span>
                  <span className="font-medium">85% (1,207)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className="font-medium text-warning">351 students</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Top Recruiters */}
          <motion.div variants={item} className="card-elevated p-5">
            <div className="mb-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Employer activity</p><h2 className="mt-1 text-lg font-semibold text-foreground">Top recruiters</h2></div>
            <div className="space-y-3">
              <RecruiterRow company="Google" hired={24} avgPackage="₹32L" />
              <RecruiterRow company="Microsoft" hired={35} avgPackage="₹26L" />
              <RecruiterRow company="Amazon" hired={48} avgPackage="₹22L" />
              <RecruiterRow company="Goldman Sachs" hired={18} avgPackage="₹28L" />
            </div>
          </motion.div>

          {/* Package Distribution */}
          <motion.div variants={item} className="card-elevated p-5">
            <div className="mb-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Compensation</p><h2 className="mt-1 text-lg font-semibold text-foreground">Package distribution</h2></div>
            <div className="space-y-3">
              <PackageBar label="> ₹30L" count={45} total={856} color="bg-accent" />
              <PackageBar label="₹20-30L" count={180} total={856} color="bg-success" />
              <PackageBar label="₹10-20L" count={420} total={856} color="bg-primary" />
              <PackageBar label="< ₹10L" count={211} total={856} color="bg-muted-foreground" />
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={item} className="card-elevated p-5">
            <div className="mb-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workspace</p><h2 className="mt-1 text-lg font-semibold text-foreground">Quick actions</h2></div>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link to="/placements/recruiters">
                  <Building2 className="w-4 h-4 mr-2" />
                  Add Recruiter
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link to="/users">
                  <Users className="w-4 h-4 mr-2" />
                  Eligible Students
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext: string;
  trend?: string;
  trendUp?: boolean;
  iconColor?: string;
}

function StatCard({ icon: Icon, label, value, subtext, trend, trendUp, iconColor = 'text-primary' }: StatCardProps) {
  return (
    <div className="card-elevated flex min-h-[142px] h-full flex-col justify-between p-5">
      <div className="flex items-center justify-between gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={`text-xs font-medium ${trendUp ? 'text-success' : 'text-destructive'}`}>
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
      </div>
    </div>
  );
}

interface DriveCardProps {
  company: string;
  role: string;
  date: string;
  slots: number;
  registered: number;
  status: 'confirmed' | 'pending' | 'cancelled';
}

function DriveCard({ company, role, date, slots, registered, status }: DriveCardProps) {
  const statusColors = {
    confirmed: 'status-verified',
    pending: 'status-pending',
    cancelled: 'status-error',
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3 transition-colors hover:border-accent/30 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{company}</p>
          <p className="truncate text-sm text-muted-foreground">{role}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <div className="text-left sm:text-right">
          <p className="text-sm font-medium text-foreground">{date}</p>
          <p className="text-xs text-muted-foreground">{registered} registered · {slots} slots</p>
        </div>
        <span className={`status-badge ${statusColors[status]}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>
    </div>
  );
}

interface PlacementRowProps {
  name: string;
  company: string;
  role: string;
  package: string;
}

function PlacementRow({ name, company, role, package: pkg }: PlacementRowProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/10">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
          <CheckCircle className="w-4 h-4 text-success" />
        </div>
        <div>
          <p className="font-medium text-foreground text-sm">{name}</p>
          <p className="text-xs text-muted-foreground">{company} · {role}</p>
        </div>
      </div>
      <span className="font-semibold text-success">{pkg}</span>
    </div>
  );
}

interface RecruiterRowProps {
  company: string;
  hired: number;
  avgPackage: string;
}

function RecruiterRow({ company, hired, avgPackage }: RecruiterRowProps) {
  return (
    <div className="flex items-center justify-between p-2">
      <div className="flex items-center gap-2">
        <Award className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">{company}</span>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium">{hired} hired</p>
        <p className="text-xs text-muted-foreground">{avgPackage} avg</p>
      </div>
    </div>
  );
}

interface PackageBarProps {
  label: string;
  count: number;
  total: number;
  color: string;
}

function PackageBar({ label, count, total, color }: PackageBarProps) {
  const percentage = (count / total) * 100;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{count}</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export default PlacementOfficerDashboard;
