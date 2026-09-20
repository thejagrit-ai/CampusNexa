import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
  shortName: string;
  type: 'university' | 'college' | 'institute';
  location: string;
  email: string;
  phone: string;
  website: string;
  status: 'active' | 'pending' | 'suspended';
  verified: boolean;
  totalUsers: number;
  totalStudents: number;
  totalFaculty: number;
  createdAt: any;
  updatedAt: any;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Organizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    type: 'college' as const,
    location: '',
    email: '',
    phone: '',
    website: '',
    status: 'pending' as const,
  });

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    const filtered = organizations.filter(
      (org) =>
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.shortName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredOrgs(filtered);
  }, [searchQuery, organizations]);

  const fetchOrganizations = async () => {
    try {
      const orgsSnapshot = await getDocs(collection(db, 'organizations'));
      const orgsData = orgsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Organization[];

      // Fetch all users to calculate real stats
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const allUsers = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate stats for each organization dynamically
      const orgsWithStats = orgsData.map(org => {
        const orgUsers = allUsers.filter((u: any) => u.organizationId === org.id);
        const students = orgUsers.filter((u: any) => u.role === 'student').length;
        const faculty = orgUsers.filter((u: any) => u.role === 'faculty').length;

        return {
          ...org,
          totalUsers: orgUsers.length,
          totalStudents: students,
          totalFaculty: faculty,
        };
      });

      setOrganizations(orgsWithStats);
      setFilteredOrgs(orgsWithStats);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingOrg) {
        // Update existing organization
        await updateDoc(doc(db, 'organizations', editingOrg.id), {
          ...formData,
          updatedAt: serverTimestamp(),
        });
        toast.success('Organization updated successfully');
      } else {
        // Create new organization
        await addDoc(collection(db, 'organizations'), {
          ...formData,
          verified: false,
          totalUsers: 0,
          totalStudents: 0,
          totalFaculty: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast.success('Organization created successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchOrganizations();
    } catch (error) {
      console.error('Error saving organization:', error);
      toast.error('Failed to save organization');
    }
  };

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      shortName: org.shortName,
      type: org.type,
      location: org.location,
      email: org.email,
      phone: org.phone,
      website: org.website,
      status: org.status,
    });
    setDialogOpen(true);
  };

  const handleDeleteOrganization = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this organization?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'organizations', id));
      toast.success('Organization deleted successfully');
      fetchOrganizations();
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast.error('Failed to delete organization');
    }
  };

  const handleApproveOrganization = async (id: string) => {
    try {
      await updateDoc(doc(db, 'organizations', id), {
        status: 'active',
        verified: true,
        updatedAt: serverTimestamp(),
      });
      toast.success('Organization approved successfully!');
      fetchOrganizations();
    } catch (error) {
      console.error('Error approving organization:', error);
      toast.error('Failed to approve organization');
    }
  };

  const handleRejectOrganization = async (id: string) => {
    if (!window.confirm('Are you sure you want to reject this application? This will delete the organization.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'organizations', id));
      toast.success('Application rejected and removed');
      fetchOrganizations();
    } catch (error) {
      console.error('Error rejecting organization:', error);
      toast.error('Failed to reject application');
    }
  };

  const handleVerify = async (orgId: string, verified: boolean) => {
    try {
      await updateDoc(doc(db, 'organizations', orgId), {
        verified,
        status: verified ? 'active' : 'pending',
        updatedAt: serverTimestamp(),
      });
      toast.success(`Organization ${verified ? 'verified' : 'unverified'} successfully`);
      fetchOrganizations();
    } catch (error) {
      console.error('Error updating verification:', error);
      toast.error('Failed to update verification');
    }
  };

  const resetForm = () => {
    setEditingOrg(null);
    setFormData({
      name: '',
      shortName: '',
      type: 'college',
      location: '',
      email: '',
      phone: '',
      website: '',
      status: 'pending',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'status-verified';
      case 'pending':
        return 'status-pending';
      case 'suspended':
        return 'status-error';
      default:
        return 'default';
    }
  };

  const stats = {
    total: organizations.length,
    active: organizations.filter((o) => o.status === 'active').length,
    pending: organizations.filter((o) => o.status === 'pending').length,
    totalUsers: organizations.reduce((sum, o) => sum + (o.totalUsers || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organizations</h1>
          <p className="text-muted-foreground">Manage all institutions on the platform</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button variant="gradient">
              <Plus className="w-4 h-4" />
              Add Organization
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingOrg ? 'Edit Organization' : 'Add New Organization'}
              </DialogTitle>
              <DialogDescription>
                {editingOrg
                  ? 'Update the organization details below'
                  : 'Fill in the details to add a new institution'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-medium">Organization Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Indian Institute of Technology, Delhi"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Short Name *</label>
                  <Input
                    value={formData.shortName}
                    onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                    placeholder="e.g., IIT Delhi"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="university">University</option>
                    <option value="college">College</option>
                    <option value="institute">Institute</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Location *</label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="City, State, Country"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email *</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@institution.edu"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone *</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 1234567890"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Website</label>
                  <Input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://www.institution.edu"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="gradient">
                  {editingOrg ? 'Update' : 'Create'} Organization
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Building2}
          label="Total Organizations"
          value={stats.total.toString()}
          subtext="All institutions"
        />
        <StatCard
          icon={CheckCircle}
          label="Active"
          value={stats.active.toString()}
          subtext="Verified institutions"
          iconColor="text-success"
        />
        <StatCard
          icon={AlertCircle}
          label="Pending"
          value={stats.pending.toString()}
          subtext="Awaiting verification"
          iconColor="text-warning"
        />
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats.totalUsers.toLocaleString()}
          subtext="Across all organizations"
          iconColor="text-accent"
        />
      </motion.div>

      {/* Search */}
      <motion.div variants={item} className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search organizations by name, location..."
            className="pl-10"
          />
        </div>
      </motion.div>

      {/* Organizations Grid */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredOrgs.map((org) => (
          <div
            key={org.id}
            className="card-elevated p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{org.name}</h3>
                    {org.verified && (
                      <CheckCircle className="w-4 h-4 text-success" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{org.shortName}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEdit(org)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleVerify(org.id, !org.verified)}
                  >
                    {org.verified ? (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Unverify
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Verify
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDeleteOrganization(org.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Type:</span>
                <Badge variant="outline">
                  {org.type.charAt(0).toUpperCase() + org.type.slice(1)}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Location:</span>
                <span className="text-foreground">{org.location}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={getStatusBadge(org.status)}>
                  {org.status.charAt(0).toUpperCase() + org.status.slice(1)}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{org.totalUsers || 0}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{org.totalStudents || 0}</p>
                <p className="text-xs text-muted-foreground">Students</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{org.totalFaculty || 0}</p>
                <p className="text-xs text-muted-foreground">Faculty</p>
              </div>
            </div>

            {/* Approval Actions for Pending Organizations */}
            {org.status === 'pending' && (
              <div className="flex gap-2 pt-4 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRejectOrganization(org.id)}
                  className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApproveOrganization(org.id)}
                  className="flex-1 bg-success hover:bg-success/90 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </Button>
              </div>
            )}
          </div>
        ))}
      </motion.div>

      {filteredOrgs.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchQuery ? 'No organizations found' : 'No organizations yet'}
          </p>
        </div>
      )}
    </motion.div>
  );
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext: string;
  iconColor?: string;
}

function StatCard({ icon: Icon, label, value, subtext, iconColor = 'text-primary' }: StatCardProps) {
  return (
    <div className="card-elevated p-5">
      <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center ${iconColor} mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
    </div>
  );
}
