import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Edit2, Check, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUIStore } from '../../stores/uiStore';
import { THEME } from '../../constants/index.js';
import TagBadge from './TagBadge.jsx';
import {
  fetchTags,
  fetchTagCategories,
  createTag,
  updateTag,
  deleteTag,
} from '../../services/tags.js';

/**
 * TagAdminPanel — CRUD UI for tag management.
 * Only rendered when API_SECRET_KEY is configured (protected).
 *
 * Props:
 *   apiKey  — string, passed from env or admin unlock
 *   onClose — () => void
 */
export default function TagAdminPanel({ apiKey, onClose }) {
  const darkMode = useUIStore((s) => s.darkMode);

  const [tags, setTags] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create form state
  const [newTag, setNewTag] = useState({ name_ar: '', name_en: '', category_slug: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [saving, setSaving] = useState(null);

  // Delete state
  const [deletingId, setDeletingId] = useState(null);

  const panelBg = darkMode ? '#0e0e10' : '#FDFCF8';
  const borderColor = darkMode ? 'rgba(197,160,89,0.14)' : 'rgba(107,87,68,0.14)';
  const textPrimary = darkMode ? '#E8E0D0' : '#2C1810';
  const textMuted = darkMode ? 'rgba(212,200,180,0.5)' : 'rgba(60,40,20,0.5)';
  const inputStyle = {
    background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    border: `1px solid ${borderColor}`,
    borderRadius: '0.5rem',
    padding: '0.35rem 0.6rem',
    color: textPrimary,
    fontSize: '0.78rem',
    fontFamily: "'Tajawal', sans-serif",
    outline: 'none',
    width: '100%',
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tagsData, catData] = await Promise.all([
        fetchTags({ limit: 500 }),
        fetchTagCategories(),
      ]);
      setTags(tagsData.tags || tagsData);
      setCategories(catData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!newTag.name_ar.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createTag(newTag, apiKey);
      setTags((prev) => [...prev, created]);
      setNewTag({ name_ar: '', name_en: '', category_slug: '' });
    } catch (e) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEdit = async (tagId) => {
    setSaving(tagId);
    try {
      const updated = await updateTag(tagId, editValues, apiKey);
      setTags((prev) => prev.map((t) => (t.id === tagId ? { ...t, ...updated } : t)));
      setEditingId(null);
    } catch {
      /* silently fail */
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (tagId) => {
    setDeletingId(tagId);
    try {
      await deleteTag(tagId, apiKey);
      setTags((prev) => prev.filter((t) => t.id !== tagId));
    } catch {
      /* silently fail */
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        background: darkMode ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '3rem 1rem 2rem',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        style={{
          width: '100%',
          maxWidth: '640px',
          background: panelBg,
          borderRadius: '1.25rem',
          border: `1px solid ${borderColor}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '0.875rem 1.125rem 0.75rem',
            borderBottom: `1px solid ${borderColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Amiri', serif",
                fontSize: '1rem',
                color: 'var(--gold)',
                direction: 'rtl',
              }}
            >
              إدارة الوسوم
            </div>
            <div
              style={{
                fontFamily: "'Forum', serif",
                fontSize: '0.68rem',
                color: textMuted,
                letterSpacing: '0.05em',
              }}
            >
              Tag Management (Admin)
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close admin panel"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: textMuted }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Create new tag form */}
        <div
          style={{
            padding: '0.875rem 1.125rem',
            borderBottom: `1px solid ${borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div
            style={{
              fontSize: '0.7rem',
              fontFamily: "'Forum', serif",
              color: textMuted,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '0.25rem',
            }}
          >
            New Tag
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              style={{ ...inputStyle, flex: '1 1 120px' }}
              placeholder="اسم الوسم (Arabic) *"
              dir="rtl"
              value={newTag.name_ar}
              onChange={(e) => setNewTag((p) => ({ ...p, name_ar: e.target.value }))}
            />
            <input
              style={{ ...inputStyle, flex: '1 1 120px' }}
              placeholder="Tag name (English)"
              value={newTag.name_en}
              onChange={(e) => setNewTag((p) => ({ ...p, name_en: e.target.value }))}
            />
            <select
              style={{ ...inputStyle, flex: '1 1 110px', cursor: 'pointer' }}
              value={newTag.category_slug}
              onChange={(e) => setNewTag((p) => ({ ...p, category_slug: e.target.value }))}
            >
              <option value="">Category...</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name_en || c.name_ar}
                </option>
              ))}
            </select>
            <button
              onClick={handleCreate}
              disabled={creating || !newTag.name_ar.trim()}
              style={{
                background: 'rgba(197,160,89,0.15)',
                border: '1px solid rgba(197,160,89,0.35)',
                borderRadius: '0.5rem',
                padding: '0.35rem 0.75rem',
                cursor: creating ? 'wait' : 'pointer',
                color: 'var(--gold)',
                fontSize: '0.75rem',
                fontFamily: "'Forum', serif",
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                opacity: !newTag.name_ar.trim() ? 0.5 : 1,
              }}
            >
              {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Add
            </button>
          </div>
          {createError && (
            <div
              style={{ fontSize: '0.7rem', color: '#f87171', fontFamily: "'Tajawal', sans-serif" }}
            >
              {createError}
            </div>
          )}
        </div>

        {/* Tags list */}
        <div style={{ overflowY: 'auto', maxHeight: '480px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--gold)' }} />
            </div>
          ) : error ? (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#f87171',
                fontSize: '0.8rem',
                fontFamily: "'Tajawal', sans-serif",
              }}
            >
              {error}
            </div>
          ) : tags.length === 0 ? (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                color: textMuted,
                fontSize: '0.8rem',
                fontFamily: "'Tajawal', sans-serif",
              }}
            >
              No tags yet
            </div>
          ) : (
            tags.map((tag) => {
              const isEditing = editingId === tag.id;
              const isDeleting = deletingId === tag.id;
              const isSaving = saving === tag.id;
              return (
                <div
                  key={tag.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1.125rem',
                    borderBottom: `1px solid ${borderColor}`,
                    background: isEditing ? 'rgba(197,160,89,0.04)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  {isEditing ? (
                    <>
                      <input
                        style={{ ...inputStyle, flex: 1 }}
                        dir="rtl"
                        value={editValues.name_ar ?? tag.name_ar}
                        onChange={(e) => setEditValues((p) => ({ ...p, name_ar: e.target.value }))}
                      />
                      <input
                        style={{ ...inputStyle, flex: 1 }}
                        value={editValues.name_en ?? tag.name_en}
                        onChange={(e) => setEditValues((p) => ({ ...p, name_en: e.target.value }))}
                      />
                      <button
                        onClick={() => handleSaveEdit(tag.id)}
                        disabled={isSaving}
                        style={{
                          background: 'rgba(197,160,89,0.15)',
                          border: '1px solid rgba(197,160,89,0.35)',
                          borderRadius: '0.4rem',
                          padding: '0.3rem 0.5rem',
                          cursor: 'pointer',
                          color: 'var(--gold)',
                        }}
                      >
                        {isSaving ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Check size={13} />
                        )}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: textMuted,
                        }}
                      >
                        <X size={13} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ flex: 1 }}>
                        <TagBadge tag={tag} size="sm" />
                      </div>
                      <span
                        style={{
                          fontSize: '0.62rem',
                          color: textMuted,
                          fontFamily: "'Tajawal', sans-serif",
                        }}
                      >
                        {tag.poem_count ?? 0} poems
                      </span>
                      <button
                        onClick={() => {
                          setEditingId(tag.id);
                          setEditValues({ name_ar: tag.name_ar, name_en: tag.name_en });
                        }}
                        aria-label={`Edit ${tag.name_en || tag.name_ar}`}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: textMuted,
                          padding: '0.2rem',
                          transition: 'color 0.15s',
                        }}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(tag.id)}
                        disabled={isDeleting}
                        aria-label={`Delete ${tag.name_en || tag.name_ar}`}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: isDeleting ? 'wait' : 'pointer',
                          color: isDeleting ? textMuted : '#f87171',
                          padding: '0.2rem',
                          transition: 'color 0.15s',
                        }}
                      >
                        {isDeleting ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
