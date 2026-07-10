import { useState, useRef } from 'react';
import { X, Camera, UserMinus, Save } from 'lucide-react';
import type { Conversation, UserProfile } from '../../types';
import { uploadImageWithCompression } from '../../lib/cloudinary';

interface GroupSettingsProps {
  conv: Conversation;
  allAdmins: UserProfile[];
  currentUid: string;
  onClose: () => void;
  onUpdate: (updates: { name?: string; avatar?: string }) => Promise<void>;
  onRemoveMember: (uid: string) => Promise<void>;
  onAddMembers: (members: UserProfile[]) => Promise<void>;
}

export default function GroupSettings({
  conv, allAdmins, currentUid, onClose,
  onUpdate, onRemoveMember, onAddMembers,
}: GroupSettingsProps) {
  const [name, setName] = useState(conv.groupName || '');
  const [avatar, setAvatar] = useState(conv.avatar || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const members = (conv.members ?? []).map(uid => ({
    uid,
    name: conv.memberNames?.[uid] || uid,
    role: conv.memberRoles?.[uid] || '',
    isSelf: uid === currentUid,
  }));

  const nonMembers = allAdmins.filter(a => !conv.members?.includes(a.uid));

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImageWithCompression(file);
      setAvatar(url);
      await onUpdate({ avatar: url });
    } catch { /* ignore */ }
    setUploading(false);
  };

  const handleSaveName = async () => {
    if (!name.trim() || name === (conv.groupName || '')) return;
    setSaving(true);
    try {
      await onUpdate({ name: name.trim() });
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleRemove = async (uid: string) => {
    if (uid === currentUid) return;
    await onRemoveMember(uid);
  };

  const handleAdd = async (admin: UserProfile) => {
    await onAddMembers([admin]);
    setShowAdd(false);
    setAddSearch('');
  };

  const filteredNonMembers = nonMembers.filter(a =>
    !addSearch.trim() || a.name?.toLowerCase().includes(addSearch.toLowerCase())
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      direction: 'rtl',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: '440px', maxWidth: '90vw', maxHeight: '85vh',
        background: 'var(--bg-card)', borderRadius: '16px',
        border: '1px solid var(--border-color)', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>إعدادات المجموعة</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
              <div style={{
                width: '96px', height: '96px', borderRadius: '50%',
                background: avatar ? 'transparent' : 'var(--gradient-cyber)',
                overflow: 'hidden', border: '3px solid var(--border-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {avatar ? (
                  <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Camera size={32} color="white" />
                )}
              </div>
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                background: 'var(--accent-blue)', borderRadius: '50%',
                width: '32px', height: '32px', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                border: '3px solid var(--bg-card)',
              }}>
                <Camera size={14} color="white" />
              </div>
            </div>
            {uploading && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>جاري الرفع...</span>}
          </div>

          {/* Group name */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', textAlign: 'right' }}>
              اسم المجموعة
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="form-input"
                style={{ flex: 1, padding: '10px 14px', fontSize: '0.9rem' }}
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <button className="btn btn-primary" onClick={handleSaveName}
                disabled={!name.trim() || name === (conv.groupName || '') || saving}
                style={{ padding: '10px 16px', borderRadius: '10px', whiteSpace: 'nowrap' }}>
                {saving ? '...' : <Save size={16} />}
              </button>
            </div>
          </div>

          {/* Members */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {members.length} أعضاء
              </span>
              <button className="btn btn-secondary" onClick={() => setShowAdd(s => !s)}
                style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem' }}>
                + إضافة
              </button>
            </div>

            {/* Add members panel */}
            {showAdd && (
              <div style={{ marginBottom: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                <input
                  className="form-input"
                  placeholder="بحث..."
                  value={addSearch}
                  onChange={e => setAddSearch(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.8rem', marginBottom: '8px' }}
                />
                <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                  {filteredNonMembers.map(admin => (
                    <div key={admin.uid} onClick={() => handleAdd(admin)} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px', borderRadius: '8px', cursor: 'pointer',
                    }} className="chat-hover">
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'rgba(59,130,246,0.15)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--accent-blue)',
                      }}>{admin.name?.substring(0, 2) || '؟'}</div>
                      <span style={{ fontSize: '0.8rem' }}>{admin.name}</span>
                    </div>
                  ))}
                  {filteredNonMembers.length === 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>
                      لا يوجد مشرفين جدد
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Member list */}
            {members.map(m => (
              <div key={m.uid} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 8px', borderRadius: '10px',
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(59,130,246,0.1)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
                  fontSize: '0.85rem', color: 'var(--accent-blue)',
                }}>
                  {m.name.substring(0, 2)}
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {m.name} {m.isSelf && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(أنت)</span>}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.role}</div>
                </div>
                {!m.isSelf && (
                  <button onClick={() => handleRemove(m.uid)} style={{
                    background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px',
                  }} title="إزالة">
                    <UserMinus size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
