import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { subscribeToProjects, addProject, updateProjectStatus, deleteProject } from '../firebase/db/projects';
import type { Project, ProjectStatus } from '../types';
import { Plus, Clock, Loader2, Calendar, MoreVertical, Trash2 } from 'lucide-react';
import { showToast } from '../components/ui/Toast';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  under_review: 'قيد المراجعة',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
  rejected: 'مرفوض',
};

const STATUS_COLORS: Record<ProjectStatus, string> = {
  under_review: '#f59e0b', // Amber
  in_progress: '#3b82f6', // Blue
  completed: '#10b981', // Emerald
  rejected: '#ef4444', // Red
};

export default function Projects() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) {
      navigate('/', { replace: true });
      return;
    }

    const unsub = subscribeToProjects((data) => {
      setProjects(data);
      setLoading(false);
    });

    return () => unsub();
  }, [user, isAdmin, authLoading, navigate]);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim() || !user) return;
    
    setSubmitting(true);
    try {
      await addProject({
        title: newTitle.trim(),
        description: newDesc.trim(),
        status: 'under_review',
        createdBy: user.uid,
        dueDate: newDueDate || undefined
      });
      showToast('تمت إضافة المشروع بنجاح', 'success');
      setShowModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewDueDate('');
    } catch (error) {
      console.error(error);
      showToast('حدث خطأ أثناء إضافة المشروع', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (projectId: string, newStatus: ProjectStatus) => {
    try {
      await updateProjectStatus(projectId, newStatus);
      showToast('تم تحديث حالة المشروع', 'success');
    } catch (error) {
      console.error(error);
      showToast('حدث خطأ أثناء التحديث', 'error');
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المشروع نهائياً؟')) return;
    try {
      await deleteProject(projectId);
      showToast('تم حذف المشروع', 'success');
    } catch (error) {
      console.error(error);
      showToast('فشل حذف المشروع', 'error');
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex-center" style={{ minHeight: '60vh' }}>
        <Loader2 className="animate-spin-fast" size={40} color="var(--accent-blue)" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px', direction: 'rtl' }} className="animate-fade">
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px' }}>المشاريع الحالية</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>متابعة حالة المشاريع وتقدم العمل فيها</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} />
          <span>مشروع جديد</span>
        </button>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="glass-card flex-center" style={{ padding: '60px 20px', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '20px', background: 'rgba(59,130,246,0.1)', borderRadius: '50%', color: 'var(--accent-blue)' }}>
            <Calendar size={48} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>لا توجد مشاريع حالياً</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>قم بإضافة مشروع جديد للبدء بمتابعته</p>
        </div>
      ) : (
        <div className="grid-cards">
          {projects.map((project, idx) => (
            <div key={project.id} className={`glass-card reveal reveal-delay-${(idx % 3) + 1} active`} style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  background: `${STATUS_COLORS[project.status]}20`,
                  color: STATUS_COLORS[project.status],
                  border: `1px solid ${STATUS_COLORS[project.status]}40`
                }}>
                  {STATUS_LABELS[project.status]}
                </span>
                
                {/* Status Actions Dropdown */}
                <div style={{ position: 'relative' }} className="dropdown-container">
                  <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <MoreVertical size={18} />
                  </button>
                  <div className="dropdown-menu glass-card" style={{
                    position: 'absolute', left: 0, top: '100%', minWidth: '160px', zIndex: 10,
                    padding: '8px', display: 'none', flexDirection: 'column', gap: '4px'
                  }}>
                    <button onClick={() => handleStatusChange(project.id, 'under_review')} className="dropdown-item" style={{ background: 'none', border: 'none', color: 'white', textAlign: 'right', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>قيد المراجعة</button>
                    <button onClick={() => handleStatusChange(project.id, 'in_progress')} className="dropdown-item" style={{ background: 'none', border: 'none', color: 'white', textAlign: 'right', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>قيد التنفيذ</button>
                    <button onClick={() => handleStatusChange(project.id, 'completed')} className="dropdown-item" style={{ background: 'none', border: 'none', color: 'white', textAlign: 'right', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>مكتمل</button>
                    <button onClick={() => handleStatusChange(project.id, 'rejected')} className="dropdown-item" style={{ background: 'none', border: 'none', color: 'var(--accent-red)', textAlign: 'right', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>مرفوض</button>
                    <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }}></div>
                    <button onClick={() => handleDelete(project.id)} className="dropdown-item" style={{ background: 'none', border: 'none', color: 'var(--accent-red)', textAlign: 'right', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Trash2 size={14} /> حذف
                    </button>
                  </div>
                </div>
              </div>

              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>{project.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '24px', flexGrow: 1 }}>
                {project.description}
              </p>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} />
                  <span>{new Date(project.createdAt).toLocaleDateString('ar-EG')}</span>
                </div>
                {project.dueDate && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-blue)' }}>
                    <Calendar size={14} />
                    <span>التسليم: {new Date(project.dueDate).toLocaleDateString('ar-EG')}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Project Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div className="glass-card animate-scale" style={{ width: '100%', maxWidth: '500px', padding: '32px' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '24px' }}>إضافة مشروع جديد</h3>
            
            <form onSubmit={handleAddProject} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">عنوان المشروع</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="مثال: تطوير تطبيق الجوال"
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">الوصف التفصيلي</label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '120px', resize: 'vertical' }}
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="أدخل تفاصيل المشروع وأهدافه..."
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">تاريخ التسليم المتوقع (اختياري)</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin-fast" size={20} /> : 'إضافة المشروع'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1 }} disabled={submitting}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .dropdown-container:hover .dropdown-menu {
          display: flex !important;
        }
        .dropdown-item:hover {
          background: rgba(255,255,255,0.05) !important;
        }
      `}</style>
    </div>
  );
}
