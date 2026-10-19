import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Shield,
  Key,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  Edit2,
  LogOut,
  User,
  ExternalLink,
  RefreshCw,
  FileText,
  HelpCircle,
  Menu,
  X,
  Lock,
  ArrowRight,
  Sliders,
  Phone,
  Mail,
  FolderOpen,
  Bell,
  Send,
  Copy,
  Check,
  Info,
  Activity,
  ChevronRight,
  Eye,
  ShieldAlert,
  Sparkles,
  BookOpen,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  AlertOctagon,
  LifeBuoy
} from 'lucide-react';

// ==========================================
// TYPES & INTERFACES
// ==========================================
interface UserProfile {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  lastCheckIn?: string;
  inactivityPeriod?: number;
  createdAt?: string;
}

interface DigitalAsset {
  id?: number | string;
  _id?: string;
  assetName: string;
  assetType: string;
  description?: string;
  website?: string;
  username?: string;
  instructions?: string;
  createdAt: string;
}

interface Beneficiary {
  id?: number | string;
  _id?: string;
  name: string;
  relationship: string;
  email: string;
  phone?: string;
  createdAt: string;
}

interface CheckInStatus {
  status: 'ACTIVE' | 'VERIFICATION_REQUIRED';
  lastCheckIn: string;
  inactivityPeriod: number;
  daysSinceLastCheckIn: number;
  daysRemaining: number;
  requiresVerification: boolean;
  isSimulatedOverdue?: boolean;
  systemNotice?: string;
}

interface EmailDispatchLog {
  id: string;
  timestamp: string;
  to: string;
  subject: string;
  type: string;
  status: string;
  details: string;
  messageId?: string;
  bodyHtml?: string;
}

// ==========================================
// API CONFIGURATION (Dual-Mode Adaptive)
// ==========================================
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.location.port === '5173') {
      return 'http://localhost:5000/api';
    }
  }
  return '/api';
};

const API = axios.create({
  baseURL: getApiBaseUrl()
});

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('digital_estate_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const ASSET_CATEGORIES = [
  'Email Account',
  'Financial / Crypto',
  'Cloud Storage',
  'Social Media',
  'Domain & Hosting',
  'Device / Workstation',
  'Subscription / SaaS',
  'Personal Document / Note',
  'Other'
];

export default function App() {
  // Auth state
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('digital_estate_token'));
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('digital_estate_user');
    return saved ? JSON.parse(saved) : null;
  });

  // App navigation
  const [currentPage, setCurrentPage] = useState<
    'dashboard' | 'assets' | 'beneficiaries' | 'checkin' | 'notifications' | 'viva' | 'profile' | 'review'
  >('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Form states
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authFormData, setAuthFormData] = useState({ name: '', email: '', password: '' });

  // Domain data
  const [assets, setAssets] = useState<DigitalAsset[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus>({
    status: 'ACTIVE',
    lastCheckIn: new Date().toISOString(),
    inactivityPeriod: 30,
    daysSinceLastCheckIn: 0,
    daysRemaining: 30,
    requiresVerification: false
  });

  // Notifications & logs
  const [emailLogs, setEmailLogs] = useState<EmailDispatchLog[]>([]);
  const [testEmailRecipient, setTestEmailRecipient] = useState<string>('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [selectedLogPreview, setSelectedLogPreview] = useState<EmailDispatchLog | null>(null);

  // Modals
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [assetForm, setAssetForm] = useState({
    assetName: '',
    assetType: 'Email Account',
    description: '',
    website: '',
    username: '',
    instructions: ''
  });

  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
  const [editingBeneficiaryId, setEditingBeneficiaryId] = useState<string | null>(null);
  const [beneficiaryForm, setBeneficiaryForm] = useState({
    name: '',
    relationship: 'Primary Beneficiary',
    email: '',
    phone: ''
  });

  // Search & Filter
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [selectedAssetCategory, setSelectedAssetCategory] = useState<string>('All');

  // UI status
  const [feedback, setFeedback] = useState<{ message: string; type: string; details?: string }>({
    message: '',
    type: ''
  });
  const [loading, setLoading] = useState(false);

  // Helper to show toasts
  const showMessage = (message: string, type: 'success' | 'danger' | 'warning' | 'info' = 'success', details?: string) => {
    setFeedback({ message, type, details });
    setTimeout(() => {
      setFeedback({ message: '', type: '' });
    }, 4500);
  };

  // Load user data on auth
  useEffect(() => {
    if (token) {
      loadAllData();
    }
  }, [token]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [assetsRes, beneficiariesRes, checkInRes, profileRes, notifRes] = await Promise.all([
        API.get('/assets').catch(() => ({ data: { assets: [] } })),
        API.get('/beneficiaries').catch(() => ({ data: { beneficiaries: [] } })),
        API.get('/checkin/status').catch(() => ({ data: null })),
        API.get('/auth/profile').catch(() => ({ data: null })),
        API.get('/notifications/status').catch(() => ({ data: { logs: [] } }))
      ]);

      if (assetsRes.data?.assets) setAssets(assetsRes.data.assets);
      if (beneficiariesRes.data?.beneficiaries) setBeneficiaries(beneficiariesRes.data.beneficiaries);
      if (checkInRes.data?.status) setCheckInStatus(checkInRes.data);
      if (notifRes.data?.logs) setEmailLogs(notifRes.data.logs);

      if (profileRes.data?.user) {
        setCurrentUser(profileRes.data.user);
        setTestEmailRecipient(profileRes.data.user.email || '');
      }
    } catch (err) {
      console.error('Data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auth Submit (Strictly Sign In / Create Account)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = authMode === 'register' ? '/auth/register' : '/auth/login';
      const payload =
        authMode === 'register'
          ? authFormData
          : { email: authFormData.email, password: authFormData.password };

      const res = await API.post(endpoint, payload);

      if (res.data?.token) {
        localStorage.setItem('digital_estate_token', res.data.token);
        localStorage.setItem('digital_estate_user', JSON.stringify(res.data.user));
        setToken(res.data.token);
        setCurrentUser(res.data.user);
        setTestEmailRecipient(res.data.user.email || '');
        showMessage(res.data.message || 'Authentication successful!', 'success');
        setCurrentPage('dashboard');
        setAuthFormData({ name: '', email: '', password: '' });
      }
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Authentication failed. Please verify credentials.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('digital_estate_token');
    localStorage.removeItem('digital_estate_user');
    setToken(null);
    setCurrentUser(null);
    setAssets([]);
    setBeneficiaries([]);
    setCurrentPage('dashboard');
    showMessage('Logged out securely', 'info');
  };

  // Check-In Actions
  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const res = await API.post('/checkin');
      showMessage(res.data.message || 'Check-in confirmed! Estate status is ACTIVE.', 'success');
      const statusRes = await API.get('/checkin/status');
      setCheckInStatus(statusRes.data);
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Check-in confirmation failed', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateInactivity = async (simulateOverdue: boolean) => {
    setLoading(true);
    try {
      const res = await API.post('/checkin/simulate', { overdue: simulateOverdue });
      showMessage(res.data.message, simulateOverdue ? 'warning' : 'success');
      const statusRes = await API.get('/checkin/status');
      setCheckInStatus(statusRes.data);
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Simulation toggle failed', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Asset CRUD
  const handleOpenAssetModal = (asset?: DigitalAsset) => {
    if (asset) {
      setEditingAssetId(String(asset._id || asset.id));
      setAssetForm({
        assetName: asset.assetName,
        assetType: asset.assetType,
        description: asset.description || '',
        website: asset.website || '',
        username: asset.username || '',
        instructions: asset.instructions || ''
      });
    } else {
      setEditingAssetId(null);
      setAssetForm({
        assetName: '',
        assetType: 'Email Account',
        description: '',
        website: '',
        username: '',
        instructions: ''
      });
    }
    setShowAssetModal(true);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingAssetId) {
        const res = await API.put(`/assets/${editingAssetId}`, assetForm);
        setAssets((prev) => prev.map((a) => (String(a._id || a.id) === editingAssetId ? res.data.asset : a)));
        showMessage('Asset updated successfully', 'success');
      } else {
        const res = await API.post('/assets', assetForm);
        setAssets((prev) => [res.data.asset, ...prev]);
        showMessage('Digital asset cataloged successfully', 'success');
      }
      setShowAssetModal(false);
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Error saving asset', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAsset = async (id: string | number) => {
    if (!window.confirm('Are you sure you want to delete this digital asset?')) return;
    try {
      await API.delete(`/assets/${id}`);
      setAssets((prev) => prev.filter((a) => String(a._id || a.id) !== String(id)));
      showMessage('Asset removed from vault', 'info');
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Failed to delete asset', 'danger');
    }
  };

  // Beneficiary CRUD
  const handleOpenBeneficiaryModal = (b?: Beneficiary) => {
    if (b) {
      setEditingBeneficiaryId(String(b._id || b.id));
      setBeneficiaryForm({
        name: b.name,
        relationship: b.relationship,
        email: b.email,
        phone: b.phone || ''
      });
    } else {
      setEditingBeneficiaryId(null);
      setBeneficiaryForm({
        name: '',
        relationship: 'Primary Beneficiary',
        email: '',
        phone: ''
      });
    }
    setShowBeneficiaryModal(true);
  };

  const handleSaveBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingBeneficiaryId) {
        const res = await API.put(`/beneficiaries/${editingBeneficiaryId}`, beneficiaryForm);
        setBeneficiaries((prev) => prev.map((b) => (String(b._id || b.id) === editingBeneficiaryId ? res.data.beneficiary : b)));
        showMessage('Beneficiary updated successfully', 'success');
      } else {
        const res = await API.post('/beneficiaries', beneficiaryForm);
        setBeneficiaries((prev) => [res.data.beneficiary, ...prev]);
        showMessage('Beneficiary registered successfully', 'success');
      }
      setShowBeneficiaryModal(false);
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Error saving beneficiary', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBeneficiary = async (id: string | number) => {
    if (!window.confirm('Are you sure you want to remove this designated beneficiary?')) return;
    try {
      await API.delete(`/beneficiaries/${id}`);
      setBeneficiaries((prev) => prev.filter((b) => String(b._id || b.id) !== String(id)));
      showMessage('Beneficiary removed', 'info');
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Failed to delete beneficiary', 'danger');
    }
  };

  // Notification Email Handlers
  const handleSendTestEmail = async () => {
    setSendingEmail(true);
    try {
      const recipientEmail = testEmailRecipient || currentUser?.email || '';
      const res = await API.post('/notifications/test-email', { targetEmail: recipientEmail });
      if (res.data?.logs) setEmailLogs(res.data.logs);
      showMessage(res.data.message || 'Notification test dispatched!', res.data.realEmailSent ? 'success' : 'info');
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Error sending test email', 'danger');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleTriggerEmergencyAlerts = async () => {
    setSendingEmail(true);
    try {
      const res = await API.post('/notifications/trigger-inactivity-alerts', {
        targetEmail: testEmailRecipient,
        userName: currentUser?.name || 'Account Owner'
      });
      if (res.data?.logs) setEmailLogs(res.data.logs);
      showMessage(res.data.message || 'Emergency verification alerts sent!', 'warning');
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Error triggering alerts', 'danger');
    } finally {
      setSendingEmail(false);
    }
  };

  // Profile update
  const handleUpdateProfile = async (name: string, period: number) => {
    setLoading(true);
    try {
      const res = await API.put('/auth/profile', { name, inactivityPeriod: period });
      setCurrentUser(res.data.user);
      localStorage.setItem('digital_estate_user', JSON.stringify(res.data.user));
      showMessage('Profile and check-in window updated!', 'success');
      const statusRes = await API.get('/checkin/status');
      setCheckInStatus(statusRes.data);
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Profile update failed', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Filtered Assets
  const filteredAssets = assets.filter((a) => {
    const matchesSearch =
      a.assetName.toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
      (a.username && a.username.toLowerCase().includes(assetSearchQuery.toLowerCase())) ||
      (a.description && a.description.toLowerCase().includes(assetSearchQuery.toLowerCase()));
    const matchesCategory = selectedAssetCategory === 'All' || a.assetType === selectedAssetCategory;
    return matchesSearch && matchesCategory;
  });

  const isVerificationRequired = checkInStatus.status === 'VERIFICATION_REQUIRED';

  // ==========================================
  // VIEW: AUTHENTICATION (NO DEMO LOGIN, NO DB ICON)
  // ==========================================
  if (!token) {
    return (
      <div className="min-h-screen bg-[#070a0f] text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
        {/* Ambient Emerald Aura Background Accents */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Toast Feedback */}
        {feedback.message && (
          <div
            className={`fixed top-5 right-5 z-50 max-w-md px-5 py-3.5 rounded-2xl shadow-2xl border text-xs sm:text-sm font-semibold flex items-center gap-3 backdrop-blur-xl animate-float-subtle ${feedback.type === 'danger'
                ? 'bg-rose-950/90 text-rose-200 border-rose-700/80'
                : feedback.type === 'warning'
                  ? 'bg-amber-950/90 text-amber-200 border-amber-700/80'
                  : 'bg-emerald-950/90 text-emerald-200 border-emerald-600/80'
              }`}
          >
            {feedback.type === 'danger' ? (
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
            ) : (
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
            )}
            <div>{feedback.message}</div>
          </div>
        )}

        {/* Branding Header */}
        <div className="text-center mb-8 max-w-lg z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-400 text-white shadow-xl glow-indigo mb-4 ring-1 ring-white/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
            Digital Estate <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-teal-300">Planner</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-2 leading-relaxed">
            Securely preserve digital accounts, assign trusted beneficiaries, and maintain periodic verification protocols.
          </p>
        </div>

        {/* Auth Card */}
        <div className="w-full max-w-md glass-card rounded-2xl p-7 border border-white/10 shadow-2xl relative z-10">
          {/* Subtle top indicator bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-400 to-teal-400 rounded-t-2xl"></div>

          {/* Tab Selector */}
          <div className="flex bg-slate-900/80 p-1 rounded-xl mb-6 border border-slate-800">
            <button
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${authMode === 'login'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
                }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthMode('register')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${authMode === 'register'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
                }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Logesh V"
                  value={authFormData.name}
                  onChange={(e) => setAuthFormData({ ...authFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-600 transition"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="vlogesh748@gmail.com"
                value={authFormData.email}
                onChange={(e) => setAuthFormData({ ...authFormData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-600 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={authFormData.password}
                onChange={(e) => setAuthFormData({ ...authFormData, password: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-600 transition"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Bcrypt salted hashing with JWT authentication.</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 neo-button text-white rounded-xl font-semibold text-sm transition shadow-lg flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  {authMode === 'login' ? 'Sign In to Vault' : 'Create Vault Account'}
                  <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </button>
          </form>

          {/* Security Note */}
          <div className="mt-5 p-3 bg-slate-900/50 rounded-xl border border-slate-800 text-xs text-slate-400 leading-relaxed flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              <strong>Zero Plaintext Storage:</strong> Sensitive credentials are never stored. Only metadata and safe handover instructions are maintained.
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-600 mt-6 text-center">
          Digital Estate Planner &bull; Academic Viva Project &bull; Secure Full-Stack Architecture
        </p>
      </div>
    );
  }

  // ==========================================
  // VIEW: MAIN APPLICATION (AUTHENTICATED)
  // ==========================================
  return (
    <div className="min-h-screen bg-[#070a0f] text-slate-100 flex flex-col md:flex-row antialiased selection:bg-emerald-500 selection:text-slate-950">
      {/* Toast Feedback */}
      {feedback.message && (
        <div
          className={`fixed top-5 right-5 z-50 max-w-md px-5 py-3.5 rounded-2xl shadow-2xl border text-xs sm:text-sm font-semibold flex items-start gap-3 backdrop-blur-xl animate-float-subtle ${feedback.type === 'danger'
              ? 'bg-rose-950/95 text-rose-200 border-rose-700/80'
              : feedback.type === 'warning'
                ? 'bg-amber-950/95 text-amber-200 border-amber-700/80'
                : 'bg-emerald-950/95 text-emerald-200 border-emerald-600/80'
            }`}
        >
          {feedback.type === 'danger' ? (
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          ) : feedback.type === 'warning' ? (
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          ) : (
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
          )}
          <div>
            <div>{feedback.message}</div>
            {feedback.details && <div className="text-[11px] font-normal opacity-80 mt-1">{feedback.details}</div>}
          </div>
        </div>
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#0d131f]/95 backdrop-blur-2xl border-r border-slate-800/80 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto flex flex-col justify-between ${mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
          }`}
      >
        <div className="p-5">
          {/* Header Brand */}
          <div className="flex items-center justify-between pb-5 mb-5 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md glow-indigo ring-1 ring-white/20">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-sm tracking-tight text-white font-display leading-tight">Digital Estate</h2>
                <span className="text-[11px] text-indigo-400 font-semibold tracking-wide">Secure Vault</span>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => {
                setCurrentPage('dashboard');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${currentPage === 'dashboard'
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
            >
              <div className="flex items-center gap-3">
                <Layers className={`w-4 h-4 ${currentPage === 'dashboard' ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>Dashboard Overview</span>
              </div>
              {isVerificationRequired && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>}
            </button>

            <button
              onClick={() => {
                setCurrentPage('assets');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${currentPage === 'assets'
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
            >
              <div className="flex items-center gap-3">
                <Key className={`w-4 h-4 ${currentPage === 'assets' ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>Digital Assets Vault</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800/80 text-slate-300 border border-slate-700/60">
                {assets.length}
              </span>
            </button>

            <button
              onClick={() => {
                setCurrentPage('beneficiaries');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${currentPage === 'beneficiaries'
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
            >
              <div className="flex items-center gap-3">
                <Users className={`w-4 h-4 ${currentPage === 'beneficiaries' ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>Designated Beneficiaries</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800/80 text-slate-300 border border-slate-700/60">
                {beneficiaries.length}
              </span>
            </button>

            <button
              onClick={() => {
                setCurrentPage('checkin');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${currentPage === 'checkin'
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
            >
              <div className="flex items-center gap-3">
                <Clock className={`w-4 h-4 ${currentPage === 'checkin' ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>Check-In & Protocol</span>
              </div>
              <span
                className={`w-2 h-2 rounded-full ${isVerificationRequired ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                  }`}
              ></span>
            </button>

            <button
              onClick={() => {
                setCurrentPage('review');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${currentPage === 'review'
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
            >
              <ShieldAlert className={`w-4 h-4 ${currentPage === 'review' ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span>Review Workflow</span>
            </button>

            <button
              onClick={() => {
                setCurrentPage('notifications');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${currentPage === 'notifications'
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
            >
              <div className="flex items-center gap-3">
                <Mail className={`w-4 h-4 ${currentPage === 'notifications' ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>Email & Trigger Alerts</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-800/50">
                LIVE
              </span>
            </button>

            {/* Academic Viva Section */}
            <div className="pt-4 mt-4 border-t border-slate-800/80">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-3.5 block mb-1.5">
                Project Evaluation
              </span>
              <button
                onClick={() => {
                  setCurrentPage('viva');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${currentPage === 'viva'
                    ? 'bg-sky-600/15 text-sky-300 border border-sky-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
              >
                <BookOpen className={`w-4 h-4 ${currentPage === 'viva' ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>Viva Q&A & Architecture</span>
              </button>
            </div>
          </nav>
        </div>

        {/* Sidebar Footer (User info & Sign Out) */}
        <div className="p-6 border-t border-slate-800/80 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold text-white truncate">{currentUser?.name || 'Account Owner'}</p>
              <p className="text-[10px] text-slate-400 truncate">{currentUser?.email || 'user@example.com'}</p>
            </div>
            <button
              onClick={() => setCurrentPage('profile')}
              title="Profile & Inactivity Settings"
              className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg transition"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold text-rose-300 bg-rose-950/30 hover:bg-rose-900/50 border border-rose-900/50 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Secure Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MOBILE BACKDROP */}
      {mobileMenuOpen && (
        <div onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 bg-slate-950/70 z-30 md:hidden backdrop-blur-sm"></div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP BAR */}
        <header className="bg-[#0d131f]/90 backdrop-blur-2xl border-b border-slate-800/80 px-5 py-3.5 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-white capitalize font-display leading-tight">
                {currentPage === 'viva'
                  ? 'Viva Q&A & Architecture Guide'
                  : currentPage === 'checkin'
                    ? 'Check-In Safety Protocol'
                    : currentPage.replace('-', ' ')}
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Digital Legacy Vault &bull; Periodic Safety Verification Protocol
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCheckIn}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 neo-button text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
              title="Confirm you are safe and active right now"
            >
              <CheckCircle className="w-3.5 h-3.5 text-white" />
              <span>Confirm Check-In</span>
            </button>

            <button
              onClick={() => handleSimulateInactivity(!isVerificationRequired)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${isVerificationRequired
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-600/40 hover:bg-emerald-900/40'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-700/80'
                }`}
              title="Viva Test: Simulate elapsed days to test system reactions"
            >
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">
                {isVerificationRequired ? 'Reset Inactivity' : 'Simulate Overdue (>30d)'}
              </span>
            </button>
          </div>
        </header>

        {/* MAIN BODY SCROLLER */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* ======================================================= */}
          {/* 1. DASHBOARD VIEW                                      */}
          {/* ======================================================= */}
          {currentPage === 'dashboard' && (
            <div className="space-y-6">
              {/* Overdue Alert Banner if prolonged inactivity */}
              {isVerificationRequired ? (
                <div className="p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-amber-950/30 shadow-xl relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 bg-amber-500/15 text-amber-400 rounded-xl shrink-0 border border-amber-500/30">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                          SAFETY PROTOCOL TRIGGERED
                        </span>
                        <h3 className="text-sm sm:text-base font-bold text-white mt-1 font-display">
                          Inactivity Threshold Met — Verification Required
                        </h3>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
                          No check-in activity recorded for over {checkInStatus.inactivityPeriod} days.
                          <strong className="text-amber-200"> Realistic Safety Principle:</strong> The system does NOT assume loss of life. Instead, it initiates a human verification review workflow.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleCheckIn}
                        className="px-3.5 py-2 neo-button text-white rounded-xl text-xs font-semibold shadow-sm transition"
                      >
                        Confirm I am Active
                      </button>
                      <button
                        onClick={() => setCurrentPage('review')}
                        className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700/80 transition"
                      >
                        View Protocol
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-200">Estate Status is Active & Safe</span>
                      <span className="text-xs text-slate-400 ml-2 hidden sm:inline">
                        Your check-in is verified. Next routine verification in {checkInStatus.daysRemaining} days.
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleCheckIn}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
                  >
                    Quick Check-In Now &rarr;
                  </button>
                </div>
              )}

              {/* Welcome Card & Estate Progress Bar */}
              <div className="glass-card rounded-2xl p-6 sm:p-7 border border-white/10 relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-5">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                      Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-teal-300">{currentUser?.name || 'Owner'}</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                      Manage your digital legacy. Store account handles, recovery instructions, and designated trustee contacts.
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => handleOpenAssetModal()}
                      className="px-3.5 py-2.5 neo-button text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4 text-white" />
                      <span>Add Digital Asset</span>
                    </button>
                    <button
                      onClick={() => handleOpenBeneficiaryModal()}
                      className="px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700/80 transition flex items-center gap-2"
                    >
                      <Users className="w-4 h-4 text-sky-400" />
                      <span>Add Beneficiary</span>
                    </button>
                  </div>
                </div>

                {/* Progress bar countdown */}
                <div className="pt-5 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Days Elapsed: {checkInStatus.daysSinceLastCheckIn} days</span>
                    </span>
                    <span className="text-slate-400 font-normal">Allowed Inactivity: {checkInStatus.inactivityPeriod} days</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800/80">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${isVerificationRequired
                          ? 'bg-gradient-to-r from-amber-500 to-rose-500 glow-amber'
                          : 'bg-gradient-to-r from-indigo-500 via-sky-400 to-teal-400 glow-indigo'
                        }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (checkInStatus.daysSinceLastCheckIn / (checkInStatus.inactivityPeriod || 30)) * 100
                        )}%`
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 mt-2 font-mono">
                    <span>Last Check-In: {new Date(checkInStatus.lastCheckIn).toLocaleString()}</span>
                    <span className={isVerificationRequired ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                      {isVerificationRequired
                        ? `Overdue by ${checkInStatus.daysSinceLastCheckIn - checkInStatus.inactivityPeriod} days`
                        : `${checkInStatus.daysRemaining} days remaining`}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4 Metric Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div
                  onClick={() => setCurrentPage('assets')}
                  className="glass-card rounded-xl p-4 sm:p-5 border border-white/5 cursor-pointer"
                >
                  <div className="flex items-center justify-between text-slate-400 mb-2.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Digital Assets</span>
                    <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                      <Key className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-white font-display">{assets.length}</div>
                  <p className="text-[11px] text-slate-400 mt-1">Cataloged accounts & keys</p>
                </div>

                <div
                  onClick={() => setCurrentPage('beneficiaries')}
                  className="glass-card rounded-xl p-4 sm:p-5 border border-white/5 cursor-pointer"
                >
                  <div className="flex items-center justify-between text-slate-400 mb-2.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Beneficiaries</span>
                    <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-white font-display">{beneficiaries.length}</div>
                  <p className="text-[11px] text-slate-400 mt-1">Designated heirs & trustees</p>
                </div>

                <div
                  onClick={() => setCurrentPage('checkin')}
                  className="glass-card rounded-xl p-4 sm:p-5 border border-white/5 cursor-pointer"
                >
                  <div className="flex items-center justify-between text-slate-400 mb-2.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Last Check-In</span>
                    <div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg border border-teal-500/20">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-sm sm:text-base font-bold text-white font-display truncate">
                    {checkInStatus.lastCheckIn
                      ? new Date(checkInStatus.lastCheckIn).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })
                      : 'Recorded'}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{checkInStatus.daysSinceLastCheckIn} days elapsed</p>
                </div>

                <div
                  onClick={() => setCurrentPage('checkin')}
                  className="glass-card rounded-xl p-4 sm:p-5 border border-white/5 cursor-pointer"
                >
                  <div className="flex items-center justify-between text-slate-400 mb-2.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status</span>
                    <div
                      className={`p-2 rounded-lg border ${isVerificationRequired
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                    >
                      <Shield className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${isVerificationRequired
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${isVerificationRequired ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
                          }`}
                      ></span>
                      {isVerificationRequired ? 'VERIFICATION' : 'ACTIVE'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{checkInStatus.inactivityPeriod} days threshold</p>
                </div>
              </div>

              {/* Faculty Demonstration Panel */}
              <div className="glass-card rounded-3xl p-6 border border-emerald-500/20 bg-gradient-to-tr from-slate-900/90 to-emerald-950/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white font-display">Faculty & Examiner Demonstration Panel</h4>
                    <p className="text-xs text-slate-400">Quickly demonstrate system reactions during project defense</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={handleSendTestEmail}
                    disabled={sendingEmail}
                    className="p-3.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-left transition-all"
                  >
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>1. Test Trigger Mail</span>
                      <Send className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Sends live Gmail alert to <span className="text-emerald-400 font-medium">{testEmailRecipient || currentUser?.email || 'your registered email'}</span></p>
                  </button>

                  <button
                    onClick={() => handleSimulateInactivity(!isVerificationRequired)}
                    className="p-3.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-left transition-all"
                  >
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>2. Simulate Overdue</span>
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Simulates 45 days elapsed &amp; triggers safety alerts</p>
                  </button>

                  <button
                    onClick={() => setCurrentPage('viva')}
                    className="p-3.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-left transition-all"
                  >
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>3. Viva Guide</span>
                      <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Review architecture &amp; exam answers</p>
                  </button>
                </div>
              </div>

              {/* Two Column Grid: Digital Assets Preview + Beneficiaries Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card rounded-3xl p-6 border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Key className="w-4 h-4 text-emerald-400" />
                      <span>Digital Assets Catalog ({assets.length})</span>
                    </h3>
                    <button
                      onClick={() => setCurrentPage('assets')}
                      className="text-xs text-emerald-400 font-bold hover:underline"
                    >
                      View All &rarr;
                    </button>
                  </div>

                  {assets.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                      <Key className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">No digital assets recorded yet.</p>
                      <button
                        onClick={() => handleOpenAssetModal()}
                        className="mt-3 px-3.5 py-1.5 bg-emerald-500 text-slate-950 rounded-lg text-xs font-bold hover:bg-emerald-400 transition"
                      >
                        Add Your First Asset
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/80">
                      {assets.slice(0, 4).map((a) => (
                        <div key={String(a._id || a.id)} className="py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/20">
                              {a.assetName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">{a.assetName}</p>
                              <p className="text-[11px] text-slate-400">
                                {a.assetType} &bull; {a.username || 'No user specified'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 font-mono">
                            {a.website ? a.website.replace(/^https?:\/\//, '') : 'Vault Entry'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="glass-card rounded-3xl p-6 border border-white/5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-cyan-400" />
                        <span>Beneficiaries ({beneficiaries.length})</span>
                      </h3>
                      <button
                        onClick={() => setCurrentPage('beneficiaries')}
                        className="text-xs text-cyan-400 font-bold hover:underline"
                      >
                        Manage &rarr;
                      </button>
                    </div>

                    {beneficiaries.length === 0 ? (
                      <div className="text-center py-10 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                        <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-xs text-slate-400">No beneficiaries designated.</p>
                        <button
                          onClick={() => handleOpenBeneficiaryModal()}
                          className="mt-3 px-3.5 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition"
                        >
                          Add Beneficiary
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {beneficiaries.slice(0, 3).map((b) => (
                          <div key={String(b._id || b.id)} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/80">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-white">{b.name}</p>
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                {b.relationship}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 truncate">{b.email}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800/80">
                    <button
                      onClick={() => setCurrentPage('notifications')}
                      className="w-full py-2.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                    >
                      <Mail className="w-3.5 h-3.5 text-emerald-400" />
                      <span>View Live Dispatch Logs ({emailLogs.length})</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* 2. DIGITAL ASSETS VAULT VIEW                           */}
          {/* ======================================================= */}
          {currentPage === 'assets' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-white font-display">Digital Assets Vault</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Catalog external accounts, crypto keys, and drives. Record safe recovery handover instructions.
                  </p>
                </div>
                <button
                  onClick={() => handleOpenAssetModal()}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 rounded-xl text-xs font-extrabold shadow-md glow-emerald transition flex items-center gap-2 self-start"
                >
                  <Plus className="w-4 h-4 text-slate-950" />
                  <span>Add New Asset</span>
                </button>
              </div>

              {/* Security Banner */}
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center gap-3">
                <Shield className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>
                  <strong>Safety First:</strong> Never store real raw passwords here. Instead, write recovery instructions (e.g., &quot;Master password is in the home physical vault notebook&quot; or &quot;2FA seed in hardware key&quot;).
                </span>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="Search assets by name, user handle, or description..."
                    value={assetSearchQuery}
                    onChange={(e) => setAssetSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <select
                    value={selectedAssetCategory}
                    onChange={(e) => setSelectedAssetCategory(e.target.value)}
                    className="px-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="All">All Categories ({assets.length})</option>
                    {ASSET_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assets Grid */}
              {filteredAssets.length === 0 ? (
                <div className="glass-card rounded-3xl p-12 text-center border border-white/5">
                  <Key className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-white">No Digital Assets Found</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {assets.length === 0
                      ? 'Start by registering your important accounts such as email, crypto wallets, or domains.'
                      : 'No assets matched your search query.'}
                  </p>
                  <button
                    onClick={() => handleOpenAssetModal()}
                    className="mt-4 px-4 py-2 bg-emerald-500 text-slate-950 text-xs font-bold rounded-xl hover:bg-emerald-400 transition"
                  >
                    Add Asset Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredAssets.map((asset) => (
                    <div
                      key={String(asset._id || asset.id)}
                      className="glass-card rounded-3xl border border-white/5 p-6 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">
                              {asset.assetType}
                            </span>
                            <h4 className="text-base font-bold text-white mt-2 font-display">{asset.assetName}</h4>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenAssetModal(asset)}
                              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                              title="Edit Asset"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAsset(asset._id || asset.id!)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                              title="Delete Asset"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {asset.description && (
                          <p className="text-xs text-slate-400 mb-3 line-clamp-2">{asset.description}</p>
                        )}

                        <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                          {asset.username && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Handle / User:</span>
                              <span className="font-mono text-slate-200">{asset.username}</span>
                            </div>
                          )}
                          {asset.website && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Website:</span>
                              <a
                                href={asset.website.startsWith('http') ? asset.website : `https://${asset.website}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                              >
                                {asset.website.replace(/^https?:\/\//, '')}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </div>

                        {asset.instructions && (
                          <div className="mt-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                            <span className="text-[10px] font-bold uppercase text-emerald-400 block mb-1">
                              Handover Instructions:
                            </span>
                            <p className="text-xs text-slate-300 font-mono whitespace-pre-wrap">{asset.instructions}</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Added: {new Date(asset.createdAt).toLocaleDateString()}</span>
                        <span className="text-emerald-400 font-bold">Encrypted &bull; Safe</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================= */}
          {/* 3. DESIGNATED BENEFICIARIES VIEW                        */}
          {/* ======================================================= */}
          {currentPage === 'beneficiaries' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-white font-display">Designated Beneficiaries</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Designate trusted contacts who will be notified only after prolonged inactivity and verification review.
                  </p>
                </div>
                <button
                  onClick={() => handleOpenBeneficiaryModal()}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 rounded-xl text-xs font-extrabold shadow-md glow-emerald transition flex items-center gap-2 self-start"
                >
                  <Plus className="w-4 h-4 text-slate-950" />
                  <span>Add Beneficiary</span>
                </button>
              </div>

              {beneficiaries.length === 0 ? (
                <div className="glass-card rounded-3xl p-12 text-center border border-white/5">
                  <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-white">No Beneficiaries Added</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Add trusted individuals (family members, attorney, or executor) who should receive your instructions when review is confirmed.
                  </p>
                  <button
                    onClick={() => handleOpenBeneficiaryModal()}
                    className="mt-4 px-4 py-2 bg-emerald-500 text-slate-950 text-xs font-bold rounded-xl hover:bg-emerald-400 transition"
                  >
                    Add Beneficiary Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {beneficiaries.map((b) => (
                    <div
                      key={String(b._id || b.id)}
                      className="glass-card rounded-3xl border border-white/5 p-6 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-sm border border-cyan-500/20">
                              {b.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="text-base font-bold text-white font-display">{b.name}</h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                {b.relationship}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenBeneficiaryModal(b)}
                              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                              title="Edit Beneficiary"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteBeneficiary(b._id || b.id!)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                              title="Delete Beneficiary"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 mt-4 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                            <span className="font-mono text-slate-200">{b.email}</span>
                          </div>
                          {b.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-slate-500" />
                              <span className="font-mono text-slate-200">{b.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Added: {new Date(b.createdAt).toLocaleDateString()}</span>
                        <span className="text-cyan-400 font-bold">Verified Trustee</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================= */}
          {/* 4. SAFETY CHECK-IN & PROTOCOL VIEW                     */}
          {/* ======================================================= */}
          {currentPage === 'checkin' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-extrabold text-white font-display">Safety Check-In & Verification Protocol</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Confirms your active status. When no check-in occurs within the configured inactivity window, verification is required.
                </p>
              </div>

              {/* Status Stepper */}
              <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-4 rounded-2xl border ${isVerificationRequired
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        }`}
                    >
                      {isVerificationRequired ? <AlertTriangle className="w-8 h-8" /> : <CheckCircle className="w-8 h-8" />}
                    </div>
                    <div>
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                        Estate Health Monitor
                      </span>
                      <h3 className="text-2xl font-black text-white mt-1 font-display">
                        {isVerificationRequired ? 'VERIFICATION REQUIRED' : 'ACTIVE STATUS'}
                      </h3>
                      <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                        {checkInStatus.systemNotice ||
                          (isVerificationRequired
                            ? 'Inactivity window has been exceeded. Before any asset instructions are unlocked for secondary review, human verification steps are triggered.'
                            : 'Your check-in is up to date. The system is operating normally.')}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                      onClick={handleCheckIn}
                      disabled={loading}
                      className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 rounded-xl text-xs font-extrabold shadow-lg glow-emerald transition flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4 text-slate-950" />
                      <span>Record Check-In Now</span>
                    </button>
                  </div>
                </div>

                {/* 4-Stage Protocol Stepper */}
                <div className="mt-8">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                    4-Stage Human-in-the-Loop Protocol
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div
                      className={`p-4 rounded-2xl border ${!isVerificationRequired
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-emerald-400">Stage 1</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      </div>
                      <h5 className="text-xs font-bold text-white">Active Monitoring</h5>
                      <p className="text-[11px] text-slate-400 mt-1">Periodic check-in cycle active. Safe and confirmed.</p>
                    </div>

                    <div
                      className={`p-4 rounded-2xl border ${isVerificationRequired
                          ? 'bg-amber-950/40 border-amber-500/50 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-amber-400">Stage 2</span>
                        <Clock className="w-4 h-4 text-amber-400" />
                      </div>
                      <h5 className="text-xs font-bold text-white">Threshold Met</h5>
                      <p className="text-[11px] text-slate-400 mt-1">&gt; 30 days elapsed without check-in confirmation.</p>
                    </div>

                    <div className="p-4 rounded-2xl border bg-slate-900/60 border-slate-800 text-slate-400">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-cyan-400">Stage 3</span>
                        <Mail className="w-4 h-4 text-cyan-400" />
                      </div>
                      <h5 className="text-xs font-bold text-white">Multi-Channel Ping</h5>
                      <p className="text-[11px] text-slate-400 mt-1">Direct alert to owner&apos;s email &amp; SMS with grace period.</p>
                    </div>

                    <div className="p-4 rounded-2xl border bg-slate-900/60 border-slate-800 text-slate-400">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-rose-400">Stage 4</span>
                        <Users className="w-4 h-4 text-rose-400" />
                      </div>
                      <h5 className="text-xs font-bold text-white">Beneficiary Notice</h5>
                      <p className="text-[11px] text-slate-400 mt-1">Trustees contacted for verification before safe handover.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* 5. REVIEW WORKFLOW DOCUMENTATION VIEW                   */}
          {/* ======================================================= */}
          {currentPage === 'review' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-extrabold text-white font-display">Review & Verification Protocol</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Safety architectural implementation: How prolonged inactivity is verified before any digital assets are released.
                </p>
              </div>

              <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/5 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white font-display">Design Principle: Never Assume Loss of Life</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Core ethical and security thesis for project evaluations</p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  A software application running in the cloud cannot definitively verify physical mortality on its own.
                  Assuming death upon simple inactivity can lead to severe security breaches or premature disclosure of private instructions.
                  Therefore, Digital Estate Planner implements a <strong className="text-emerald-400">multi-phase human-in-the-loop review workflow</strong>:
                </p>

                <div className="space-y-4 pt-4 border-t border-slate-800/80">
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Step 1: Inactivity Threshold Met</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Current Date minus Last Check-in timestamp exceeds configured <code className="text-emerald-300">inactivityPeriod</code> (e.g. 30 days).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Step 2: Status Escalated to &quot;VERIFICATION REQUIRED&quot;</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        System issues automated verification pings to user&apos;s verified email and SMS contact channels.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                      3
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Step 3: Secondary Grace Period (e.g. 7 Days)</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        The user is given an explicit grace period to log in or click an authenticated one-time check-in link.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                    <div className="w-8 h-8 rounded-xl bg-teal-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                      4
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Step 4: Designated Beneficiary Notice</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        If grace period expires without confirmation, designated beneficiaries ({beneficiaries.length} on file) are contacted with instructions to begin estate review.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                      5
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Step 5: Regulated Handover</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Beneficiaries gain read-only access strictly to specific designated handover instructions (vault codes, executor letters).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* 6. EMAIL & TRIGGER ALERTS VIEW                         */}
          {/* ======================================================= */}
          {currentPage === 'notifications' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-white font-display">Email &amp; Inactivity Trigger Alerts</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Live Gmail SMTP notification dispatcher &bull; Automated 60-second background inactivity scanner
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTriggerEmergencyAlerts}
                    disabled={sendingEmail}
                    className="px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Fire Inactivity Alerts</span>
                  </button>
                </div>
              </div>

              {/* SMTP Dispatch Console */}
              <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/5 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Mail className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white font-display">Live Gmail SMTP Transporter Active</h3>
                      <p className="text-xs text-slate-400">Sender: agileshlogesh@gmail.com &bull; Port: 587 (TLS)</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Operational
                  </span>
                </div>

                {/* Custom Test Dispatcher */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-white">Send Immediate Test Dispatch</h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="email"
                      placeholder="Enter custom email address to test live delivery..."
                      value={testEmailRecipient}
                      onChange={(e) => setTestEmailRecipient(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      onClick={handleSendTestEmail}
                      disabled={sendingEmail}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 rounded-xl text-xs font-extrabold shadow-md glow-emerald transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {sendingEmail ? <RefreshCw className="w-4 h-4 animate-spin text-slate-950" /> : <Send className="w-4 h-4 text-slate-950" />}
                      <span>Dispatch Test Email</span>
                    </button>
                  </div>
                </div>

                {/* Dispatch History Table */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Live Notification Dispatch Stream ({emailLogs.length})
                    </h4>
                  </div>

                  {emailLogs.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                      <Mail className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">No email dispatches recorded yet.</p>
                      <button
                        onClick={handleSendTestEmail}
                        className="mt-3 px-3.5 py-1.5 bg-emerald-500 text-slate-950 rounded-lg text-xs font-bold hover:bg-emerald-400 transition"
                      >
                        Send First Test Email
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/80 overflow-hidden rounded-2xl border border-slate-800">
                      {emailLogs.map((log) => (
                        <div key={log.id} className="p-4 bg-slate-900/60 hover:bg-slate-800/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${log.type === 'INACTIVITY_WARNING'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : log.type === 'BENEFICIARY_ALERT'
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  }`}
                              >
                                {log.type}
                              </span>
                              <span className="text-xs font-bold text-white truncate max-w-xs">{log.subject}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono">
                              To: {log.to} &bull; {new Date(log.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${log.status === 'DELIVERED_REAL'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                            >
                              {log.status === 'DELIVERED_REAL' ? 'Delivered Live' : 'Recorded'}
                            </span>
                            {log.bodyHtml && (
                              <button
                                onClick={() => setSelectedLogPreview(log)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium border border-slate-700 transition"
                              >
                                View HTML
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* 7. VIVA Q&A & ARCHITECTURE GUIDE VIEW                  */}
          {/* ======================================================= */}
          {currentPage === 'viva' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-extrabold text-white font-display">Academic Viva Q&amp;A &amp; System Architecture</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Comprehensive technical questions and architectural explanations for faculty examination
                </p>
              </div>

              <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/5 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Core Architecture</span>
                    <h4 className="text-sm font-bold text-white">Full-Stack MERN / Dual-Tier Storage</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Unified React 19 + Express + TypeScript platform with cloud MongoDB Atlas and automatic resilient local JSON document fallback.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Notification Engine</span>
                    <h4 className="text-sm font-bold text-white">Verified Gmail SMTP + 60s Scanner</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Automated background scanner monitors inactivity schedules and dispatches verified HTML safety notices to owners and trustees.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-800/80">
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                    Frequently Asked Examination Questions
                  </h3>

                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                    <h5 className="text-xs font-bold text-emerald-300">
                      Q1: What is the core problem solved by Digital Estate Planner?
                    </h5>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Traditional wills handle physical property, but critical digital assets (email accounts, cloud storage, crypto wallets, domains) are often permanently lost upon sudden incapacity. This system provides a secure inventory with regulated handover to designated trustees.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                    <h5 className="text-xs font-bold text-emerald-300">
                      Q2: Why does the system NOT assume loss of life upon inactivity?
                    </h5>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      A web application cannot verify biological mortality. Inactivity could be caused by travel, injury, or lack of internet access. Assuming death could result in catastrophic premature data disclosure. Therefore, a multi-phase human-in-the-loop review workflow is mandated.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                    <h5 className="text-xs font-bold text-emerald-300">
                      Q3: How are sensitive credentials protected (Zero Plaintext Storage)?
                    </h5>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Real external passwords are never accepted or stored. The vault catalogs metadata (account name, category, handle, website) along with human handover instructions (e.g., &quot;Physical 2FA hardware key is in bank locker #412&quot;).
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                    <h5 className="text-xs font-bold text-emerald-300">
                      Q4: How does authentication and session security work?
                    </h5>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      User passwords are salted and hashed using Bcrypt (10 rounds). On successful authentication, a cryptographically signed JSON Web Token (JWT) with a 7-day expiration is issued and transmitted via Bearer headers to protect protected API endpoints.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* 8. PROFILE & SETTINGS VIEW                             */}
          {/* ======================================================= */}
          {currentPage === 'profile' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-extrabold text-white font-display">Profile &amp; Inactivity Settings</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Manage your personal details and adjust the periodic inactivity check-in threshold.
                </p>
              </div>

              <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/5 max-w-2xl space-y-6">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const name = formData.get('name') as string;
                    const period = Number(formData.get('inactivityPeriod'));
                    handleUpdateProfile(name, period);
                  }}
                  className="space-y-5"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Full Name
                    </label>
                    <input
                      name="name"
                      type="text"
                      defaultValue={currentUser?.name || ''}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Registered Email (Read-Only)
                    </label>
                    <input
                      type="email"
                      disabled
                      value={currentUser?.email || ''}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-400 text-xs font-mono cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Inactivity Threshold (Days)
                    </label>
                    <select
                      name="inactivityPeriod"
                      defaultValue={checkInStatus.inactivityPeriod || 30}
                      className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="7">7 Days (Weekly Check-In)</option>
                      <option value="14">14 Days (Bi-Weekly Check-In)</option>
                      <option value="30">30 Days (Standard Monthly Check-In)</option>
                      <option value="60">60 Days (Bi-Monthly Check-In)</option>
                      <option value="90">90 Days (Quarterly Check-In)</option>
                    </select>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      If no check-in is received within this time, status shifts to VERIFICATION REQUIRED.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 rounded-xl text-xs font-extrabold shadow-md glow-emerald transition"
                  >
                    Save Changes
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ======================================================= */}
      {/* MODAL: ADD / EDIT ASSET                                */}
      {/* ======================================================= */}
      {showAssetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-emerald-500/30 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
              <h3 className="text-base font-extrabold text-white font-display">
                {editingAssetId ? 'Edit Digital Asset' : 'Catalog New Digital Asset'}
              </h3>
              <button
                onClick={() => setShowAssetModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Asset Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Primary Gmail Account"
                  value={assetForm.assetName}
                  onChange={(e) => setAssetForm({ ...assetForm, assetName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Asset Category *
                </label>
                <select
                  value={assetForm.assetType}
                  onChange={(e) => setAssetForm({ ...assetForm, assetType: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {ASSET_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Website / Service URL
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://mail.google.com"
                  value={assetForm.website}
                  onChange={(e) => setAssetForm({ ...assetForm, website: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Username / Public Handle
                </label>
                <input
                  type="text"
                  placeholder="e.g. user@gmail.com or @handle"
                  value={assetForm.username}
                  onChange={(e) => setAssetForm({ ...assetForm, username: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Brief note about the importance of this asset"
                  value={assetForm.description}
                  onChange={(e) => setAssetForm({ ...assetForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Handover &amp; Recovery Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Master backup recovery key is in the physical safe #204. Do NOT store raw passwords here."
                  value={assetForm.instructions}
                  onChange={(e) => setAssetForm({ ...assetForm, instructions: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAssetModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 rounded-xl text-xs font-extrabold shadow-md glow-emerald transition"
                >
                  {editingAssetId ? 'Update Asset' : 'Save Asset to Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL: ADD / EDIT BENEFICIARY                          */}
      {/* ======================================================= */}
      {showBeneficiaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-cyan-500/30 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
              <h3 className="text-base font-extrabold text-white font-display">
                {editingBeneficiaryId ? 'Edit Beneficiary' : 'Designate New Beneficiary'}
              </h3>
              <button
                onClick={() => setShowBeneficiaryModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBeneficiary} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. David Mercer"
                  value={beneficiaryForm.name}
                  onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Relationship *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Spouse, Sibling, Legal Executor"
                  value={beneficiaryForm.relationship}
                  onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, relationship: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="beneficiary@example.com"
                  value={beneficiaryForm.email}
                  onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={beneficiaryForm.phone}
                  onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBeneficiaryModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 rounded-xl text-xs font-extrabold shadow-md glow-cyan transition"
                >
                  {editingBeneficiaryId ? 'Update Beneficiary' : 'Confirm Designation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL: EMAIL HTML PREVIEW                               */}
      {/* ======================================================= */}
      {selectedLogPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-white font-display">HTML Email Dispatch Preview</h3>
                <p className="text-xs text-slate-400 font-mono">
                  To: {selectedLogPreview.to} &bull; {selectedLogPreview.subject}
                </p>
              </div>
              <button
                onClick={() => setSelectedLogPreview(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div
              className="p-4 rounded-2xl bg-white text-slate-900 overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: selectedLogPreview.bodyHtml || '<p>No HTML body</p>' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
