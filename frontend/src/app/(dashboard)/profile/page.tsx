'use client';
import { useEffect, useState } from 'react';
import { usersApi, kycApi } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { User, KycDocument } from '../../types';
import { getErrorMessage, formatDate, getStatusBadge, getInitials } from '../../lib/utils';
import toast from 'react-hot-toast';
import { User as UserIcon, Shield, Lock, Upload, CheckCircle, Clock, XCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

type Tab = 'personal' | 'kyc' | 'security';

export default function ProfilePage() {
  const { user: authUser, setUser } = useAuthStore();
  const [tab, setTab] = useState<Tab>('personal');
  const [profile, setProfile] = useState<User | null>(null);
  const [kyc, setKyc] = useState<KycDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profileForm, setProfileForm] = useState({
    firstName: '', lastName: '', phone: '', address: '', city: '', country: '', dateOfBirth: ''
  });
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });
  const [kycForm, setKycForm] = useState({ documentType: 'PASSPORT', documentNumber: '' });
  const [kycFiles, setKycFiles] = useState<{ front?: File; back?: File; selfie?: File }>({});
  const setP = (k: string) => (e: any) => setProfileForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    const load = async () => {
      try {
        const [profRes, kycRes] = await Promise.all([usersApi.getProfile(), kycApi.getStatus()]);
        const p = profRes.data.data;
        setProfile(p);
        setKyc(kycRes.data.data);
        setProfileForm({
          firstName: p.firstName || '', lastName: p.lastName || '',
          phone: p.phone || '', address: p.address || '',
          city: p.city || '', country: p.country || '',
          dateOfBirth: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : '',
        });
      } catch { toast.error('Failed to load profile'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await usersApi.updateProfile(profileForm);
      setProfile(p => p ? { ...p, ...res.data.data } : null);
      setUser({ ...authUser!, ...res.data.data });
      toast.success('Profile updated successfully');
    } catch (e: any) { toast.error(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (passForm.newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      await usersApi.changePassword({ currentPassword: passForm.currentPassword, newPassword: passForm.newPassword });
      toast.success('Password changed. Please log in again.');
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e: any) { toast.error(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  const submitKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycForm.documentNumber) { toast.error('Document number required'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('documentType', kycForm.documentType);
      fd.append('documentNumber', kycForm.documentNumber);
      if (kycFiles.front) fd.append('frontImage', kycFiles.front);
      if (kycFiles.back) fd.append('backImage', kycFiles.back);
      if (kycFiles.selfie) fd.append('selfie', kycFiles.selfie);
      const res = await kycApi.submit(fd);
      setKyc(res.data.data);
      toast.success('KYC submitted for review!');
    } catch (e: any) { toast.error(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await usersApi.uploadAvatar(file);
      setUser({ ...authUser!, avatar: res.data.data.avatar });
      toast.success('Avatar updated');
    } catch (e: any) { toast.error(getErrorMessage(e)); }
  };

  const KycStatusBanner = () => {
    if (!kyc) return null;
    const configs = {
      NOT_SUBMITTED: { icon: AlertCircle, color: 'bg-slate-50 border-slate-200 text-slate-700', iconColor: 'text-slate-400', msg: 'Submit identity documents to unlock full account features.' },
      PENDING: { icon: Clock, color: 'bg-amber-50 border-amber-200 text-amber-800', iconColor: 'text-amber-500', msg: 'Your documents are under review. This usually takes 24-48 hours.' },
      APPROVED: { icon: CheckCircle, color: 'bg-emerald-50 border-emerald-200 text-emerald-800', iconColor: 'text-emerald-500', msg: 'Identity verified. You have full account access.' },
      REJECTED: { icon: XCircle, color: 'bg-red-50 border-red-200 text-red-800', iconColor: 'text-red-500', msg: `Verification rejected. ${kyc.rejectionReason || 'Please resubmit your documents.'}` },
    };
    const cfg = configs[kyc.status];
    const Icon = cfg.icon;
    return (
      <div className={`flex items-start gap-3 p-4 rounded-xl border ${cfg.color} mb-5`}>
        <Icon size={18} className={`${cfg.iconColor} flex-shrink-0 mt-0.5`} />
        <div>
          <p className="font-semibold text-sm">KYC Status: <span className={`badge ${getStatusBadge(kyc.status)} ml-1`}>{kyc.status.replace('_', ' ')}</span></p>
          <p className="text-sm mt-0.5 opacity-80">{cfg.msg}</p>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="max-w-2xl space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="card animate-pulse h-20 bg-slate-100" />)}
    </div>
  );

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'personal', label: 'Personal Info', icon: UserIcon },
    { id: 'kyc', label: 'Verification', icon: Shield },
    { id: 'security', label: 'Security', icon: Lock },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      {/* Profile header */}
      <div className="card flex items-center gap-5">
        <div className="relative group">
          <div className="w-20 h-20 rounded-2xl bg-navy-900 flex items-center justify-center text-gold-400 font-bold text-2xl font-display overflow-hidden">
            {authUser?.avatar ? (
              <img src={authUser.avatar} alt="" className="w-full h-full object-cover" />
            ) : getInitials(profile?.firstName || '', profile?.lastName || '')}
          </div>
          <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <Upload size={18} className="text-white" />
            <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
          </label>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-bold text-navy-900 text-xl">{profile?.firstName} {profile?.lastName}</h2>
          <p className="text-slate-500 text-sm">{profile?.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`badge ${getStatusBadge(profile?.status || 'ACTIVE')} text-xs`}>{profile?.status}</span>
            <span className={`badge ${getStatusBadge(profile?.role || 'USER')} text-xs`}>{profile?.role}</span>
            {profile?.emailVerified && <span className="badge badge-green text-xs">✓ Verified</span>}
          </div>
        </div>
        {profile?.createdAt && (
          <p className="text-xs text-slate-400 flex-shrink-0">Member since<br />{formatDate(profile.createdAt)}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === id ? 'bg-navy-900 text-white shadow-md' : 'text-slate-500 hover:text-navy-700 hover:bg-slate-50'
            }`}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* PERSONAL INFO */}
      {tab === 'personal' && (
        <div className="card">
          <h3 className="font-display font-semibold text-navy-900 mb-5">Personal Information</h3>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">First name</label><input className="input" value={profileForm.firstName} onChange={setP('firstName')} /></div>
              <div><label className="label">Last name</label><input className="input" value={profileForm.lastName} onChange={setP('lastName')} /></div>
            </div>
            <div><label className="label">Email address</label>
              <input className="input bg-slate-50 text-slate-500 cursor-not-allowed" value={profile?.email || ''} disabled /></div>
            <div><label className="label">Phone number</label>
              <input className="input" type="tel" placeholder="+1 (555) 000-0000" value={profileForm.phone} onChange={setP('phone')} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Date of birth</label>
                <input className="input" type="date" value={profileForm.dateOfBirth} onChange={setP('dateOfBirth')} /></div>
              <div><label className="label">Country</label>
                <select className="input" value={profileForm.country} onChange={setP('country')}>
                  {['US','GB','CA','AU','DE','FR','NG','ZA','IN','SG'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div><label className="label">Street address</label>
              <input className="input" placeholder="123 Main St" value={profileForm.address} onChange={setP('address')} /></div>
            <div><label className="label">City</label>
              <input className="input" placeholder="New York" value={profileForm.city} onChange={setP('city')} /></div>
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={saving} className="btn-primary px-8">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* KYC */}
      {tab === 'kyc' && (
        <div className="card">
          <h3 className="font-display font-semibold text-navy-900 mb-5">Identity Verification</h3>
          <KycStatusBanner />
          {(kyc?.status === 'NOT_SUBMITTED' || kyc?.status === 'REJECTED') && (
            <form onSubmit={submitKyc} className="space-y-4">
              <div>
                <label className="label">Document type</label>
                <select className="input" value={kycForm.documentType} onChange={e => setKycForm(f => ({ ...f, documentType: e.target.value }))}>
                  <option value="PASSPORT">Passport</option>
                  <option value="DRIVERS_LICENSE">Driver's License</option>
                  <option value="NATIONAL_ID">National ID Card</option>
                </select>
              </div>
              <div>
                <label className="label">Document number</label>
                <input className="input" placeholder="e.g. P12345678" value={kycForm.documentNumber}
                  onChange={e => setKycForm(f => ({ ...f, documentNumber: e.target.value }))} />
              </div>
              {[
                { key: 'front', label: 'Front of document', hint: 'Clear photo of the front side' },
                { key: 'back', label: 'Back of document', hint: 'Clear photo of the back side' },
                { key: 'selfie', label: 'Selfie with document', hint: 'Hold document next to your face' },
              ].map(({ key, label, hint }) => (
                <div key={key}>
                  <label className="label">{label} <span className="text-slate-400 normal-case font-normal">(optional for demo)</span></label>
                  <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer
                    ${kycFiles[key as keyof typeof kycFiles] ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-navy-300'}`}>
                    <input type="file" accept="image/*,.pdf" className="hidden" id={`kyc-${key}`}
                      onChange={e => setKycFiles(f => ({ ...f, [key]: e.target.files?.[0] }))} />
                    <label htmlFor={`kyc-${key}`} className="cursor-pointer">
                      {kycFiles[key as keyof typeof kycFiles] ? (
                        <p className="text-sm text-emerald-700 font-medium">
                          ✓ {(kycFiles[key as keyof typeof kycFiles] as File).name}
                        </p>
                      ) : (
                        <>
                          <Upload size={20} className="text-slate-300 mx-auto mb-1.5" />
                          <p className="text-sm text-slate-500">{hint}</p>
                          <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, or PDF up to 5MB</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              ))}
              <button type="submit" disabled={saving} className="btn-primary w-full py-3">
                {saving ? 'Submitting…' : 'Submit for Verification →'}
              </button>
            </form>
          )}
          {kyc?.status === 'APPROVED' && (
            <div className="text-center py-8">
              <CheckCircle size={48} className="text-emerald-500 mx-auto mb-3" />
              <h4 className="font-display font-bold text-navy-900 text-lg">Identity Verified</h4>
              <p className="text-slate-500 text-sm mt-1">
                Reviewed on {kyc.reviewedAt ? formatDate(kyc.reviewedAt) : '—'}
              </p>
            </div>
          )}
          {kyc?.status === 'PENDING' && (
            <div className="text-center py-8">
              <Clock size={48} className="text-amber-500 mx-auto mb-3" />
              <h4 className="font-display font-bold text-navy-900 text-lg">Under Review</h4>
              <p className="text-slate-500 text-sm mt-1">
                Submitted {kyc.submittedAt ? formatDate(kyc.submittedAt) : '—'}. We'll notify you shortly.
              </p>
            </div>
          )}
        </div>
      )}

      {/* SECURITY */}
      {tab === 'security' && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-display font-semibold text-navy-900 mb-5">Change Password</h3>
            <form onSubmit={changePassword} className="space-y-4">
              {[
                { key: 'currentPassword', label: 'Current password', show: showPass.current, toggle: () => setShowPass(s => ({ ...s, current: !s.current })) },
                { key: 'newPassword', label: 'New password', show: showPass.new, toggle: () => setShowPass(s => ({ ...s, new: !s.new })) },
                { key: 'confirmPassword', label: 'Confirm new password', show: showPass.confirm, toggle: () => setShowPass(s => ({ ...s, confirm: !s.confirm })) },
              ].map(({ key, label, show, toggle }) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <div className="relative">
                    <input type={show ? 'text' : 'password'} className="input pr-11"
                      placeholder="••••••••"
                      value={passForm[key as keyof typeof passForm]}
                      onChange={e => setPassForm(f => ({ ...f, [key]: e.target.value }))} />
                    <button type="button" onClick={toggle}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              ))}
              <button type="submit" disabled={saving} className="btn-primary w-full py-3">
                {saving ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </div>
          <div className="card">
            <h3 className="font-display font-semibold text-navy-900 mb-4">Security Info</h3>
            <div className="space-y-3">
              {[
                { label: 'Last login', value: profile?.lastLoginAt ? formatDate(profile.lastLoginAt, 'MMM d, yyyy h:mm a') : 'N/A' },
                { label: 'Email verified', value: profile?.emailVerified ? '✓ Verified' : '✗ Not verified' },
                { label: '2FA', value: 'Not enabled' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="text-sm font-medium text-navy-900">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
