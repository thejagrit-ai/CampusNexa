import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, CheckCircle2, XCircle, AlertTriangle, BookOpen, LayoutGrid, List } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '@/config/firebase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

type ViewMode = 'calendar' | 'week' | 'day';
type AttendanceStatus = 'present' | 'absent' | 'late' | 'not-marked';

const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthLabel = (date: Date) => date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const asDate = (value: any) => value?.toDate?.() || (value instanceof Date ? value : new Date(value));
const formatTime = (slot: string) => slot?.replace('-', ' – ') || 'Time not set';

export default function StudentAttendanceDashboard({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [courses, setCourses] = useState<Record<string, any>>({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [month, setMonth] = useState(new Date());
  const [mode, setMode] = useState<ViewMode>('calendar');

  useEffect(() => {
    const load = async () => {
      try {
        const [recordsSnap, enrollmentsSnap, timetableSnap] = await Promise.all([
          getDocs(query(collection(db, 'attendance'), where('studentId', '==', userId))),
          getDocs(query(collection(db, 'enrollments'), where('studentId', '==', userId))),
          getDocs(collection(db, 'timetable')),
        ]);
        const attendance = recordsSnap.docs.map((item) => ({ id: item.id, ...item.data() }));
        const enrollmentIds = enrollmentsSnap.docs.map((item) => item.data().courseId).filter(Boolean);
        const courseIds = [...new Set([...enrollmentIds, ...attendance.map((item: any) => item.courseId).filter(Boolean)])];
        const courseEntries = await Promise.all(courseIds.map(async (courseId) => [courseId, (await getDoc(doc(db, 'courses', courseId))).data() || {}]));
        const courseMap = Object.fromEntries(courseEntries);
        setRecords(attendance);
        setCourses(courseMap);
        setSchedules(timetableSnap.docs.map((item) => ({ id: item.id, ...item.data() })).filter((item: any) => enrollmentIds.includes(item.courseId)));
      } catch (error) {
        console.error('Failed to load student attendance dashboard:', error);
        toast.error('Failed to load attendance and timetable data');
      } finally { setLoading(false); }
    };
    if (userId) load();
  }, [userId]);

  const statusFor = (courseId: string, date: Date): AttendanceStatus => {
    const matches = records.filter((record) => record.courseId === courseId && dateKey(asDate(record.date)) === dateKey(date));
    if (!matches.length) return 'not-marked';
    return matches[matches.length - 1].status || 'not-marked';
  };
  const scheduleFor = (date: Date) => schedules.filter((item) => item.day === weekdayNames[date.getDay()] || item.weekday === weekdayNames[date.getDay()]);
  const dailyClasses = scheduleFor(selectedDate);
  const dailyRows = dailyClasses.map((slot) => ({ ...slot, status: statusFor(slot.courseId, selectedDate) }));

  const overall = useMemo(() => {
    const marked = records.filter((record) => ['present', 'late', 'absent'].includes(record.status));
    const present = records.filter((record) => record.status === 'present' || record.status === 'late').length;
    return { present, absent: records.filter((record) => record.status === 'absent').length, late: records.filter((record) => record.status === 'late').length, total: marked.length, percentage: marked.length ? Math.round((present / marked.length) * 100) : 0 };
  }, [records]);
  const subjectStats = useMemo(() => Object.entries(courses).map(([courseId, course]) => {
    const rows = records.filter((record) => record.courseId === courseId);
    const present = rows.filter((record) => record.status === 'present' || record.status === 'late').length;
    const absent = rows.filter((record) => record.status === 'absent').length;
    return { courseId, name: course.name || course.title || 'Unknown subject', code: course.code || '—', present, absent, total: rows.length, percentage: rows.length ? Math.round((present / rows.length) * 100) : 0 };
  }).filter((item) => item.total > 0 || schedules.some((slot) => slot.courseId === item.courseId)), [courses, records, schedules]);

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const calendarDays = Array.from({ length: firstDay + daysInMonth }, (_, index) => index < firstDay ? null : new Date(month.getFullYear(), month.getMonth(), index - firstDay + 1));
  const dateSummary = (date: Date) => {
    const rows = scheduleFor(date);
    const statuses = rows.map((slot) => statusFor(slot.courseId, date));
    const present = statuses.filter((status) => status === 'present' || status === 'late').length;
    const absent = statuses.filter((status) => status === 'absent').length;
    if (!rows.length) return 'empty';
    if (absent > 0 && present > 0) return 'mixed';
    if (absent > 0) return 'absent';
    if (present === rows.length) return 'good';
    return 'pending';
  };
  const selectedDayStats = dailyRows.reduce((acc, row) => { if (row.status === 'present' || row.status === 'late') acc.present++; if (row.status === 'absent') acc.absent++; return acc; }, { present: 0, absent: 0 });
  const trendData = Array.from({ length: daysInMonth }, (_, index) => { const date = new Date(month.getFullYear(), month.getMonth(), index + 1); const rows = records.filter((record) => dateKey(asDate(record.date)) === dateKey(date)); return { day: index + 1, present: rows.filter((row) => row.status === 'present' || row.status === 'late').length, absent: rows.filter((row) => row.status === 'absent').length }; }).filter((item) => item.present || item.absent);
  const weekStart = new Date(selectedDate); weekStart.setDate(selectedDate.getDate() - selectedDate.getDay() + 1);
  const weekDays = Array.from({ length: 7 }, (_, index) => { const date = new Date(weekStart); date.setDate(weekStart.getDate() + index); return date; });
  const statusTone = (status: AttendanceStatus) => status === 'present' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : status === 'absent' ? 'text-red-700 bg-red-50 border-red-200' : status === 'late' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-muted-foreground bg-muted/50 border-border';
  const statusLabel = (status: AttendanceStatus) => status === 'not-marked' ? 'Not marked' : status[0].toUpperCase() + status.slice(1);

  if (loading) return <div className="flex min-h-[420px] items-center justify-center text-muted-foreground">Loading attendance dashboard…</div>;

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-sm font-medium text-primary">ACADEMIC OVERVIEW</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Attendance</h1><p className="mt-1 text-muted-foreground">Understand your classes, attendance and upcoming schedule at a glance.</p></div><div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1"><Button size="sm" variant={mode === 'calendar' ? 'secondary' : 'ghost'} onClick={() => setMode('calendar')}><CalendarDays className="mr-2 h-4 w-4" />Calendar</Button><Button size="sm" variant={mode === 'week' ? 'secondary' : 'ghost'} onClick={() => setMode('week')}><LayoutGrid className="mr-2 h-4 w-4" />Week</Button><Button size="sm" variant={mode === 'day' ? 'secondary' : 'ghost'} onClick={() => setMode('day')}><List className="mr-2 h-4 w-4" />Day</Button></div></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><div className="card-elevated flex items-center gap-4 p-4 xl:col-span-1"><div className="relative h-16 w-16 shrink-0"><svg className="h-full w-full -rotate-90"><circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="6" fill="none" className="text-muted" /><circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="6" fill="none" strokeDasharray={2 * Math.PI * 26} strokeDashoffset={2 * Math.PI * 26 * (1 - overall.percentage / 100)} className={overall.percentage >= 75 ? 'text-emerald-500' : 'text-red-500'} strokeLinecap="round" /></svg><span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{overall.percentage}%</span></div><div><p className="text-xs text-muted-foreground">Overall attendance</p><p className="font-semibold">{overall.percentage >= 75 ? 'On track' : 'Needs attention'}</p></div></div>{[['Present', overall.present, 'text-emerald-600'], ['Absent', overall.absent, 'text-red-600'], ['Total classes', overall.total, 'text-foreground'], ['This month', trendData.reduce((sum, item) => sum + item.present + item.absent, 0), 'text-foreground']].map(([label, value, tone]) => <div key={label as string} className="card-elevated p-4"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p><p className="mt-1 text-xs text-muted-foreground">{label === 'Absent' ? 'Classes missed' : label === 'Present' ? 'Classes attended' : 'Recorded in ERP'}</p></div>)}</div>
    {(overall.percentage < 75 && overall.total > 0) && <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">Attendance needs attention</p><p className="text-sm">Your recorded attendance is below the standard 75% threshold.</p></div></div>}
    {mode !== 'day' && <section className="card-elevated p-4 sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">{mode === 'week' ? 'Weekly timetable' : monthLabel(month)}</h2><p className="text-sm text-muted-foreground">{mode === 'week' ? 'Classes and attendance across this week' : 'Select a date to view scheduled classes'}</p></div>{mode === 'calendar' && <div className="flex items-center gap-1"><Button size="sm" variant="outline" onClick={() => setMonth(new Date())}>Today</Button><Button size="icon" variant="ghost" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button></div>}</div>{mode === 'calendar' ? <><div className="mb-2 grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="py-2">{day}</div>)}</div><div className="grid grid-cols-7 gap-1 sm:gap-2">{calendarDays.map((date, index) => date ? <button key={dateKey(date)} type="button" onClick={() => setSelectedDate(date)} className={`min-h-16 rounded-lg border p-1.5 text-left transition-colors sm:min-h-20 sm:p-2 ${dateKey(date) === dateKey(selectedDate) ? 'border-primary ring-1 ring-primary' : 'border-border hover:bg-muted/50'}`}><div className="flex items-start justify-between"><span className="text-sm font-medium">{date.getDate()}</span><span className={`h-2 w-2 rounded-full ${dateSummary(date) === 'good' ? 'bg-emerald-500' : dateSummary(date) === 'absent' ? 'bg-red-500' : dateSummary(date) === 'mixed' ? 'bg-amber-500' : dateSummary(date) === 'pending' ? 'bg-slate-300' : 'bg-transparent'}`} /></div><span className="mt-2 hidden text-[10px] text-muted-foreground sm:block">{scheduleFor(date).length ? `${scheduleFor(date).length} class${scheduleFor(date).length === 1 ? '' : 'es'}` : 'No classes'}</span></button> : <div key={`empty-${index}`} className="min-h-16 sm:min-h-20" />)}</div></> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">{weekDays.map((date) => <button key={dateKey(date)} type="button" onClick={() => { setSelectedDate(date); setMode('day'); }} className="rounded-lg border border-border p-3 text-left hover:bg-muted/50"><div className="mb-3 flex items-center justify-between"><span className="text-sm font-semibold">{date.toLocaleDateString(undefined, { weekday: 'short' })}</span><span className="text-xs text-muted-foreground">{date.getDate()}</span></div><div className="space-y-2">{scheduleFor(date).length ? scheduleFor(date).map((slot) => <div key={slot.id} className={`rounded-md border p-2 text-xs ${statusTone(statusFor(slot.courseId, date))}`}><p className="font-semibold">{courseFor(slot, courses)}</p><p>{formatTime(slot.timeSlot)}</p><p>{statusLabel(statusFor(slot.courseId, date))}</p></div>) : <p className="py-4 text-center text-xs text-muted-foreground">No classes</p>}</div></button>)}</div>}</section>}
    <section className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]"><div className="card-elevated p-4 sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">{selectedDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</h2><p className="text-sm text-muted-foreground">{selectedDayStats.present} present · {selectedDayStats.absent} absent · {dailyRows.length} scheduled</p></div><Badge variant="outline">Daily attendance {dailyRows.length ? Math.round((selectedDayStats.present / dailyRows.length) * 100) : 0}%</Badge></div><div className="space-y-3">{dailyRows.length ? dailyRows.sort((a, b) => String(a.timeSlot).localeCompare(String(b.timeSlot))).map((row) => <div key={row.id} className={`flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center ${statusTone(row.status)}`}><div className="flex min-w-[130px] items-center gap-2 text-sm font-medium"><Clock3 className="h-4 w-4" />{formatTime(row.timeSlot)}</div><div className="min-w-0 flex-1"><p className="font-semibold">{courseFor(row, courses)}</p><p className="text-xs opacity-80">{row.courseCode || courses[row.courseId]?.code || '—'}{row.facultyName ? ` · ${row.facultyName}` : ''}</p>{row.room && <p className="mt-1 flex items-center gap-1 text-xs opacity-80"><MapPin className="h-3 w-3" />Room {row.room}</p>}</div><Badge variant="outline" className="w-fit border-current bg-transparent">{statusLabel(row.status)}</Badge></div>) : <div className="rounded-lg border border-dashed border-border p-10 text-center"><CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">No scheduled classes</p><p className="mt-1 text-sm text-muted-foreground">There are no timetable entries for this date.</p></div>}</div></div><div className="card-elevated p-4 sm:p-6"><div className="mb-4 flex items-center gap-2"><BookOpen className="h-5 w-5 text-muted-foreground" /><h2 className="text-lg font-semibold">Subject attendance</h2></div><div className="space-y-4">{subjectStats.length ? subjectStats.map((subject) => <div key={subject.courseId}><div className="mb-1 flex items-start justify-between gap-3"><div><p className="font-medium">{subject.name}</p><p className="text-xs text-muted-foreground">{subject.code} · {subject.present} present · {subject.absent} absent</p></div><span className={`text-sm font-semibold ${subject.percentage >= 75 ? 'text-emerald-600' : 'text-red-600'}`}>{subject.percentage}%</span></div><Progress value={subject.percentage} className="h-2" /></div>) : <p className="py-8 text-center text-sm text-muted-foreground">No attendance records yet.</p>}</div></div></section>
    <section className="grid gap-6 xl:grid-cols-2"><div className="card-elevated p-4 sm:p-6"><h2 className="mb-4 text-lg font-semibold">Monthly attendance trend</h2>{trendData.length ? <ResponsiveContainer width="100%" height={230}><LineChart data={trendData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="day" /><YAxis allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="present" stroke="#16a34a" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="absent" stroke="#dc2626" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer> : <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">Trend data will appear after classes are marked.</div>}</div><div className="card-elevated p-4 sm:p-6"><h2 className="mb-4 text-lg font-semibold">Subject comparison</h2>{subjectStats.length ? <ResponsiveContainer width="100%" height={230}><BarChart data={subjectStats}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="code" /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="percentage" fill="#2563eb" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">No subject analytics available.</div>}</div></section>
  </div>;
}

function courseFor(slot: any, courses: Record<string, any>) { return slot.courseName || courses[slot.courseId]?.name || courses[slot.courseId]?.title || slot.courseCode || 'Scheduled class'; }
