import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  BookOpen,
  DollarSign,
  Settings,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Search,
  MoreVertical,
  UserPlus,
  FileText,
  BarChart3,
  ClipboardCheck,
  GraduationCap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc,
  getDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { toast } from 'sonner';

export function AdminDashboard({ viewingOrgId }: { viewingOrgId?: string }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  
  // State for different entities
  const [courses, setCourses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [feeRecords, setFeeRecords] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    totalCourses: 0,
    totalRevenue: 0,
  });

  // Course Dialog states
  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [courseForm, setCourseForm] = useState({
    code: '',
    name: '',
    department: '',
    semester: 1,
    credits: 3,
    facultyName: '',
    maxStudents: 60,
    description: '',
  });

  // User Dialog states
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({
    fullName: '',
    email: '',
    role: 'student',
    department: '',
    enrollmentNumber: '',
    semester: 1,
  });

  // Fee Dialog states
  const [showFeeDialog, setShowFeeDialog] = useState(false);
  const [feeForm, setFeeForm] = useState({
    studentId: '',
    amount: 0,
    description: '',
    dueDate: '',
    category: 'tuition',
  });

  const isAdmin = userData?.role === 'college_admin' || userData?.role === 'super_admin';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/auth');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userInfo = userDoc.data();
        setUserData(userInfo);

        if (userInfo?.role !== 'college_admin' && userInfo?.role !== 'super_admin') {
          toast.error('Access denied. Admin only.');
          navigate('/dashboard');
          return;
        }

        await fetchAdminData();
      } catch (error) {
        console.error('Error fetching admin data:', error);
        toast.error('Failed to load admin data');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate, viewingOrgId]);

  const fetchAdminData = async () => {
  // 1. Determine the target ID safely
  const targetOrgId = "pec";

  // 2. GUARD: If we don't have an ID yet, stop here to prevent the Firebase crash
  if (!targetOrgId) {
    console.warn('fetchAdminData: targetOrgId is undefined. Waiting for data...');
    return;
  }

  try {
    // 3. Define your collection references
    const coursesRef = collection(db, 'courses');
    const usersRef = collection(db, 'users');
    const feesRef = collection(db, 'feeRecords');

    // 4. Construct Queries (Safe now because targetOrgId is guaranteed)
    const coursesQuery = query(coursesRef, where('organizationId', '==', targetOrgId));
    const usersQuery = query(usersRef, where('organizationId', '==', targetOrgId));
    
    // Note: Usually feeRecords are also tied to an organizationId
    const feesQuery = query(feesRef, where('organizationId', '==', targetOrgId));

    // 5. Fetch all data concurrently for better performance
    const [coursesSnapshot, usersSnapshot, feeSnapshot] = await Promise.all([
      getDocs(coursesQuery),
      getDocs(usersQuery),
      getDocs(feesQuery)
    ]);

    // 6. Map and Set State
    const coursesData = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    const feeData = feeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    setCourses(coursesData);
    setUsers(usersData);
    setFeeRecords(feeData);

    // 7. Calculate stats
    const students = usersData.filter(u => u.role === 'student').length;
    const faculty = usersData.filter(u => u.role === 'faculty').length;
    const revenue = feeData
      .filter(f => f.status === 'paid')
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    
    setStats({
      totalStudents: students,
      totalFaculty: faculty,
      totalCourses: coursesData.length,
      totalRevenue: revenue,
    });
  } catch (error) {
    console.error('Error in fetchAdminData:', error);
    toast.error('Sync failed: Check your database indexes');
  }
};

  // Course CRUD
  const handleCreateCourse = async () => {
    try {
      await addDoc(collection(db, 'courses'), {
        ...courseForm,
        enrolledStudents: 0,
        schedule: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success('Course created successfully!');
      setShowCourseDialog(false);
      resetCourseForm();
      fetchAdminData();
    } catch (error) {
      console.error('Error creating course:', error);
      toast.error('Failed to create course');
    }
  };

  const handleUpdateCourse = async () => {
    if (!editingCourse) return;
    try {
      await updateDoc(doc(db, 'courses', editingCourse.id), {
        ...courseForm,
        updatedAt: serverTimestamp(),
      });
      toast.success('Course updated successfully!');
      setShowCourseDialog(false);
      setEditingCourse(null);
      resetCourseForm();
      fetchAdminData();
    } catch (error) {
      console.error('Error updating course:', error);
      toast.error('Failed to update course');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      await deleteDoc(doc(db, 'courses', courseId));
      toast.success('Course deleted successfully!');
      fetchAdminData();
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('Failed to delete course');
    }
  };

  // User CRUD
  const handleCreateUser = async () => {
    try {
      await addDoc(collection(db, 'users'), {
        ...userForm,
        profileComplete: true,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success('User created successfully!');
      setShowUserDialog(false);
      resetUserForm();
      fetchAdminData();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        ...userForm,
        updatedAt: serverTimestamp(),
      });
      toast.success('User updated successfully!');
      setShowUserDialog(false);
      setEditingUser(null);
      resetUserForm();
      fetchAdminData();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if(!confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      toast.success('User deleted successfully!');
      fetchAdminData();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  // Fee CRUD
  const handleCreateFee = async () => {
    try {
      await addDoc(collection(db, 'feeRecords'), {
        ...feeForm,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      toast.success('Fee record created successfully!');
      setShowFeeDialog(false);
      resetFeeForm();
      fetchAdminData();
    } catch (error) {
      console.error('Error creating fee:', error);
      toast.error('Failed to create fee record');
    }
  };

  const handleDeleteFee = async (feeId: string) => {
    if (!confirm('Are you sure you want to delete this fee record?')) return;
    try {
      await deleteDoc(doc(db, 'feeRecords', feeId));
      toast.success('Fee record deleted successfully!');
      fetchAdminData();
    } catch (error) {
      console.error('Error deleting fee:', error);
      toast.error('Failed to delete fee record');
    }
  };

  const resetCourseForm = () => {
    setCourseForm({
      code: '',
      name: '',
      department: '',
      semester: 1,
      credits: 3,
      facultyName: '',
      maxStudents: 60,
      description: '',
    });
  };

  const resetUserForm = () => {
    setUserForm({
      fullName: '',
      email: '',
      role: 'student',
      department: '',
      enrollmentNumber: '',
      semester: 1,
    });
  };

  const resetFeeForm = () => {
    setFeeForm({
      studentId: '',
      amount: 0,
      description: '',
      dueDate: '',
      category: 'tuition',
    });
  };

  const openEditCourseDialog = (course: any) => {
    setEditingCourse(course);
    setCourseForm({
      code: course.code,
      name: course.name,
      department: course.department,
      semester: course.semester,
      credits: course.credits,
      facultyName: course.facultyName,
      maxStudents: course.maxStudents,
      description: course.description,
    });
    setShowCourseDialog(true);
  };

  const openEditUserDialog = (user: any) => {
    setEditingUser(user);
    setUserForm({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      department: user.department || '',
      enrollmentNumber: user.enrollmentNumber || '',
      semester: user.semester || 1,
    });
    setShowUserDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Complete control over your ERP system</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/admin/college-settings')}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            College Settings
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="card-elevated p-5 cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => {
            const tabsTrigger = document.querySelector('[value="users"]');
            if (tabsTrigger instanceof HTMLElement) tabsTrigger.click();
          }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Students</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalStudents}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.05 }} 
          className="card-elevated p-5 cursor-pointer hover:border-primary/50 transition-colors"
           onClick={() => {
            const tabsTrigger = document.querySelector('[value="users"]');
            if (tabsTrigger instanceof HTMLElement) tabsTrigger.click();
          }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-foreground/10">
              <BookOpen className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Faculty</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalFaculty}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }} 
          className="card-elevated p-5 cursor-pointer hover:border-primary/50 transition-colors"
           onClick={() => {
            const tabsTrigger = document.querySelector('[value="courses"]');
            if (tabsTrigger instanceof HTMLElement) tabsTrigger.click();
          }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-foreground/10">
              <FileText className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Courses</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalCourses}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.15 }} 
          className="card-elevated p-5 cursor-pointer hover:border-primary/50 transition-colors"
           onClick={() => {
            const tabsTrigger = document.querySelector('[value="fees"]');
            if (tabsTrigger instanceof HTMLElement) tabsTrigger.click();
          }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-foreground/10">
              <DollarSign className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Revenue</p>
              <p className="text-2xl font-bold text-foreground">₹{stats.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="courses" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden flex-nowrap tabs-list-scroll">
          <TabsTrigger value="courses"><BookOpen className="w-4 h-4 mr-2" />Courses</TabsTrigger>
          <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" />Users</TabsTrigger>
          <TabsTrigger value="fees"><DollarSign className="w-4 h-4 mr-2" />Fees</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="w-4 h-4 mr-2" />Analytics</TabsTrigger>
        </TabsList>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Input placeholder="Search courses..." className="max-w-sm w-full" />
            <Button onClick={() => { resetCourseForm(); setEditingCourse(null); setShowCourseDialog(true); }} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />Add Course
            </Button>
          </div>

          <div className="card-elevated overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Code</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Name</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Department</th>
                    <th className="text-center p-4 text-sm font-medium text-muted-foreground">Semester</th>
                    <th className="text-center p-4 text-sm font-medium text-muted-foreground">Enrolled</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {courses.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No courses found. Create your first course!</td></tr>
                  ) : (
                    courses.map((course) => (
                      <tr key={course.id} className="hover:bg-muted/20">
                        <td className="p-4 font-medium text-foreground">{course.code}</td>
                        <td className="p-4 text-foreground">{course.name}</td>
                        <td className="p-4 text-muted-foreground">{course.department}</td>
                        <td className="p-4 text-center text-muted-foreground">{course.semester}</td>
                        <td className="p-4 text-center">
                          <Badge variant="outline">{course.enrolledStudents || 0}/{course.maxStudents}</Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditCourseDialog(course)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteCourse(course.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Input placeholder="Search users..." className="max-w-sm w-full" />
            <Button onClick={() => { resetUserForm(); setEditingUser(null); setShowUserDialog(true); }} className="w-full sm:w-auto">
              <UserPlus className="w-4 h-4 mr-2" />Add User
            </Button>
          </div>

          <div className="card-elevated overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Name</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Email</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Role</th>
                    <th className="text-center p-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No users found</td></tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-muted/20">
                        <td className="p-4 font-medium text-foreground">{user.fullName}</td>
                        <td className="p-4 text-muted-foreground">{user.email}</td>
                        <td className="p-4"><Badge variant="outline">{user.role?.replace('_', ' ') || 'No Role'}</Badge></td>
                        <td className="p-4 text-center">
                          <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>{user.status || 'active'}</Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditUserDialog(user)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Fees Tab */}
        <TabsContent value="fees" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Input placeholder="Search fees..." className="max-w-sm w-full" />
            <Button onClick={() => { resetFeeForm(); setShowFeeDialog(true); }} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />Add Fee Record
            </Button>
          </div>

          <div className="card-elevated overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Student ID</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Description</th>
                    <th className="text-center p-4 text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="text-center p-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {feeRecords.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No fee records found</td></tr>
                  ) : (
                    feeRecords.map((fee) => (
                      <tr key={fee.id} className="hover:bg-muted/20">
                        <td className="p-4 font-medium text-foreground">{fee.studentId}</td>
                        <td className="p-4 text-muted-foreground">{fee.description}</td>
                        <td className="p-4 text-center font-medium">₹{fee.amount?.toLocaleString()}</td>
                        <td className="p-4 text-center">
                          <Badge variant={fee.status === 'paid' ? 'default' : 'destructive'}>{fee.status}</Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteFee(fee.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card-elevated p-6">
              <h3 className="font-semibold text-foreground mb-4">User Distribution</h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Students', count: stats.totalStudents, color: '#22c55e' },
                    { name: 'Faculty', count: stats.totalFaculty, color: '#3b82f6' },
                    { name: 'Admins', count: users.filter(u => u.role === 'college_admin' || u.role === 'super_admin').length, color: '#f59e0b' },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--accent)/0.1)' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {
                        [
                          { name: 'Students', count: stats.totalStudents, color: '#22c55e' },
                          { name: 'Faculty', count: stats.totalFaculty, color: '#3b82f6' },
                          { name: 'Admins', count: users.filter(u => u.role === 'college_admin' || u.role === 'super_admin').length, color: '#f59e0b' },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card-elevated p-6">
              <h3 className="font-semibold text-foreground mb-4">Projected vs Actual Revenue</h3>
               <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    { month: 'Jan', projected: 50000, actual: 48000 },
                    { month: 'Feb', projected: 55000, actual: 52000 },
                    { month: 'Mar', projected: 60000, actual: 65000 },
                    { month: 'Apr', projected: 58000, actual: 56000 },
                    { month: 'May', projected: 62000, actual: 68000 },
                    { month: 'Jun', projected: 65000, actual: 72000 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <Line type="monotone" dataKey="projected" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="actual" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--background))', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Course Dialog */}
      <Dialog open={showCourseDialog} onOpenChange={setShowCourseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCourse ? 'Edit Course' : 'Create New Course'}</DialogTitle>
            <DialogDescription>{editingCourse ? 'Update course details' : 'Add a new course to the system'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Course Code</label>
                <Input value={courseForm.code} onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })} placeholder="CS301" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Course Name</label>
                <Input value={courseForm.name} onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })} placeholder="Data Structures" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Department</label>
                <Input value={courseForm.department} onChange={(e) => setCourseForm({ ...courseForm, department: e.target.value })} placeholder="Computer Science" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Faculty Name</label>
                <Input value={courseForm.facultyName} onChange={(e) => setCourseForm({ ...courseForm, facultyName: e.target.value })} placeholder="Dr. John Smith" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Semester</label>
                <Input type="number" value={courseForm.semester} onChange={(e) => setCourseForm({ ...courseForm, semester: parseInt(e.target.value) })} className="mt-1" min="1" max="8" />
              </div>
              <div>
                <label className="text-sm font-medium">Credits</label>
                <Input type="number" value={courseForm.credits} onChange={(e) => setCourseForm({ ...courseForm, credits: parseInt(e.target.value) })} className="mt-1" min="1" max="6" />
              </div>
              <div>
                <label className="text-sm font-medium">Max Students</label>
                <Input type="number" value={courseForm.maxStudents} onChange={(e) => setCourseForm({ ...courseForm, maxStudents: parseInt(e.target.value) })} className="mt-1" min="10" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} placeholder="Course description..." className="mt-1 w-full min-h-[80px] p-2 rounded-md border border-border bg-background" />
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={editingCourse ? handleUpdateCourse : handleCreateCourse} className="flex-1">
                {editingCourse ? 'Update Course' : 'Create Course'}
              </Button>
              <Button variant="outline" onClick={() => { setShowCourseDialog(false); setEditingCourse(null); resetCourseForm(); }}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Create New User'}</DialogTitle>
            <DialogDescription>{editingUser ? 'Update user details' : 'Add a new user to the system'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <Input value={userForm.fullName} onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })} placeholder="John Doe" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="john@example.com" className="mt-1" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Role</label>
                <Select value={userForm.role} onValueChange={(value) => setUserForm({ ...userForm, role: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="faculty">Faculty</SelectItem>
                    <SelectItem value="college_admin">College Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Department</label>
                <Input value={userForm.department} onChange={(e) => setUserForm({ ...userForm, department: e.target.value })} placeholder="Computer Science" className="mt-1" />
              </div>
            </div>
            {userForm.role === 'student' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Enrollment Number</label>
                  <Input value={userForm.enrollmentNumber} onChange={(e) => setUserForm({ ...userForm, enrollmentNumber: e.target.value })} placeholder="STU2024001" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Semester</label>
                  <Input type="number" value={userForm.semester} onChange={(e) => setUserForm({ ...userForm, semester: parseInt(e.target.value) })} className="mt-1" min="1" max="8" />
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-4">
              <Button onClick={editingUser ? handleUpdateUser : handleCreateUser} className="flex-1">
                {editingUser ? 'Update User' : 'Create User'}
              </Button>
              <Button variant="outline" onClick={() => { setShowUserDialog(false); setEditingUser(null); resetUserForm(); }}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fee Dialog */}
      <Dialog open={showFeeDialog} onOpenChange={setShowFeeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Fee Record</DialogTitle>
            <DialogDescription>Add a new fee record for a student</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Student ID</label>
              <Input value={feeForm.studentId} onChange={(e) => setFeeForm({ ...feeForm, studentId: e.target.value })} placeholder="User ID from users table" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input value={feeForm.description} onChange={(e) => setFeeForm({ ...feeForm, description: e.target.value })} placeholder="Tuition Fee - Fall 2024" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Amount</label>
                <Input type="number" value={feeForm.amount} onChange={(e) => setFeeForm({ ...feeForm, amount: parseInt(e.target.value) })} placeholder="50000" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={feeForm.category} onValueChange={(value) => setFeeForm({ ...feeForm, category: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tuition">Tuition</SelectItem>
                    <SelectItem value="hostel">Hostel</SelectItem>
                    <SelectItem value="exam">Exam</SelectItem>
                    <SelectItem value="library">Library</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Due Date</label>
              <Input type="date" value={feeForm.dueDate} onChange={(e) => setFeeForm({ ...feeForm, dueDate: e.target.value })} className="mt-1" />
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleCreateFee} className="flex-1">Create Fee Record</Button>
              <Button variant="outline" onClick={() => { setShowFeeDialog(false); resetFeeForm(); }}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
