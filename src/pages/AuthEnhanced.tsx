import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';
import { setDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { getRolePermissions } from '@/lib/rolePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, Lock, User, Eye, EyeOff, Loader, AlertCircle, CheckCircle } from 'lucide-react';

type UserRole = 'student' | 'faculty' | 'college_admin' | 'placement_officer' | 'recruiter' | 'super_admin';

interface AuthFormData {
  email: string;
  password: string;
  confirmPassword?: string;
  fullName?: string;
  role: UserRole;
  agreeToTerms: boolean;
}

export default function AuthEnhanced() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userAuthenticated, setUserAuthenticated] = useState(false);

  const [formData, setFormData] = useState<AuthFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'student',
    agreeToTerms: false,
  });

  const [forgotEmail, setForgotEmail] = useState('');
  // Check if user is already authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      setUserAuthenticated(true);

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            fullName: user.displayName || 'User',
            role: null,
            profileComplete: false,
            verified: false,
            avatar: null,
            status: 'active',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          navigate('/role-selection', { replace: true });
          return;
        }

        const userData = userDoc.data();
        if (!userData.role) {
          navigate('/role-selection', { replace: true });
        } else if (!userData.profileComplete) {
          navigate('/onboarding', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        console.error('Error loading authenticated user:', error);
        setError('Your account could not be loaded. Please try signing in again.');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checkboxElement = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: checkboxElement.checked,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.fullName?.trim()) {
      setError('Full name is required');
      return;
    }
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!formData.agreeToTerms) {
      setError('You must agree to terms and conditions');
      return;
    }

    try {
      setLoading(true);

      // Create user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Create user document in Firestore with role: null
      // User will select role in the next step
      const userDocData = {
        uid: userCredential.user.uid,
        email: formData.email,
        fullName: formData.fullName,
        role: null, // Role will be set in role selection page
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Profile data
        profileComplete: false,
        verified: false,
        avatar: null,
        status: 'active',
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), userDocData);

      setSuccess(`Account created successfully! Please select your role...`);
      setTimeout(() => navigate('/role-selection'), 2000);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use. Please sign in or use a different email.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else {
        setError(err.message || 'Failed to create account');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email');
      return;
    }
    if (!formData.password) {
      setError('Password is required');
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      setSuccess('Signing in...');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email. Please sign up.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Try again or reset your password.');
      } else if (err.code === 'auth/too-many-login-attempts') {
        setError('Too many login attempts. Please try again later.');
      } else {
        setError(err.message || 'Failed to sign in');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateEmail(forgotEmail)) {
      setError('Please enter a valid email');
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, forgotEmail);
      setSuccess('Password reset email sent! Check your inbox.');
      setForgotEmail('');
      setTimeout(() => setActiveTab('signin'), 3000);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else {
        setError(err.message || 'Failed to send reset email');
      }
    } finally {
      setLoading(false);
    }
  };

  if (userAuthenticated) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <CardTitle>Already Authenticated</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            <p>You're already signed in. Redirecting to dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="campusnex-auth-shell">
      <motion.aside
        className="campusnex-auth-story"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: .8, ease: [0.16, 1, 0.3, 1] }}
      >
        <a href="/" className="campusnex-auth-brand"><span>C</span> CAMPUSNEX</a>
        <div className="campusnex-auth-copy">
          <p>THE CONNECTED CAMPUS OS</p>
          <h1>Welcome back to your campus command center.</h1>
          <div><span>01</span> Academics, operations, and student life—together.</div>
          <div><span>02</span> Secure access tailored to every campus role.</div>
          <div><span>03</span> Real-time context for faster, clearer decisions.</div>
        </div>
        <small>ONE CAMPUS. EVERYTHING CONNECTED.</small>
      </motion.aside>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="campusnex-auth-panel"
      >
        <Card className="campusnex-auth-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome to CampusNex</CardTitle>
            <CardDescription>Manage your educational institution</CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-2 text-sm text-red-600"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex gap-2 text-sm text-green-600"
              >
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{success}</span>
              </motion.div>
            )}

            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 campusnex-auth-tabs">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              {/* SIGN IN TAB */}
              <TabsContent value="signin" className="space-y-4 mt-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Email Address</label>
                    <div className="relative mt-1">
                      <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                      <Input
                        name="email"
                        type="email"
                        placeholder="email@example.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={loading}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Password</label>
                    <div className="relative mt-1">
                      <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                      <Input
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleInputChange}
                        disabled={loading}
                        className="pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div
                    className="text-sm text-primary cursor-pointer hover:underline"
                    onClick={() => setActiveTab('forgot')}
                  >
                    Forgot password?
                  </div>

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              {/* SIGN UP TAB - Redirects to Institution Application */}
              <TabsContent value="signup" className="space-y-4 mt-4">
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Looking to Join?
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Individual user accounts are created by your institution's admin.
                    </p>
                  </div>

                  <div className="bg-secondary/30 border border-border rounded-lg p-4 space-y-3">
                    <p className="text-sm text-foreground font-medium">
                      Are you an educational institution?
                    </p>
                    <Button
                      type="button"
                      onClick={() => navigate('/apply-institution')}
                      className="w-full"
                    >
                      Apply as Institution
                    </Button>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Already have an account?{' '}
                      <span
                        className="text-primary cursor-pointer hover:underline"
                        onClick={() => setActiveTab('signin')}
                      >
                        Sign in here
                      </span>
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* FORGOT PASSWORD TAB */}
              <TabsContent value="forgot" className="space-y-4 mt-4">
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Enter your email and we'll send you a link to reset your password.
                  </p>

                  <div>
                    <label className="text-sm font-medium">Email Address</label>
                    <div className="relative mt-1">
                      <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        disabled={loading}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab('signin')}
                    className="w-full"
                  >
                    Back to Sign In
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-4">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </motion.div>
    </div>
  );
}
