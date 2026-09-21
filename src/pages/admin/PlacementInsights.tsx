import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Users,
  Building2,
  DollarSign,
  Calendar,
  Download,
  Loader2,
  Award,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BackToCareer } from '@/components/placement/BackToCareer';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts';

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

const COLORS = ['hsl(var(--primary))', '#64748b', '#94a3b8', '#cbd5e1', '#475569', '#e2e8f0'];

export default function PlacementInsights() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('all');
  
  const [stats, setStats] = useState({
    placementRate: 0,
    avgPackage: '—',
    totalCompanies: 0,
    totalOffers: 0,
    totalStudents: 0,
    hiredStudents: 0,
  });

  const [yearlyTrend, setYearlyTrend] = useState<{
    status: string;
    count: number;
  }[]>([]);

  const [industryData, setIndustryData] = useState<{
    name: string;
    count: number;
  }[]>([]);

  const [topPackages, setTopPackages] = useState<{
    company: string;
    package: string;
    student: string;
    department: string;
  }[]>([]);

  useEffect(() => {
    let cancelled = false;
    const loadInsights = async () => {
      setLoading(true);
      try {
        const [usersSnap, applicationsSnap, jobsSnap, companiesSnap] = await Promise.all([
          getDocs(collection(db, 'users')), getDocs(collection(db, 'applications')),
          getDocs(collection(db, 'jobs')), getDocs(collection(db, 'recruiter_companies')),
        ]);
        const orgId = user?.organizationId;
        const scoped = (data: any) => !orgId || !data.organizationId || data.organizationId === orgId;
        const users = usersSnap.docs.map(d => d.data()).filter(scoped);
        const applications = applicationsSnap.docs.map(d => d.data()).filter(scoped);
        const jobs = jobsSnap.docs.map(d => d.data()).filter(scoped);
        const companies = companiesSnap.docs.map(d => d.data()).filter(scoped);
        const students = users.filter(u => u.role === 'student');
        const hired = applications.filter(a => a.status === 'hired');
        const offers = applications.filter(a => ['offered', 'hired'].includes(a.status));
        const companyNames = new Set([...companies.map(c => c.name), ...jobs.map(j => j.companyName), ...applications.map(a => a.companyName)].filter(Boolean));
        const packageValues = hired.map(a => a.compensation?.baseSalary || a.salary || a.package || '').map((v: string) => Number(String(v).replace(/[^0-9.]/g, ''))).filter((v: number) => Number.isFinite(v) && v > 0);
        const avg = packageValues.length ? packageValues.reduce((sum, v) => sum + v, 0) / packageValues.length : 0;
        const industries = new Map<string, number>();
        companies.forEach(c => { if (c.industry) industries.set(c.industry, (industries.get(c.industry) || 0) + 1); });
        if (!cancelled) {
          setStats({ placementRate: students.length ? Math.round((new Set(hired.map(a => a.studentId || a.studentEmail)).size / students.length) * 100) : 0, avgPackage: avg ? `${avg.toFixed(1)} LPA` : '—', totalCompanies: companyNames.size, totalOffers: offers.length, totalStudents: students.length, hiredStudents: new Set(hired.map(a => a.studentId || a.studentEmail)).size });
          setYearlyTrend(['pending', 'shortlisted', 'interviewed', 'offered', 'hired', 'rejected'].map(status => ({ status, count: applications.filter(a => a.status === status).length })));
          setIndustryData(Array.from(industries, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6));
          setTopPackages(hired.map(a => ({ company: a.companyName || 'Unknown company', package: a.compensation?.baseSalary || a.salary || a.package || 'Not specified', student: a.studentName || a.studentEmail || 'Unknown student', department: a.department || 'Department not specified' })).slice(0, 5));
        }
      } catch (error) { console.error('Failed to load placement insights', error); if (!cancelled) toast.error('Could not load live placement data'); }
      finally { if (!cancelled) setLoading(false); }
    };
    loadInsights();
    return () => { cancelled = true; };
  }, [selectedYear, user?.organizationId]);

  const exportReport = () => {
    toast.success('Generating executive report...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={item} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <BackToCareer />
          <h1 className="text-3xl font-bold text-foreground">Placement Insights</h1>
          <p className="text-muted-foreground mt-1">
            Executive overview of placement performance
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent><SelectItem value="all">All live records</SelectItem></SelectContent>
          </Select>
          <Button onClick={exportReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <motion.div variants={item} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Placement Rate</p>
                <p className="text-3xl font-bold text-green-500">{stats.placementRate}%</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stats.hiredStudents} hired students / {stats.totalStudents} students</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Package</p>
                <p className="text-3xl font-bold text-blue-500">{stats.avgPackage}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Calculated from recorded offers</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Companies</p>
                <p className="text-3xl font-bold text-purple-500">{stats.totalCompanies}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Distinct companies in live records</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Offers</p>
                <p className="text-3xl font-bold text-orange-500">{stats.totalOffers}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Offered and hired applications</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Award className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={item} className="grid gap-6 lg:grid-cols-2">
        {/* Year-over-Year Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Application pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="status" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Applications" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Industry Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-primary" />
              Industry Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={industryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="count"
                    nameKey="name"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {industryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Top Packages */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Top Packages This Year
            </CardTitle>
            <CardDescription>Highest recorded offers from live placement data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPackages.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No offer records are available yet.</p>}
              {topPackages.map((pkg, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm",
                    index === 0 ? "bg-yellow-500" :
                    index === 1 ? "bg-gray-400" :
                    index === 2 ? "bg-amber-700" : "bg-muted text-muted-foreground"
                  )}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{pkg.student}</p>
                        <p className="text-sm text-muted-foreground">{pkg.company} • {pkg.department}</p>
                      </div>
                      <Badge variant="secondary" className="text-lg font-bold">
                        {pkg.package}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
