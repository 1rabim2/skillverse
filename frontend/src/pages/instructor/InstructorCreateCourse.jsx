import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { apiFetch } from '../../lib/apiFetch';
import { uploadUserImage } from '../../lib/uploads';
import { resolveAssetUrl } from '../../lib/assets';

export default function InstructorCreateCourse() {
  const navigate = useNavigate();
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [category, setCategory] = React.useState('General');
  const [level, setLevel] = React.useState('Beginner');
  const [skillPath, setSkillPath] = React.useState('');
  const [skillPaths, setSkillPaths] = React.useState([]);
  const [thumbnailUrl, setThumbnailUrl] = React.useState('');
  const [thumbUploading, setThumbUploading] = React.useState(false);
  const [out, setOut] = React.useState('');
  const [isError, setIsError] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    apiFetch('/skill-paths')
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        setSkillPaths(Array.isArray(data) ? data : []);
      })
      .catch(() => null);
    return () => {
      mounted = false;
    };
  }, []);

  async function onPickThumbnail(e) {
    const file = e?.target?.files?.[0];
    if (!file) return;
    setThumbUploading(true);
    setOut('');
    setIsError(false);
    try {
      const up = await uploadUserImage(file);
      setThumbnailUrl(String(up?.url || ''));
      setOut('Thumbnail uploaded.');
    } catch (err) {
      setIsError(true);
      setOut(err.message || 'Upload failed');
    } finally {
      setThumbUploading(false);
      if (e?.target) e.target.value = '';
    }
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setOut('');
    setIsError(false);
    try {
      const res = await apiFetch('/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, category, level, skillPath: skillPath || null, thumbnailUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to create course');
      navigate(`/instructor/courses/${data.course._id}`);
    } catch (err) {
      setIsError(true);
      setOut(err.message);
    } finally {
      setLoading(false);
    }
  }

  const skillPathTitle = skillPaths.find((sp) => sp._id === skillPath)?.title || '';

  return (
    <div className="max-w-6xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Create Course</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Create a draft. Admin approval is required to publish.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card as="form" onSubmit={submit} className="space-y-4 lg:col-span-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., React for Beginners" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">Description</label>
            <textarea
              className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-900/40"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will students learn?"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">Category</label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">Level</label>
              <select
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-900/40"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              >
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">Skill Path (optional)</label>
              <select
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-900/40"
                value={skillPath}
                onChange={(e) => setSkillPath(e.target.value)}
              >
                <option value="">No Skill Path</option>
                {skillPaths.map((sp) => (
                  <option key={sp._id} value={sp._id}>
                    {sp.title}
                  </option>
                ))}
              </select>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Skill paths are managed by admins.</div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">Thumbnail</label>
              <div className="flex gap-2">
                <Input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="Paste image URL or upload" />
                <label
                  className={`inline-flex cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 ${
                    thumbUploading ? 'opacity-60' : ''
                  }`}
                >
                  {thumbUploading ? 'Uploading…' : 'Upload'}
                  <input type="file" accept="image/*" className="hidden" onChange={onPickThumbnail} disabled={thumbUploading} />
                </label>
              </div>
            </div>
          </div>

          {out && (
            <div
              className={
                isError
                  ? 'rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300'
                  : 'rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
              }
            >
              {out}
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create & Continue'}
            </Button>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Preview</div>
          <div className="mt-2 space-y-3">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              {thumbnailUrl ? (
                <img src={resolveAssetUrl(thumbnailUrl)} alt="Thumbnail preview" className="h-40 w-full object-cover" />
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-slate-500">No thumbnail</div>
              )}
            </div>
            <div>
              <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{title || 'Untitled course'}</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {description || 'Add a short description to help students.'}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{category || 'General'}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{level || 'Beginner'}</span>
              {skillPathTitle ? <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{skillPathTitle}</span> : null}
              <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                Draft
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              After creating, add lessons/quizzes/projects on the next screen, then request admin approval.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

