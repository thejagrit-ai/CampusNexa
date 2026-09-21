import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Phone, Building2, Calendar, User, BookOpen, ClipboardCheck, FileText, Award, CreditCard, Receipt, Wrench, ShieldAlert, UtensilsCrossed, Briefcase, ExternalLink, MapPin, GraduationCap, Landmark, BriefcaseBusiness, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { uploadMedia } from '@/lib/cloudinary.service';
import { usePermissions } from '@/hooks/usePermissions';

const toFacultyForm = (source: any, fallback: any = {}) => {
  const value = (key: string, alternate = '') => source?.[key] ?? fallback?.[key] ?? alternate;
  const lines = (input: any) => Array.isArray(input) ? input.join('\n') : (input || '');
  return {
    fullName: value('fullName'), firstName: value('firstName'), lastName: value('lastName'),
    email: value('email'), phone: value('phone'), gender: value('gender'),
    department: value('department'), designation: value('designation'), specialization: value('specialization'),
    employmentType: value('employmentType'), reportingManager: value('reportingManager'), employeeStatus: value('employeeStatus'),
    experience: value('experience'), joiningDate: value('joiningDate'), address: value('address', value('currentAddress')),
    city: value('city'), state: value('state'), country: value('country'), postalCode: value('postalCode'),
    highestQualification: value('highestQualification'), degree: value('degree'), university: value('university'), graduationYear: value('graduationYear'),
    qualifications: lines(value('qualifications')), certifications: lines(value('certifications')),
    skills: Array.isArray(value('skills')) ? value('skills').join(', ') : value('skills'),
    researchInterests: value('researchInterests'), areasOfExpertise: value('areasOfExpertise'), bio: value('bio'),
    bankName: value('bankName'), accountHolderName: value('accountHolderName'), accountNumber: value('accountNumber'), ifsc: value('ifsc'), pan: value('pan'), payrollId: value('payrollId'),
    enrollmentNumber: value('enrollmentNumber'), registrationNumber: value('registrationNumber'), rollNumber: value('rollNumber'),
    program: value('program', value('degree')), batch: value('batch'), semester: value('semester'), section: value('section'),
    dateOfBirth: value('dateOfBirth', value('dob')), guardianName: value('guardianName'), guardianPhone: value('guardianPhone'),
  };
};

export default function UserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, role: viewerRole, loading: authLoading } = usePermissions();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [hostelIssues, setHostelIssues] = useState<any[]>([]);
  const [profileData, setProfileData] = useState<any>(null);
  const [canteenOrders, setCanteenOrders] = useState<any[]>([]);
  const [placementApps, setPlacementApps] = useState<any[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [facultyForm, setFacultyForm] = useState({
    fullName: '', firstName: '', lastName: '', email: '', phone: '', gender: '',
    department: '', designation: '', specialization: '', employmentType: '',
    reportingManager: '', employeeStatus: '', experience: '', joiningDate: '',
    address: '', city: '', state: '', country: '', postalCode: '',
    highestQualification: '', degree: '', university: '', graduationYear: '',
    qualifications: '', certifications: '', skills: '', researchInterests: '',
    areasOfExpertise: '', bio: '', bankName: '', accountHolderName: '',
    accountNumber: '', ifsc: '', pan: '', payrollId: '', enrollmentNumber: '', registrationNumber: '', rollNumber: '',
    program: '', batch: '', semester: '', section: '', dateOfBirth: '', guardianName: '', guardianPhone: '',
  });
  const [formError, setFormError] = useState('');
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Fetch user
        const userDoc = await getDoc(doc(db, 'users', userId!));
        if (!userDoc.exists()) {
          toast.error('User not found');
          navigate('/users');
          return;
        }
        const userData = { id: userDoc.id, ...userDoc.data() } as any;
        setUser(userData);
        setFacultyForm((current) => ({ ...current, ...toFacultyForm(userData) }));

        // Fetch role-specific profile
        let profileTable = '';
        if (userData.role === 'student') profileTable = 'studentProfiles';
        else if (userData.role === 'faculty') profileTable = 'facultyProfiles';
        else if (userData.role === 'college_admin') profileTable = 'collegeAdminProfiles';
        else if (userData.role === 'placement_officer') profileTable = 'placementOfficerProfiles';
        else if (userData.role === 'recruiter') profileTable = 'recruiterProfiles';

        if (profileTable) {
          const profileDoc = await getDoc(doc(db, profileTable, userId!));
          if (profileDoc.exists()) {
            setProfileData(profileDoc.data());
            const profile = profileDoc.data();
            setFacultyForm((current) => ({ ...current, ...toFacultyForm(profile, current) }));
          }
        }

        // Fetch student-specific data
        if (userData.role === 'student') {
          // Fetch enrollments
          const enrollmentsQuery = query(collection(db, 'enrollments'), where('studentId', '==', userId));
          const enrollmentsSnap = await getDocs(enrollmentsQuery);
          const enrollmentsData = await Promise.all(
            enrollmentsSnap.docs.map(async (enrollDoc) => {
              const enrollment = { id: enrollDoc.id, ...enrollDoc.data() } as any;
              if (enrollment.courseId) {
                const courseDoc = await getDoc(doc(db, 'courses', enrollment.courseId));
                return {
                  ...enrollment,
                  courseName: courseDoc.data()?.name || 'Unknown Course',
                  courseCode: courseDoc.data()?.code || 'N/A',
                };
              }
              return { ...enrollment, courseName: 'Unknown Course', courseCode: 'N/A' };
            })
          );
          setEnrollments(enrollmentsData);

          // Fetch grades
          const gradesQuery = query(collection(db, 'grades'), where('studentId', '==', userId));
          const gradesSnap = await getDocs(gradesQuery);
          const gradesData = await Promise.all(
            gradesSnap.docs.map(async (gradeDoc) => {
              const grade = { id: gradeDoc.id, ...gradeDoc.data() } as any;
              // Use courseName and courseCode from grade if available
              if (grade.courseName && grade.courseCode) {
                return grade;
              }
              // Otherwise try to fetch from courses collection
              if (grade.courseId) {
                try {
                  const courseDoc = await getDoc(doc(db, 'courses', grade.courseId));
                  if (courseDoc.exists()) {
                    return {
                      ...grade,
                      courseName: courseDoc.data()?.name || grade.courseName || 'Unknown Course',
                      courseCode: courseDoc.data()?.code || grade.courseCode || 'N/A',
                    };
                  }
                } catch (error) {
                  console.error('Error fetching course:', error);
                }
              }
              return { ...grade, courseName: grade.courseName || 'Unknown Course', courseCode: grade.courseCode || 'N/A' };
            })
          );
          setGrades(gradesData);

          // Fetch attendance
          const attendanceQuery = query(collection(db, 'attendance'), where('studentId', '==', userId));
          const attendanceSnap = await getDocs(attendanceQuery);
          setAttendance(attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

          // Fetch assignments
          const assignmentsQuery = query(collection(db, 'submissions'), where('studentId', '==', userId));
          const assignmentsSnap = await getDocs(assignmentsQuery);
          setAssignments(assignmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

          // Fetch Finance/Payments
          const paymentsQuery = query(collection(db, 'payments'), where('studentId', '==', userId));
          const paymentsSnap = await getDocs(paymentsQuery);
          setPayments(paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

          // Fetch Hostel Issues
          const hostelQuery = query(collection(db, 'hostelIssues'), where('studentId', '==', userId));
          const hostelSnap = await getDocs(hostelQuery);
          setHostelIssues(hostelSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

          // Fetch Canteen Orders
          const canteenQuery = query(collection(db, 'canteenOrders'), where('studentId', '==', userId));
          const canteenSnap = await getDocs(canteenQuery);
          setCanteenOrders(canteenSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

          // Fetch Placement Applications
          const placementQuery = query(collection(db, 'placementApplications'), where('studentId', '==', userId));
          const placementSnap = await getDocs(placementQuery);
          setPlacementApps(placementSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [userId]);

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const displayName = user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'User';
  const canEditFaculty = isAdmin && ['faculty', 'student'].includes(user.role);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'destructive';
      case 'college_admin': return 'default';
      case 'faculty': return 'secondary';
      case 'student': return 'outline';
      default: return 'default';
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    // Handle Firestore Timestamp
    if (date?.seconds) {
      return new Date(date.seconds * 1000).toLocaleDateString();
    }
    // Handle Date object or string
    return new Date(date).toLocaleDateString();
  };

  const saveFacultyDetails = async () => {
    if (!userId || !['faculty', 'student'].includes(user.role) || !canEditFaculty) return;
    if (!facultyForm.fullName.trim() || !facultyForm.email.trim()) { setFormError('Full name and email are required.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(facultyForm.email.trim())) { setFormError('Enter a valid email address.'); return; }
    setFormError('');
    setSaving(true);
    try {
      const data = { ...facultyForm, experience: facultyForm.experience ? Number(facultyForm.experience) : null, qualifications: facultyForm.qualifications.split('\n').map((item) => item.trim()).filter(Boolean), certifications: facultyForm.certifications.split('\n').map((item) => item.trim()).filter(Boolean), skills: facultyForm.skills.split(',').map((item) => item.trim()).filter(Boolean), updatedAt: serverTimestamp() };
      await updateDoc(doc(db, 'users', userId), { ...data });
      await setDoc(doc(db, user.role === 'student' ? 'studentProfiles' : 'facultyProfiles', userId), { ...data }, { merge: true });
      setUser((current: any) => ({ ...current, ...data })); setProfileData((current: any) => ({ ...(current || {}), ...data })); setEditOpen(false); toast.success(`${user.role === 'student' ? 'Student' : 'Faculty'} details updated`);
    } catch (error) { console.error(error); toast.error(`Failed to update ${user.role} details`); } finally { setSaving(false); }
  };

  const handleFacultyPhotoUpload = async (file?: File) => {
    if (!canEditFaculty || !file || !userId || !file.type.startsWith('image/')) { toast.error('Please choose an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be smaller than 10 MB'); return; }
    setImageUploading(true);
    try {
      const photoURL = await uploadMedia(file, userId);
      await updateDoc(doc(db, 'users', userId), { photoURL, updatedAt: serverTimestamp() });
      await setDoc(doc(db, user.role === 'student' ? 'studentProfiles' : 'facultyProfiles', userId), { photoURL, updatedAt: serverTimestamp() }, { merge: true });
      setUser((current: any) => ({ ...current, photoURL })); setProfileData((current: any) => ({ ...(current || {}), photoURL })); toast.success(`${user.role === 'student' ? 'Student' : 'Faculty'} photograph updated`);
    } catch (error) { console.error(error); toast.error('Could not upload photograph'); } finally { setImageUploading(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/users')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{displayName}</h1>
            <p className="mt-1 text-muted-foreground">{user.role === 'faculty' ? (user.designation || profileData?.designation || 'Faculty profile') : 'Complete user profile'}{(user.employeeId || user.enrollmentNumber || profileData?.employeeId || profileData?.enrollmentNumber) && <span className="ml-2 text-xs font-mono">· {user.employeeId || user.enrollmentNumber || profileData?.employeeId || profileData?.enrollmentNumber}</span>}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2"><Badge variant={getRoleBadgeColor(user.role)} className="px-3 py-1 text-sm">{user.role?.replace('_', ' ').toUpperCase()}</Badge>{viewerRole !== 'placement_officer' && <Button variant="outline" size="sm" onClick={() => navigate('/settings')}><KeyRound className="mr-2 h-4 w-4" />Change password</Button>}{canEditFaculty && <Button size="sm" onClick={() => { setFormError(''); setEditOpen(true); }}><User className="mr-2 h-4 w-4" />Edit profile</Button>}</div>
      </div>

      {/* Main Info Card */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card-elevated p-6 space-y-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Full Name</label>
              <p className="text-foreground font-medium">{displayName}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <p className="text-foreground">{user.email}</p>
            </div>
            {user.phone && (
              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone
                </label>
                <p className="text-foreground">{user.phone}</p>
              </div>
            )}
            {user.dateOfBirth && (
              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date of Birth
                </label>
                <p className="text-foreground">{formatDate(user.dateOfBirth)}</p>
              </div>
            )}
          </div>
        </div>

        <div className="card-elevated p-6 space-y-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Academic Information
          </h2>
          <div className="space-y-3">
            {(user.department || profileData?.department) && (
              <div>
                <label className="text-sm text-muted-foreground">Department</label>
                <p 
                  className="text-foreground font-medium cursor-pointer hover:text-primary transition-colors hover:underline"
                  onClick={() => navigate('/departments')}
                  title="View Departments"
                >
                  {user.department || profileData?.department}
                </p>
              </div>
            )}
            {(user.enrollmentNumber || profileData?.enrollmentNumber || profileData?.employeeId) && (
              <div>
                <label className="text-sm text-muted-foreground">
                  {user.role === 'student' ? 'Enrollment Number' : 'Employee ID'}
                </label>
                <p className="text-foreground font-mono">
                  {user.enrollmentNumber || profileData?.enrollmentNumber || profileData?.employeeId}
                </p>
              </div>
            )}
            {(user.semester || profileData?.semester) && (
              <div>
                <label className="text-sm text-muted-foreground">Current Semester</label>
                <p className="text-foreground">{user.semester || profileData?.semester}</p>
              </div>
            )}
            {(user.batch || profileData?.batch) && (
              <div>
                <label className="text-sm text-muted-foreground">Batch</label>
                <p className="text-foreground">{user.batch || profileData?.batch}</p>
              </div>
            )}
            <div>
              <label className="text-sm text-muted-foreground">Account Status</label>
              <Badge variant={user.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                {user.status || 'active'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      {user.role === 'faculty' && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <div className="card-elevated flex flex-col items-center p-6 text-center">
              <div className="mb-4 h-28 w-28 overflow-hidden rounded-2xl border border-border bg-muted">
                {(user.photoURL || user.photoUrl || user.avatar || profileData?.photoURL || profileData?.photoUrl) ? <img src={user.photoURL || user.photoUrl || user.avatar || profileData?.photoURL || profileData?.photoUrl} alt={displayName} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-muted-foreground">{displayName.split(' ').map((name: string) => name[0]).slice(0, 2).join('')}</div>}
              </div>
              {canEditFaculty && <><label className="mb-3 inline-flex cursor-pointer items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted">{imageUploading ? 'Uploading…' : 'Change photograph'}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={imageUploading} onChange={(event) => { handleFacultyPhotoUpload(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label><p className="mb-3 text-[11px] text-muted-foreground">PNG, JPG or WebP · max 10 MB</p></>}
              <h2 className="text-lg font-semibold text-foreground">{displayName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{user.designation || profileData?.designation || 'Faculty member'}</p>
              <Badge variant="outline" className="mt-3">{user.status || 'active'}</Badge>
              <div className="mt-5 grid w-full grid-cols-2 gap-3 border-t border-border pt-5"><div><p className="text-xl font-semibold">{user.experience || profileData?.experience || '—'}</p><p className="text-xs text-muted-foreground">Years experience</p></div><div><p className="text-xl font-semibold">{user.employeeId || profileData?.employeeId || '—'}</p><p className="text-xs text-muted-foreground">Employee ID</p></div></div>
            </div>
            <div className="card-elevated p-6">
              <div className="flex items-center gap-2 border-b border-border pb-4"><GraduationCap className="h-5 w-5 text-muted-foreground" /><h2 className="text-lg font-semibold">Professional profile</h2></div>
              <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Department</p><p className="mt-1 font-medium">{user.department || profileData?.department || 'Not provided'}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Designation</p><p className="mt-1 font-medium">{user.designation || profileData?.designation || 'Not provided'}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Employment type</p><p className="mt-1 font-medium">{user.employmentType || profileData?.employmentType || 'Not provided'}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Joining date</p><p className="mt-1 font-medium">{formatDate(user.joiningDate || profileData?.joiningDate)}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Reporting manager</p><p className="mt-1 font-medium">{user.reportingManager || profileData?.reportingManager || 'Not provided'}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Specialization</p><p className="mt-1 font-medium">{user.specialization || profileData?.specialization || 'Not provided'}</p></div></div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="card-elevated p-6"><div className="flex items-center gap-2 border-b border-border pb-4"><MapPin className="h-5 w-5 text-muted-foreground" /><h2 className="text-lg font-semibold">Contact & address</h2></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p><p className="mt-1 break-all font-medium">{user.email || 'Not provided'}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Phone</p><p className="mt-1 font-medium">{user.phone || profileData?.phone || 'Not provided'}</p></div><div className="sm:col-span-2"><p className="text-xs uppercase tracking-wide text-muted-foreground">Residential address</p><p className="mt-1 whitespace-pre-line font-medium">{user.address || profileData?.address || profileData?.currentAddress || 'Not provided'}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">City / state</p><p className="mt-1 font-medium">{[user.city || profileData?.city, user.state || profileData?.state].filter(Boolean).join(' / ') || 'Not provided'}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Country / postal code</p><p className="mt-1 font-medium">{[user.country || profileData?.country, user.postalCode || profileData?.postalCode].filter(Boolean).join(' / ') || 'Not provided'}</p></div></div></div>
            <div className="card-elevated p-6"><div className="flex items-center gap-2 border-b border-border pb-4"><Award className="h-5 w-5 text-muted-foreground" /><h2 className="text-lg font-semibold">Qualifications</h2></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Highest qualification</p><p className="mt-1 font-medium">{user.highestQualification || profileData?.highestQualification || 'Not provided'}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Degree / university</p><p className="mt-1 font-medium">{[user.degree || profileData?.degree, user.university || profileData?.university].filter(Boolean).join(' · ') || 'Not provided'}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Graduation year</p><p className="mt-1 font-medium">{user.graduationYear || profileData?.graduationYear || 'Not provided'}</p></div><div className="sm:col-span-2"><p className="text-xs uppercase tracking-wide text-muted-foreground">Qualifications & certifications</p><p className="mt-1 whitespace-pre-line text-sm leading-6">{[user.qualifications || profileData?.qualifications, user.certifications || profileData?.certifications].flatMap((item) => Array.isArray(item) ? item : String(item || '').split(/\n|,/)).map((item) => String(item).trim()).filter(Boolean).join(' · ') || 'No qualification records provided.'}</p></div></div></div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="card-elevated p-6"><div className="flex items-center gap-2 border-b border-border pb-4"><BriefcaseBusiness className="h-5 w-5 text-muted-foreground" /><h2 className="text-lg font-semibold">Experience & research</h2></div><div className="mt-5 space-y-4"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Total experience</p><p className="mt-1 text-2xl font-semibold">{user.experience || profileData?.experience || 'Not provided'}{(user.experience || profileData?.experience) && <span className="ml-1 text-sm font-normal text-muted-foreground">years</span>}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Areas of expertise</p><p className="mt-1 text-sm leading-6">{user.areasOfExpertise || profileData?.areasOfExpertise || user.skills || profileData?.skills || 'Not provided'}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Bio / research interests</p><p className="mt-1 whitespace-pre-line text-sm leading-6 text-muted-foreground">{user.bio || profileData?.bio || user.researchInterests || profileData?.researchInterests || 'No biography or research details provided.'}</p></div></div></div>
            {isAdmin && <div className="card-elevated p-6"><div className="flex items-center gap-2 border-b border-border pb-4"><Landmark className="h-5 w-5 text-muted-foreground" /><h2 className="text-lg font-semibold">Banking & payroll</h2></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Bank name</p><p className="mt-1 font-medium">{user.bankName || profileData?.bankName || 'Not provided'}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Account holder</p><p className="mt-1 font-medium">{user.accountHolderName || profileData?.accountHolderName || displayName}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Account number</p><p className="mt-1 font-mono font-medium">{(user.accountNumber || profileData?.accountNumber) ? `•••• ${String(user.accountNumber || profileData?.accountNumber).slice(-4)}` : 'Not provided'}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">IFSC</p><p className="mt-1 font-mono font-medium">{user.ifsc || profileData?.ifsc || 'Not provided'}</p></div></div><p className="mt-5 text-xs text-muted-foreground">Bank details are masked and visible only to authorized administrators.</p></div>}
          </div>
        </div>
      )}

      {user.role === 'student' && (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <div className="card-elevated flex flex-col items-center p-6 text-center">
            <div className="mb-4 h-28 w-28 overflow-hidden rounded-2xl border border-border bg-muted">
              {(user.photoURL || user.photoUrl || profileData?.photoURL || profileData?.photoUrl) ? <img src={user.photoURL || user.photoUrl || profileData?.photoURL || profileData?.photoUrl} alt={displayName} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-muted-foreground">{displayName.split(' ').map((name: string) => name[0]).slice(0, 2).join('')}</div>}
            </div>
            {canEditFaculty && <label className="mb-3 inline-flex cursor-pointer items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">{imageUploading ? 'Uploading...' : 'Change photograph'}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={imageUploading} onChange={(event) => { handleFacultyPhotoUpload(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label>}
            <h2 className="text-lg font-semibold">{displayName}</h2><p className="mt-1 text-sm text-muted-foreground">{user.program || profileData?.program || profileData?.department || 'Student'}</p><Badge variant="outline" className="mt-3">{user.status || 'active'}</Badge>
          </div>
          <div className="card-elevated p-6"><div className="flex items-center gap-2 border-b border-border pb-4"><GraduationCap className="h-5 w-5 text-muted-foreground" /><h2 className="text-lg font-semibold">Student academic profile</h2></div><div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Program</p><p className="mt-1 font-medium">{user.program || profileData?.program || profileData?.degree || 'Not provided'}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Enrollment number</p><p className="mt-1 font-mono font-medium">{user.enrollmentNumber || profileData?.enrollmentNumber || 'Not provided'}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Roll number</p><p className="mt-1 font-mono font-medium">{user.rollNumber || profileData?.rollNumber || 'Not provided'}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Batch</p><p className="mt-1 font-medium">{user.batch || profileData?.batch || 'Not provided'}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Semester / section</p><p className="mt-1 font-medium">{[user.semester || profileData?.semester, user.section || profileData?.section].filter(Boolean).join(' / ') || 'Not provided'}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Department</p><p className="mt-1 font-medium">{user.department || profileData?.department || 'Not provided'}</p></div></div></div>
        </div>
      )}

      {/* Student Academic Data */}
      {user.role === 'student' && (
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Enrolled Courses */}
          <div className="card-elevated p-6 xl:col-span-2">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Enrolled Courses ({enrollments.length})
            </h2>
            {enrollments.length > 0 ? (
              <div className="grid gap-3">
                {enrollments.map((enrollment) => (
                  <div 
                    key={enrollment.id} 
                    className="p-4 border border-border rounded-lg cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() => navigate(`/courses/${enrollment.courseId}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground hover:text-primary transition-colors group-hover:underline">
                          {enrollment.courseCode}
                        </p>
                        <p className="text-sm text-muted-foreground">{enrollment.courseName}</p>
                      </div>
                      <Badge variant={enrollment.status === 'active' ? 'default' : 'secondary'}>
                        {enrollment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No enrollments found</p>
            )}
          </div>

          {/* Grades */}
          <div className="card-elevated p-6 xl:col-span-2">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Award className="w-5 h-5" />
              Grades & Results ({grades.length})
            </h2>
            {grades.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground">Course</th>
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground">Semester</th>
                      <th className="text-center p-3 text-sm font-medium text-muted-foreground">Grade</th>
                      <th className="text-center p-3 text-sm font-medium text-muted-foreground">Marks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {grades.map((grade) => (
                      <tr key={grade.id}>
                        <td className="p-3">
                          <p className="font-medium text-foreground">{grade.courseCode}</p>
                          <p className="text-sm text-muted-foreground">{grade.courseName}</p>
                        </td>
                        <td className="p-3 text-muted-foreground">{grade.semester}</td>
                        <td className="p-3 text-center">
                          <Badge variant="default">{grade.grade}</Badge>
                        </td>
                        <td className="p-3 text-center text-foreground font-medium">
                          {grade.marks || grade.totalMarks}/100
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No grades recorded yet</p>
            )}
          </div>

          {/* Attendance Summary */}
          <div className="card-elevated p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              Attendance Records ({attendance.length})
            </h2>
            {attendance.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-sm text-muted-foreground">Present</p>
                    <p className="text-2xl font-bold text-green-500">
                      {attendance.filter(a => a.status === 'present').length}
                    </p>
                  </div>
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-muted-foreground">Absent</p>
                    <p className="text-2xl font-bold text-red-500">
                      {attendance.filter(a => a.status === 'absent').length}
                    </p>
                  </div>
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-sm text-muted-foreground">Attendance %</p>
                    <p className="text-2xl font-bold text-yellow-500">
                      {((attendance.filter(a => a.status === 'present').length / attendance.length) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No attendance records</p>
            )}
          </div>

          {/* Assignments */}
          <div className="card-elevated p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Assignment Submissions ({assignments.length})
            </h2>
            {assignments.length > 0 ? (
              <div className="grid gap-3">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{assignment.assignmentTitle || 'Assignment'}</p>
                        <p className="text-sm text-muted-foreground">
                          Submitted: {formatDate(assignment.submittedAt)}
                        </p>
                      </div>
                      <Badge variant={assignment.status === 'graded' ? 'default' : 'secondary'}>
                        {assignment.status || 'submitted'}
                      </Badge>
                    </div>
                    {assignment.marks && (
                      <p className="mt-2 text-sm text-foreground">
                        Score: {assignment.marks}/{assignment.totalMarks || 100}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No assignments submitted</p>
            )}
          </div>
        </div>
      )}

      {/* Financial Records */}
      {user.role === 'student' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated p-6"
        >
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-accent" />
            Financial Records & Fees
          </h2>
          {payments.length > 0 ? (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment.id} className="p-4 border border-border rounded-lg flex items-center justify-between">
                  <div className="flex gap-3">
                    <div className="p-2 rounded-full bg-accent/10">
                      <Receipt className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{payment.title || 'Fee Payment'}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(payment.paidAt || payment.updatedAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">₹{payment.amount}</p>
                    <Badge variant={payment.status === 'success' || payment.status === 'paid' ? 'default' : 'secondary'}>
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-muted/20 rounded-lg flex flex-col items-center">
              <Receipt className="w-10 h-10 text-muted-foreground/30 mb-2" />
              <p className="text-muted-foreground">No financial records found</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Hostel Issues */}
      {user.role === 'student' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated p-6"
        >
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" />
            Hostel Maintenance Issues
          </h2>
          {hostelIssues.length > 0 ? (
            <div className="space-y-3">
              {hostelIssues.map((issue) => (
                <div 
                  key={issue.id} 
                  className="group p-4 border border-border rounded-lg cursor-pointer hover:bg-muted/10 transition-all"
                  onClick={() => navigate('/admin/hostel')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <ShieldAlert className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground group-hover:text-primary transition-colors">{issue.title}</p>
                        <p className="text-sm text-muted-foreground">Category: {issue.category}</p>
                      </div>
                    </div>
                    <Badge variant={issue.status === 'resolved' ? 'default' : 'secondary'}>
                      {issue.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 pl-9">Reported: {formatDate(issue.createdAt)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-muted/20 rounded-lg flex flex-col items-center">
              <ShieldAlert className="w-10 h-10 text-muted-foreground/30 mb-2" />
              <p className="text-muted-foreground">No hostel issues reported</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Placement Applications */}
      {user.role === 'student' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated p-6"
        >
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-500" />
            Placement Applications ({placementApps.length})
          </h2>
          {placementApps.length > 0 ? (
            <div className="space-y-3">
              {placementApps.map((app) => (
                <div key={app.id} className="p-4 border border-border rounded-lg flex items-center justify-between">
                  <div className="flex gap-3">
                    <div className="p-2 rounded-full bg-indigo-500/10">
                      <Briefcase className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{app.jobTitle || 'Job Application'}</p>
                      <p className="text-sm text-muted-foreground">{app.companyName}</p>
                    </div>
                  </div>
                  <Badge variant={app.status === 'placed' ? 'success' : app.status === 'rejected' ? 'destructive' : 'secondary'}>
                    {app.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-muted/20 rounded-lg flex flex-col items-center">
              <Briefcase className="w-10 h-10 text-muted-foreground/30 mb-2" />
              <p className="text-muted-foreground">No placement applications yet</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Canteen Orders */}
      {user.role === 'student' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated p-6"
        >
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-orange-500" />
            Canteen Orders ({canteenOrders.length})
          </h2>
          {canteenOrders.length > 0 ? (
            <div className="space-y-3">
              {canteenOrders.map((order) => (
                <div key={order.id} className="p-4 border border-border rounded-lg flex items-center justify-between">
                  <div className="flex gap-3">
                    <div className="p-2 rounded-full bg-orange-500/10">
                      <UtensilsCrossed className="w-4 h-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Order #{order.id.slice(-6).toUpperCase()}</p>
                      <p className="text-sm text-muted-foreground">{order.items?.length || 0} items • ₹{order.total}</p>
                    </div>
                  </div>
                  <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
                    {order.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-muted/20 rounded-lg flex flex-col items-center">
              <UtensilsCrossed className="w-10 h-10 text-muted-foreground/30 mb-2" />
              <p className="text-muted-foreground">No canteen orders found</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Metadata */}
      <div className="card-elevated p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">System Information</h2>
        <div className="grid gap-3 text-sm">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4">
            <span className="text-muted-foreground">User ID:</span>
            <span className="text-foreground font-mono break-all">{user.id}</span>
          </div>
          {user.createdAt && (
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4">
              <span className="text-muted-foreground">Account Created:</span>
              <span className="text-foreground">
                {formatDate(user.createdAt)}
              </span>
            </div>
          )}
          {user.updatedAt && (
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4">
              <span className="text-muted-foreground">Last Updated:</span>
              <span className="text-foreground">
                {formatDate(user.updatedAt)}
              </span>
            </div>
          )}
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader><DialogTitle>Edit {user.role === 'student' ? 'student' : 'faculty'} profile</DialogTitle><DialogDescription>Update profile sections using the existing account record. Empty optional fields remain blank.</DialogDescription></DialogHeader>
          {formError && <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{formError}</div>}
          <div className="space-y-6 py-2">
            {user.role === 'student' && <section className="rounded-lg border border-border/70 p-4"><h3 className="mb-4 text-sm font-semibold tracking-wide text-foreground">Academic record</h3><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[['program','Program / degree'],['enrollmentNumber','Enrollment number'],['registrationNumber','Registration number'],['rollNumber','Roll number'],['batch','Batch'],['semester','Semester'],['section','Section']].map(([key,label]) => <div key={key}><Label htmlFor={`student-${key}`}>{label}</Label><Input id={`student-${key}`} value={(facultyForm as any)[key]} onChange={(event) => setFacultyForm({ ...facultyForm, [key]: event.target.value })} className="mt-1" /></div>)}</div></section>}
            {[['Identity & contact', [['fullName','Full name','text'],['firstName','First name','text'],['lastName','Last name','text'],['email','Work email','email'],['phone','Phone','tel'],['gender','Gender','text']]], ['Employment', [['department','Department','text'],['designation','Designation','text'],['employmentType','Employment type','text'],['reportingManager','Reporting manager','text'],['employeeStatus','Status','text'],['joiningDate','Joining date','date'],['experience','Years of experience','number']]], ['Address', [['address','Street address','text'],['city','City','text'],['state','State / province','text'],['country','Country','text'],['postalCode','Postal code','text']]], ['Education', [['highestQualification','Highest qualification','text'],['degree','Degree / subject','text'],['university','University / institution','text'],['graduationYear','Graduation year','number']]], ['Banking & payroll', [['bankName','Bank name','text'],['accountHolderName','Account holder','text'],['accountNumber','Account number','text'],['ifsc','IFSC','text'],['pan','PAN / tax ID','text'],['payrollId','Payroll ID','text']]]].map(([section, fields]: any) => <section key={section} className="rounded-lg border border-border/70 p-4"><h3 className="mb-4 text-sm font-semibold tracking-wide text-foreground">{section}</h3><div className="grid gap-4 sm:grid-cols-2">{fields.map(([key, label, type]: string[]) => <div key={key} className={key === 'address' ? 'sm:col-span-2' : ''}><Label htmlFor={`faculty-${key}`}>{label}</Label><Input id={`faculty-${key}`} type={type} min={type === 'number' ? 0 : undefined} value={(facultyForm as any)[key]} onChange={(event) => setFacultyForm({ ...facultyForm, [key]: event.target.value })} className="mt-1" /></div>)}</div></section>)}
            <section className="rounded-lg border border-border/70 p-4"><h3 className="mb-4 text-sm font-semibold tracking-wide text-foreground">Expertise & profile</h3><div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="faculty-specialization">Specialization</Label><Input id="faculty-specialization" value={facultyForm.specialization} onChange={(event) => setFacultyForm({ ...facultyForm, specialization: event.target.value })} className="mt-1" /></div><div><Label htmlFor="faculty-areasOfExpertise">Areas of expertise</Label><Input id="faculty-areasOfExpertise" value={facultyForm.areasOfExpertise} onChange={(event) => setFacultyForm({ ...facultyForm, areasOfExpertise: event.target.value })} className="mt-1" /></div><div><Label htmlFor="faculty-skills">Skills (comma separated)</Label><Input id="faculty-skills" value={facultyForm.skills} onChange={(event) => setFacultyForm({ ...facultyForm, skills: event.target.value })} className="mt-1" /></div><div><Label htmlFor="faculty-certifications">Certifications (one per line)</Label><Input id="faculty-certifications" value={facultyForm.certifications} onChange={(event) => setFacultyForm({ ...facultyForm, certifications: event.target.value })} className="mt-1" /></div><div className="sm:col-span-2"><Label htmlFor="faculty-qualifications">Qualifications (one per line)</Label><textarea id="faculty-qualifications" value={facultyForm.qualifications} onChange={(event) => setFacultyForm({ ...facultyForm, qualifications: event.target.value })} className="mt-1 min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div><div className="sm:col-span-2"><Label htmlFor="faculty-researchInterests">Research interests</Label><textarea id="faculty-researchInterests" value={facultyForm.researchInterests} onChange={(event) => setFacultyForm({ ...facultyForm, researchInterests: event.target.value })} className="mt-1 min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div><div className="sm:col-span-2"><Label htmlFor="faculty-bio">Professional biography</Label><textarea id="faculty-bio" value={facultyForm.bio} onChange={(event) => setFacultyForm({ ...facultyForm, bio: event.target.value })} className="mt-1 min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div></div></section>
          </div>
          <DialogFooter className="sticky bottom-0 border-t border-border bg-background pt-4"><Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={saveFacultyDetails} disabled={saving}>{saving ? 'Saving…' : 'Save faculty details'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
