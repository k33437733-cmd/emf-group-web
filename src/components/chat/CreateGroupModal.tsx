import { useState, useMemo } from 'react';
import { X, Users, Image, Check, Search } from 'lucide-react';
import type { UserProfile } from '../../types/auth';
import { uploadImageWithCompression } from '../../lib/cloudinary';

interface CreateGroupModalProps {
  allAdmins: UserProfile[];
  onClose: () => void;
  onCreate: (name: string, members: UserProfile[], avatar?: string) => Promise<void>;
}

export default function CreateGroupModal({ allAdmins, onClose, onCreate }: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [avatar, setAvatar] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return allAdmins;
    const q = search.toLowerCase();
    return allAdmins.filter(a => a.name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q));
  }, [allAdmins, search]);

  const toggle = (uid: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  };

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImageWithCompression(file);
      setAvatar(url);
    } catch { /* ignore */ }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!name.trim() || selected.size === 0) return;
    setLoading(true);
    try {
      const members = allAdmins.filter(a => selected.has(a.uid));
      await onCreate(name.trim(), members, avatar ?? undefined);
      onClose();
    } catch { /* handled by parent */ }
    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      direction: 'rtl',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: '420px', maxWidth: '90vw', maxHeight: '85vh',
        background: 'var(--bg-card)', borderRadius: '16px',
        border: '1px solid var(--border-color)', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>إنشاء مجموعة جديدة</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Avatar picker */}
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <label style={{ cursor: 'pointer', position: 'relative' }}>
            <input type="file" accept="image/*" onChange={handleAvatarPick} style={{ display: 'none' }} />
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: avatar ? 'transparent' : 'var(--gradient-cyber)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', border: '2px solid var(--border-color)',
            }}>
              {avatar ? (
                <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : uploading ? (
                <span style={{ fontSize: '0.7rem', color: 'white' }}>...</span>
              ) : (
                <Image size={24} color="white" />
              )}
            </div>
          </label>
          <input
            className="form-input"
            style={{ flex: 1, padding: '10px 14px', fontSize: '0.9rem' }}
            placeholder="اسم المجموعة (مطلوب)"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        {/* Search + member list */}
        <div style={{ padding: '0 20px 8px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', right: '28px', top: '11px', color: 'var(--text-muted)' }} />
          <input
            className="form-input"
            style={{ paddingRight: '34px', paddingLeft: '12px', width: '100%', fontSize: '0.8rem' }}
            placeholder="بحث عن أعضاء..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 16px' }}>
          {filtered.map(admin => {
            const isSelected = selected.has(admin.uid);
            return (
              <div key={admin.uid} onClick={() => toggle(admin.uid)} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 8px', borderRadius: '10px', cursor: 'pointer',
                background: isSelected ? 'rgba(59,130,246,0.08)' : 'transparent',
              }} className="chat-hover">
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(59,130,246,0.15)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
                  fontSize: '0.8rem', color: 'var(--accent-blue)',
                }}>
                  {admin.name?.substring(0, 2) || '؟؟'}
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{admin.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{admin.role}</div>
                </div>
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                  border: '2px solid var(--border-color)',
                  background: isSelected ? 'var(--accent-blue)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: '0.15s',
                }}>
                  {isSelected && <Check size={14} color="white" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-start' }}>
          <button className="btn btn-primary" onClick={handleSubmit}
            disabled={!name.trim() || selected.size === 0 || loading || uploading}
            style={{ padding: '10px 24px', borderRadius: '10px', fontSize: '0.85rem' }}>
            {loading ? 'جاري الإنشاء...' : `إنشاء المجموعة (${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
