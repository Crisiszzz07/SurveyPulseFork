import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getUsers, updateUser, deleteUser, createUser } from '../api/users';
import { getCompanies } from '../api/companies';
import { useAuth } from '../hooks/useAuth';
import {
  Search, Filter, ChevronLeft, ChevronRight, RefreshCw,
  Edit2, Trash2, X, Check, User, Building2, Shield,
  ChevronDown, AlertTriangle, Users
} from 'lucide-react';

/* ─── Helpers ─────────────────────────────────────────────────── */
const ROLES = ['ADMIN', 'COMPANY_ADMIN', 'EVALUATOR'];
const ESTADOS = ['ACTIVO', 'INACTIVO'];

const roleMeta = {
  ADMIN:         { label: 'Admin Global',      color: '#a855f7' },
  COMPANY_ADMIN: { label: 'Admin Empresa',     color: '#3b82f6' },
  EVALUATOR:     { label: 'Evaluador',         color: '#10b981' },
};

const estadoMeta = {
  ACTIVO:   { label: 'Activo',   color: '#10b981' },
  INACTIVO: { label: 'Inactivo', color: '#ef4444' },
};

function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ─── Sub-components ──────────────────────────────────────────── */

function RoleBadge({ rol }) {
  const meta = roleMeta[rol] || { label: rol, color: '#6b7280' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem',
      fontWeight: 600, letterSpacing: '0.03em',
      backgroundColor: meta.color + '22', color: meta.color,
      border: `1px solid ${meta.color}44`
    }}>
      <Shield size={11} />{meta.label}
    </span>
  );
}

function EstadoBadge({ estado }) {
  const meta = estadoMeta[estado] || { label: estado, color: '#6b7280' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem',
      fontWeight: 600,
      backgroundColor: meta.color + '22', color: meta.color,
      border: `1px solid ${meta.color}44`
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        backgroundColor: meta.color, display: 'inline-block'
      }} />
      {meta.label}
    </span>
  );
}

function Avatar({ nombre, apellido }) {
  const initials = `${(nombre || '?')[0]}${(apellido || '')[0] || ''}`.toUpperCase();
  const colors = ['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
  const color = colors[(nombre?.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{
      width: 38, height: 38, borderRadius: '50%',
      backgroundColor: color + '33', border: `2px solid ${color}66`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: color, fontWeight: 700, fontSize: '0.85rem', flexShrink: 0
    }}>
      {initials}
    </div>
  );
}

/* ─── Edit Modal ──────────────────────────────────────────────── */
function EditModal({ user: u, companies, onSave, onClose }) {
  const [form, setForm] = useState({
    nombre:     u.nombre || '',
    apellido:   u.apellido || '',
    rol:        u.rol || 'EVALUATOR',
    estado:     u.estado || 'ACTIVO',
    empresa_id: u.empresa_id || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await onSave(u.id, form);
    if (!res.success) setError(res.error || 'Error al guardar');
    setSaving(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '1rem', width: '100%', maxWidth: '480px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(59,130,246,0.06))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Avatar nombre={form.nombre} apellido={form.apellido} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Editar Usuario
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email}</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: '4px', borderRadius: '6px'
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="form-input" value={form.nombre}
                onChange={e => set('nombre', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Apellido</label>
              <input className="form-input" value={form.apellido}
                onChange={e => set('apellido', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Rol</label>
            <select className="form-select" value={form.rol} onChange={e => set('rol', e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{roleMeta[r]?.label || r}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Empresa</label>
            <select className="form-select" value={form.empresa_id} onChange={e => set('empresa_id', e.target.value)}>
              <option value="">— Sin empresa —</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.nombre_empresa}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Estado</label>
            <select className="form-select" value={form.estado} onChange={e => set('estado', e.target.value)}>
              {ESTADOS.map(s => <option key={s} value={s}>{estadoMeta[s]?.label || s}</option>)}
            </select>
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px', padding: '0.6rem 1rem',
              color: '#ef4444', fontSize: '0.82rem'
            }}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
              {saving ? 'Guardando…' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Create User Modal ────────────────────────────────────────── */
function CreateUserModal({ companies, onSave, onClose, authUser }) {
  const isAdmin        = authUser?.role === 'ADMIN';
  const isCompanyAdmin = authUser?.role === 'COMPANY_ADMIN';
  
  const [form, setForm] = useState({
    nombre:     '',
    apellido:   '',
    email:      '',
    password:   '',
    rol:        'EVALUATOR',
    estado:     'ACTIVO',
    empresa_id: isCompanyAdmin ? (authUser.empresa_id || '') : '',
  });
  
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.nombre.trim()) errs.nombre = 'El nombre es obligatorio.';
    if (!form.apellido.trim()) errs.apellido = 'El apellido es obligatorio.';
    if (!form.email.trim()) {
      errs.email = 'El correo electrónico es obligatorio.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = 'Correo electrónico inválido.';
    }
    if (!form.password) {
      errs.password = 'La contraseña es obligatoria.';
    } else if (form.password.length < 6) {
      errs.password = 'Debe tener al menos 6 caracteres.';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    setError('');
    const res = await onSave(form);
    if (!res.success) {
      setError(res.error || 'Error al guardar');
    }
    setSaving(false);
  };

  const availableRoles = isAdmin 
    ? ['ADMIN', 'COMPANY_ADMIN', 'EVALUATOR']
    : ['COMPANY_ADMIN', 'EVALUATOR'];

  const myCompanyName = isCompanyAdmin 
    ? (companies.find(c => c.id === authUser.empresa_id)?.nombre_empresa || 'Mi Empresa') 
    : '';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '1rem', width: '100%', maxWidth: '480px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(59,130,246,0.06))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Avatar nombre={form.nombre || '?'} apellido={form.apellido} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Nuevo Usuario
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Crear perfil en el sistema</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: '4px', borderRadius: '6px'
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input 
                className="form-input" 
                value={form.nombre}
                onChange={e => set('nombre', e.target.value)} 
                style={{ borderColor: errors.nombre ? '#ef4444' : undefined, marginBottom: 0 }}
              />
              {errors.nombre && <span style={{ fontSize: '0.74rem', color: '#ef4444' }}>{errors.nombre}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Apellido *</label>
              <input 
                className="form-input" 
                value={form.apellido}
                onChange={e => set('apellido', e.target.value)} 
                style={{ borderColor: errors.apellido ? '#ef4444' : undefined, marginBottom: 0 }}
              />
              {errors.apellido && <span style={{ fontSize: '0.74rem', color: '#ef4444' }}>{errors.apellido}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Correo Electrónico *</label>
            <input 
              type="email"
              className="form-input" 
              value={form.email}
              onChange={e => set('email', e.target.value)} 
              placeholder="correo@ejemplo.com"
              style={{ borderColor: errors.email ? '#ef4444' : undefined, marginBottom: 0 }}
            />
            {errors.email && <span style={{ fontSize: '0.74rem', color: '#ef4444' }}>{errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña *</label>
            <input 
              type="password"
              className="form-input" 
              value={form.password}
              onChange={e => set('password', e.target.value)} 
              placeholder="Mínimo 6 caracteres"
              style={{ borderColor: errors.password ? '#ef4444' : undefined, marginBottom: 0 }}
            />
            {errors.password && <span style={{ fontSize: '0.74rem', color: '#ef4444' }}>{errors.password}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Rol</label>
            <select className="form-select" value={form.rol} onChange={e => set('rol', e.target.value)}>
              {availableRoles.map(r => <option key={r} value={r}>{roleMeta[r]?.label || r}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Empresa</label>
            {isCompanyAdmin ? (
              <select className="form-select" value={form.empresa_id} disabled>
                <option value={form.empresa_id}>{myCompanyName}</option>
              </select>
            ) : (
              <select className="form-select" value={form.empresa_id} onChange={e => set('empresa_id', e.target.value)}>
                <option value="">— Sin empresa —</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.nombre_empresa}</option>)}
              </select>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Estado</label>
            <select className="form-select" value={form.estado} onChange={e => set('estado', e.target.value)}>
              {ESTADOS.map(s => <option key={s} value={s}>{estadoMeta[s]?.label || s}</option>)}
            </select>
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px', padding: '0.6rem 1rem',
              color: '#ef4444', fontSize: '0.82rem'
            }}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
              {saving ? 'Registrando…' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Confirm Delete Modal ────────────────────────────────────── */
function ConfirmDeleteModal({ user: u, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false);
  const handle = async () => {
    setDeleting(true);
    await onConfirm(u.id);
    setDeleting(false);
  };
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: '1rem', width: '100%', maxWidth: '420px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)', padding: '2rem', textAlign: 'center'
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.25rem'
        }}>
          <AlertTriangle size={24} color="#ef4444" />
        </div>
        <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)', fontWeight: 700 }}>
          ¿Desactivar usuario?
        </h3>
        <p style={{ margin: '0 0 1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          El usuario <strong style={{ color: 'var(--text-primary)' }}>
            {u.nombre} {u.apellido}
          </strong> ({u.email}) quedará inactivo y no podrá acceder al sistema.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            onClick={handle} disabled={deleting}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '0.5rem 1.25rem', borderRadius: '8px', fontWeight: 600,
              fontSize: '0.875rem', cursor: 'pointer', border: 'none',
              background: 'rgba(239,68,68,0.9)', color: '#fff',
              transition: 'all 0.2s'
            }}
          >
            {deleting
              ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : <Trash2 size={14} />}
            {deleting ? 'Desactivando…' : 'Sí, desactivar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────── */
export default function UsersList() {
  const { user: authUser } = useAuth();

  const isAdmin        = authUser?.role === 'ADMIN';
  const isCompanyAdmin = authUser?.role === 'COMPANY_ADMIN';

  /* State */
  const [users,      setUsers]      = useState([]);
  const [companies,  setCompanies]  = useState([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);
  const LIMIT = 8;

  const [search,     setSearch]     = useState('');
  const [filterRol,  setFilterRol]  = useState('');
  const [filterEmp,  setFilterEmp]  = useState('');
  const [filterEst,  setFilterEst]  = useState('');

  const dSearch = useDebounce(search);

  const [editingUser,   setEditingUser]   = useState(null);
  const [deletingUser,  setDeletingUser]  = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast,         setToast]         = useState(null);

  /* Toast helper */
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  /* Fetch companies once */
  useEffect(() => {
    getCompanies({ limit: 100 }).then(r => {
      if (r.success) setCompanies(r.companies);
    });
  }, []);

  /* Fetch users */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const empresaId = isCompanyAdmin ? authUser.empresa_id : (filterEmp || null);
    const res = await getUsers({ page, limit: LIMIT, search: dSearch, empresaId });
    if (res.success) {
      let list = res.users;
      // Client-side filters (rol, estado) – server may not support them directly
      if (filterRol) list = list.filter(u => u.rol === filterRol);
      if (filterEst) list = list.filter(u => u.estado === filterEst);
      setUsers(list);
      setTotal(res.total);
    }
    setLoading(false);
  }, [page, dSearch, filterRol, filterEmp, filterEst, isCompanyAdmin, authUser]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [dSearch, filterRol, filterEmp, filterEst]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  /* Handlers */
  const handleSave = async (id, data) => {
    const res = await updateUser(id, data);
    if (res.success) {
      showToast('Usuario actualizado correctamente.');
      setEditingUser(null);
      fetchUsers();
    }
    return res;
  };

  const handleDelete = async (id) => {
    const res = await deleteUser(id);
    if (res.success) {
      showToast('Usuario desactivado.', 'warning');
      setDeletingUser(null);
      fetchUsers();
    }
  };

  const handleCreate = async (data) => {
    const res = await createUser(data);
    if (res.success) {
      showToast('Usuario creado correctamente.');
      setShowCreateModal(false);
      fetchUsers();
    }
    return res;
  };

  const companyName = (empresa_id) =>
    companies.find(c => c.id === empresa_id)?.nombre_empresa || '—';

  /* ── Render ── */
  return (
    <div className="page-container" style={{ maxWidth: '1200px' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 2000,
          padding: '0.75rem 1.25rem', borderRadius: '10px', fontWeight: 600,
          fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          backgroundColor: toast.type === 'success' ? '#10b981' : '#f59e0b',
          color: '#fff', animation: 'fadeIn 0.2s ease'
        }}>
          <Check size={16} /> {toast.msg}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateUserModal
          companies={companies}
          onSave={handleCreate}
          onClose={() => setShowCreateModal(false)}
          authUser={authUser}
        />
      )}
      {editingUser && (
        <EditModal
          user={editingUser}
          companies={companies}
          onSave={handleSave}
          onClose={() => setEditingUser(null)}
        />
      )}
      {deletingUser && (
        <ConfirmDeleteModal
          user={deletingUser}
          onConfirm={handleDelete}
          onClose={() => setDeletingUser(null)}
        />
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Users size={26} style={{ color: 'var(--accent)' }} />
            Gestión de Usuarios
          </h1>
          <p className="page-subtitle">
            {isCompanyAdmin
              ? 'Usuarios de tu empresa'
              : `${total} usuarios en el sistema`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={fetchUsers} style={{ gap: '6px' }}>
            <RefreshCw size={15} />
            Actualizar
          </button>
          <button 
            id="btn-new-user"
            className="btn-primary" 
            onClick={() => setShowCreateModal(true)} 
            style={{ gap: '6px' }}
          >
            <User size={15} />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '1rem', padding: '1rem 1.25rem',
        display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center',
        marginBottom: '1.25rem'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={16} style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', pointerEvents: 'none'
          }} />
          <input
            id="users-search"
            className="form-input"
            placeholder="Buscar por nombre, apellido o email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '38px', marginBottom: 0 }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{
              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'
            }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Rol filter */}
        <div style={{ position: 'relative' }}>
          <select
            id="filter-rol"
            className="form-select"
            value={filterRol}
            onChange={e => setFilterRol(e.target.value)}
            style={{ paddingRight: '2rem', minWidth: '160px', marginBottom: 0 }}
          >
            <option value="">Todos los roles</option>
            {ROLES.map(r => <option key={r} value={r}>{roleMeta[r]?.label || r}</option>)}
          </select>
        </div>

        {/* Empresa filter – only ADMIN */}
        {isAdmin && (
          <div style={{ position: 'relative' }}>
            <select
              id="filter-empresa"
              className="form-select"
              value={filterEmp}
              onChange={e => setFilterEmp(e.target.value)}
              style={{ minWidth: '180px', marginBottom: 0 }}
            >
              <option value="">Todas las empresas</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.nombre_empresa}</option>)}
            </select>
          </div>
        )}

        {/* Estado filter */}
        <div style={{ position: 'relative' }}>
          <select
            id="filter-estado"
            className="form-select"
            value={filterEst}
            onChange={e => setFilterEst(e.target.value)}
            style={{ minWidth: '140px', marginBottom: 0 }}
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map(s => <option key={s} value={s}>{estadoMeta[s]?.label || s}</option>)}
          </select>
        </div>

        {/* Clear filters */}
        {(search || filterRol || filterEmp || filterEst) && (
          <button
            onClick={() => { setSearch(''); setFilterRol(''); setFilterEmp(''); setFilterEst(''); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444', borderRadius: '8px', padding: '0.45rem 0.9rem',
              fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
            }}
          >
            <X size={13} /> Limpiar filtros
          </button>
        )}
      </div>

      {/* Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.75rem' }} />
            <p>Cargando usuarios…</p>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <User size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
            <p style={{ fontWeight: 600 }}>No se encontraron usuarios</p>
            <p style={{ fontSize: '0.85rem' }}>Intenta ajustar los filtros de búsqueda.</p>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  {['Usuario', 'Email', 'Rol', 'Empresa', 'Estado', 'Acciones'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, idx) => (
                  <tr key={u.id} style={{
                    borderBottom: '1px solid var(--border)',
                    transition: 'background 0.15s',
                    backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'
                  }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(168,85,247,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'}
                  >
                    {/* Usuario */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Avatar nombre={u.nombre} apellido={u.apellido} />
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            {u.nombre} {u.apellido}
                          </p>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            ID: {u.id.slice(0, 8)}…
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {u.email}
                    </td>

                    {/* Rol */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <RoleBadge rol={u.rol} />
                    </td>

                    {/* Empresa */}
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {u.empresa_id ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Building2 size={13} style={{ color: 'var(--text-muted)' }} />
                          {companyName(u.empresa_id)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>
                      )}
                    </td>

                    {/* Estado */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <EstadoBadge estado={u.estado} />
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          id={`edit-user-${u.id}`}
                          title="Editar usuario"
                          onClick={() => setEditingUser(u)}
                          style={{
                            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
                            color: '#3b82f6', borderRadius: '7px', padding: '0.4rem 0.65rem',
                            cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px',
                            fontSize: '0.78rem', fontWeight: 600
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.2)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.1)'}
                        >
                          <Edit2 size={13} /> Editar
                        </button>

                        {u.estado !== 'INACTIVO' && (
                          <button
                            id={`deactivate-user-${u.id}`}
                            title="Desactivar usuario"
                            onClick={() => setDeletingUser(u)}
                            style={{
                              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                              color: '#ef4444', borderRadius: '7px', padding: '0.4rem 0.65rem',
                              cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px',
                              fontSize: '0.78rem', fontWeight: 600
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.18)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'}
                          >
                            <Trash2 size={13} /> Desactivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && users.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border)',
            flexWrap: 'wrap', gap: '0.5rem'
          }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Mostrando <strong style={{ color: 'var(--text-primary)' }}>
                {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)}
              </strong> de <strong style={{ color: 'var(--text-primary)' }}>{total}</strong> usuarios
            </span>

            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <button
                id="pagination-prev"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  background: page === 1 ? 'rgba(255,255,255,0.04)' : 'rgba(168,85,247,0.1)',
                  border: '1px solid var(--border)', borderRadius: '7px',
                  padding: '0.4rem 0.75rem', cursor: page === 1 ? 'not-allowed' : 'pointer',
                  color: page === 1 ? 'var(--text-muted)' : 'var(--accent)',
                  display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', fontWeight: 600,
                  opacity: page === 1 ? 0.5 : 1
                }}
              >
                <ChevronLeft size={14} /> Anterior
              </button>

              {/* Page Numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) => p === '…' ? (
                  <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>…</span>
                ) : (
                  <button
                    key={p}
                    id={`pagination-page-${p}`}
                    onClick={() => setPage(p)}
                    style={{
                      background: page === p ? 'var(--accent)' : 'rgba(255,255,255,0.04)',
                      border: '1px solid ' + (page === p ? 'var(--accent)' : 'var(--border)'),
                      borderRadius: '7px', padding: '0.4rem 0.65rem',
                      cursor: 'pointer', color: page === p ? '#fff' : 'var(--text-secondary)',
                      fontSize: '0.82rem', fontWeight: 600, minWidth: '32px'
                    }}
                  >{p}</button>
                ))
              }

              <button
                id="pagination-next"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  background: page === totalPages ? 'rgba(255,255,255,0.04)' : 'rgba(168,85,247,0.1)',
                  border: '1px solid var(--border)', borderRadius: '7px',
                  padding: '0.4rem 0.75rem', cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  color: page === totalPages ? 'var(--text-muted)' : 'var(--accent)',
                  display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', fontWeight: 600,
                  opacity: page === totalPages ? 0.5 : 1
                }}
              >
                Siguiente <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
