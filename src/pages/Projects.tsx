import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { subscribeToProjects, addProject, updateProjectStatus, deleteProject } from '../firebase/db/projects';
import type { Project, ProjectStatus } from '../types';
import { Plus, Clock, Loader2, Calendar, MoreVertical, Trash2, X, FolderKanban } from 'lucide-react';
import { showToast } from '../components/ui/Toast';
import EmptyState from '../components/ui/EmptyState';
import StatusBadge from '../components/ui/StatusBadge';
import { SkeletonGrid } from '../components/ui/Skeleton';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  under_review: 'قيد المراجعة',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
  rejected: 'مرفوض',
};

const STATUS_VARIANT: Record<ProjectStatus, 'warning' | 'info' | 'success' | 'danger'> = {
  under_review: 'warning',
  in_progress: 'info',
  completed: 'success',
  rejected: 'danger',
};

export default function Projects() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) { navigate('/', { replace: true }); return; }
    const unsub = subscribeToProjects((data) => { setProjects(data); setLoading(false); });
    return () => unsub();
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    const handleOutsideClick = () => setActiveDropdownId(null);
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim() || !user) return;
    setSubmitting(true);
    try {
      await addProject({ title: newTitle.trim(), description: newDesc.trim(), status: 'under_review', createdBy: user.uid, dueDate: newDueDate || undefined });
      showToast('تمت إضافة المشروع بنجاح', 'success');
      setShowModal(false);
      setNewTitle(''); setNewDesc(''); setNewDueDate('');
    } catch (error) {
      showToast('حدث خطأ أثناء إضافة المشروع', 'error');
    } finally { setSubmitting(false); }
  };

  const handleStatusChange = async (projectId: string, newStatus: ProjectStatus) => {
    try {
      await updateProjectStatus(projectId, newStatus);
      showToast('تم تحديث حالة المشروع', 'success');
    } catch (error) { showToast('حدث خطأ أثناء التحديث', 'error'); }
  };

  const handleDelete = async (projectId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المشروع نهائياً؟')) return;
    try {
      await deleteProject(projectId);
      showToast('تم حذف المشروع', 'success');
    } catch (error) { showToast('فشل حذف المشروع', 'error'); }
  };

  if (loading || authLoading) {
    return (
      <div className="page-wrapper page-enter" style={{ direction: 'rtl' }}>
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <h1 className="page-title">المشاريع</h1>
          <p className="body-text" style={{ marginTop: 'var(--space-2)' }}>جاري تحميل المشاريع...</p>
        </div>
        <SkeletonGrid count={6} />
      </div>
    );
  }

  return (
    <div className="page-wrapper page-enter" style={{ direction: 'rtl' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-8)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 className="page-title">المشاريع</h1>
          <p className="body-text" style={{ marginTop: 'var(--space-2)' }}>متابعة حالة المشاريع وتقدم العمل فيها</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={16} /> مشروع جديد
        </button>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={48} />}
          title="لا توجد مشاريع حالياً"
          message="قم بإضافة مشروع جديد للبدء بمتابعته وإدارة مراحل تنفيذه."
          action={
            <button onClick={() => setShowModal(true)} className="btn btn-primary">
              <Plus size={16} /> إضافة مشروع
            </button>
          }
        />
      ) : (
        <div className="grid-cards">
          {projects.map(project => (
            <div key={project.id} className="card-base" style={{
              padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', position: 'relative',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                <StatusBadge variant={STATUS_VARIANT[project.status]} label={STATUS_LABELS[project.status]} />
                <div style={{ position: 'relative' }} onClick={(e) => { e.stopPropagation(); setActiveDropdownId(activeDropdownId === project.id ? null : project.id); }}>
                  <button className="btn btn-icon btn-sm btn-ghost" aria-label="قائمة">
                    <MoreVertical size={14} />
                  </button>
                  {activeDropdownId === project.id && (
                    <div className="card-base animate-scale" style={{
                      position: 'absolute', left: 0, top: '36px', minWidth: '170px', zIndex: 100,
                      padding: 'var(--space-1)', display: 'flex', flexDirection: 'column', gap: '2px',
                      boxShadow: 'var(--shadow-elevated)',
                    }}>
                      {(['under_review', 'in_progress', 'completed', 'rejected'] as ProjectStatus[]).map(status => (
                        <button key={status} onClick={() => handleStatusChange(project.id, status)}
                          className="btn btn-ghost btn-sm"
                          style={{ justifyContent: 'flex-start', color: status === 'rejected' ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                          {STATUS_LABELS[status]}
                        </button>
                      ))}
                      <div style={{ height: '1px', background: 'var(--border-color)', margin: 'var(--space-1) 0' }} />
                      <button onClick={() => handleDelete(project.id)}
                        className="btn btn-ghost btn-sm"
                        style={{ justifyContent: 'flex-start', color: 'var(--accent-red)' }}>
                        <Trash2 size={13} /> حذف المشروع
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>{project.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 'var(--lh-relaxed)', marginBottom: 'var(--space-6)', flexGrow: 1 }}>
                {project.description}
              </p>

              {/* Footer */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Clock size={13} />
                  <span>{new Date(project.createdAt).toLocaleDateString('ar-EG')}</span>
                </div>
                {project.dueDate && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--accent-blue)', fontWeight: 600 }}>
                    <Calendar size={13} />
                    <span>{new Date(project.dueDate).toLocaleDateString('ar-EG')}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Project Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content-custom" style={{ maxWidth: '480px' }}>
            <div className="modal-header-custom">
              <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>إضافة مشروع جديد</h3>
              <button onClick={() => setShowModal(false)} className="modal-close-btn" aria-label="إغلاق">
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleAddProject}>
              <div className="modal-body-custom" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                <div>
                  <label className="form-label">عنوان المشروع</label>
                  <input type="text" className="form-input" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="مثال: تطوير تطبيق الجوال" required />
                </div>
                <div>
                  <label className="form-label">الوصف التفصيلي</label>
                  <textarea className="form-input" style={{ minHeight: '110px', resize: 'vertical' }} value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="أدخل تفاصيل المشروع وأهدافه..." required />
                </div>
                <div>
                  <label className="form-label">تاريخ التسليم المتوقع (اختياري)</label>
                  <input type="date" className="form-input" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer-custom">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" disabled={submitting}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin-fast" size={16} /> : 'إضافة المشروع'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}
