import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { subscribeToProjects, addProject, updateProjectStatus, deleteProject } from '../firebase/db/projects';
import type { Project, ProjectStatus } from '../types';
import { Plus, Clock, Loader2, Calendar, MoreVertical, Trash2, CheckCircle2, AlertCircle, PlayCircle, XCircle, X } from 'lucide-react';
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

const STATUS_ICONS: Record<ProjectStatus, any> = {
  under_review: AlertCircle,
  in_progress: PlayCircle,
  completed: CheckCircle2,
  rejected: XCircle,
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
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

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

  // Click outside to close dropdowns
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveDropdownId(null);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

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
        <Loader2 className="animate-spin-fast" size={32} color="var(--accent-blue)" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '16px 8px', direction: 'rtl' }} className="animate-fade">
      
      {/* Page Title & Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '36px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', marginBottom: '6px' }}>المشاريع الحالية</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>متابعة حالة المشاريع وتقدم العمل فيها</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ height: '40px', borderRadius: '10px' }}>
          <Plus size={16} />
          <span>مشروع جديد</span>
        </button>
      </div>

      {/* Projects Cards Grid */}
      {projects.length === 0 ? (
        <div className="glass-card flex-center" style={{ padding: '60px 20px', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '20px', background: 'rgba(59,130,246,0.06)', borderRadius: '50%', color: 'var(--accent-blue)' }}>
            <Calendar size={40} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>لا توجد مشاريع حالياً</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>قم بإضافة مشروع جديد للبدء بمتابعته</p>
        </div>
      ) : (
        <div className="grid-cards">
          {projects.map((project, idx) => {
            const StatusIcon = STATUS_ICONS[project.status];
            const statusColor = STATUS_COLORS[project.status];

            return (
              <div 
                key={project.id} 
                className={`glass-card reveal reveal-delay-${(idx % 3) + 1} active`} 
                style={{ 
                  padding: '24px', 
                  display: 'flex', 
                  flexDirection: 'column',
                  position: 'relative',
                  borderTop: `3px solid ${statusColor}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  {/* Status Badge */}
                  <span style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    background: `${statusColor}15`,
                    color: statusColor,
                    border: `1px solid ${statusColor}30`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <StatusIcon size={12} />
                    <span>{STATUS_LABELS[project.status]}</span>
                  </span>
                  
                  {/* Status Actions Dropdown */}
                  <div 
                    style={{ position: 'relative' }} 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdownId(activeDropdownId === project.id ? null : project.id);
                    }}
                  >
                    <button 
                      style={{ 
                        background: 'rgba(255,255,255,0.03)', 
                        border: '1px solid var(--border-color)', 
                        color: 'var(--text-secondary)', 
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '8px',
                        display: 'flex'
                      }}
                      className="project-menu-btn"
                    >
                      <MoreVertical size={14} />
                    </button>

                    {activeDropdownId === project.id && (
                      <div 
                        className="dropdown-menu glass-card animate-scale" 
                        style={{
                          position: 'absolute', 
                          left: 0, 
                          top: '32px', 
                          minWidth: '160px', 
                          zIndex: 100,
                          padding: '6px', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '2px',
                          background: '#0d1325',
                          border: '1px solid var(--border-color)',
                          boxShadow: 'var(--shadow-lg)'
                        }}
                      >
                        <button onClick={() => handleStatusChange(project.id, 'under_review')} className="project-dropdown-item">قيد المراجعة</button>
                        <button onClick={() => handleStatusChange(project.id, 'in_progress')} className="project-dropdown-item">قيد التنفيذ</button>
                        <button onClick={() => handleStatusChange(project.id, 'completed')} className="project-dropdown-item">مكتمل</button>
                        <button onClick={() => handleStatusChange(project.id, 'rejected')} className="project-dropdown-item text-danger">مرفوض</button>
                        <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
                        <button 
                          onClick={() => handleDelete(project.id)} 
                          className="project-dropdown-item text-danger" 
                          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Trash2 size={12} /> 
                          <span>حذف المشروع</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <h3 style={{ fontSize: '1.08rem', fontWeight: 700, marginBottom: '8px', color: 'white' }}>{project.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.6, marginBottom: '24px', flexGrow: 1 }}>
                  {project.description}
                </p>

                {/* Footer specs */}
                <div 
                  style={{ 
                    borderTop: '1px solid var(--border-color)', 
                    paddingTop: '16px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    fontSize: '0.74rem', 
                    color: 'var(--text-muted)' 
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={12} />
                    <span>بدأ: {new Date(project.createdAt).toLocaleDateString('ar-EG')}</span>
                  </div>
                  {project.dueDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-blue)', fontWeight: 600 }}>
                      <Calendar size={12} />
                      <span>تسليم: {new Date(project.dueDate).toLocaleDateString('ar-EG')}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Project Modal Popup */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5,8,16,0.7)', backdropFilter: 'blur(5px)',
          WebkitBackdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div 
            className="glass-card animate-scale" 
            style={{ 
              width: '100%', 
              maxWidth: '480px', 
              padding: '32px',
              position: 'relative'
            }}
          >
            <button 
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                color: 'white',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={14} />
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '24px', color: 'white' }}>إضافة مشروع جديد</h3>
            
            <form onSubmit={handleAddProject} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="form-group">
                <label className="form-label">عنوان المشروع</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ background: 'rgba(0,0,0,0.15)' }}
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
                  style={{ minHeight: '110px', resize: 'vertical', background: 'rgba(0,0,0,0.15)' }}
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
                  style={{ background: 'rgba(0,0,0,0.15)' }}
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '40px' }} disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin-fast" size={16} /> : 'إضافة المشروع'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1, height: '40px' }} disabled={submitting}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .project-menu-btn:hover {
          background: rgba(255,255,255,0.08) !important;
          color: white !important;
        }
        .project-dropdown-item {
          background: none; 
          border: none; 
          color: var(--text-secondary); 
          text-align: right; 
          padding: 8px 12px; 
          border-radius: 8px; 
          cursor: pointer; 
          font-size: 0.82rem;
          transition: all 0.15s ease;
        }
        .project-dropdown-item:hover {
          background: rgba(255,255,255,0.03) !important;
          color: white !important;
        }
        .project-dropdown-item.text-danger:hover {
          background: rgba(239,68,68,0.08) !important;
          color: #f87171 !important;
        }
      `}</style>
    </div>
  );
}
