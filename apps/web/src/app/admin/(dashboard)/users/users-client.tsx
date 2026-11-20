'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Copy, Plus, RefreshCw, ShieldCheck, Trash2, UserRound, UserRoundX } from 'lucide-react';
import { AdminPageTitle } from '../admin-page-title';
import { AdminDialog } from '../admin-dialog';
import { AdminOptionMenu } from '../admin-option-menu';

type Account = { id: string; name: string; email: string; roleId: string; roleName: string; isActive: boolean; mustChangePassword: boolean; temporaryPasswordExpiresAt: string | null };
type Role = { id: string; name: string };
type Props = { initialUsers: Account[]; roles: Role[]; currentId: string };
const adminDateFormatter = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });

export function AdminUsersClient({ initialUsers, roles, currentId }: Props) {
  const assignableRoles = roles.filter(role => role.id !== 'owner');
  const reduceMotion = useReducedMotion();
  const [users, setUsers] = useState(initialUsers);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('editor');
  const [credential, setCredential] = useState<{ email: string; password: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [removeTarget, setRemoveTarget] = useState<Account | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [addUserExpanded, setAddUserExpanded] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const orderedUsers = [...users].sort((a, b) => Number(a.roleId === 'owner') - Number(b.roleId === 'owner'));

  useEffect(() => {
    if (showAddUser) nameInputRef.current?.focus();
  }, [showAddUser]);

  async function refresh() {
    const response = await fetch('/api/admin/users', { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load admin users.');
    setUsers((await response.json()).users);
  }

  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, roleId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create admin.');
      setCredential({ email, password: data.temporaryPassword }); setName(''); setEmail('');
      await refresh(); setShowAddUser(false); setMessage('Admin created. Share the temporary password privately.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not create admin.'); }
    finally { setBusy(false); }
  }

  async function update(id: string, changes: { roleId?: string; isActive?: boolean }) {
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update admin.');
      await refresh(); setMessage('Admin access updated. Existing sessions were revoked.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not update admin.'); }
    finally { setBusy(false); }
  }

  async function reset(user: Account) {
    if (!window.confirm(`Reset the password for ${user.name}? Their existing sessions will end.`)) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not reset password.');
      setCredential({ email: user.email, password: data.temporaryPassword });
      await refresh(); setMessage('Password reset. Share the temporary password privately.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not reset password.'); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!removeTarget) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/users/${removeTarget.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not remove admin.');
      setRemoveTarget(null); await refresh(); setMessage('Admin removed permanently. Their previous sign-in now shows that the account was removed.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not remove admin.'); }
    finally { setBusy(false); }
  }

  return <div className="mx-auto max-w-6xl space-y-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <AdminPageTitle title="Admin Users" description="Give each person their own account and control what they can access." />
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/roles" className="inline-flex h-11 items-center gap-2 rounded-xl border border-flame-200 bg-white px-4 text-sm font-semibold text-flame-700 hover:bg-flame-50"><ShieldCheck className="h-4 w-4" /> Manage roles</Link>
        <button type="button" aria-expanded={showAddUser} aria-controls="add-admin-user" onClick={() => setShowAddUser(open => !open)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-flame-600 px-4 text-sm font-semibold text-white hover:bg-flame-700"><Plus className="h-4 w-4" /> {showAddUser ? 'Close form' : 'Add user'}</button>
      </div>
    </header>
    {message && <p role="status" className="rounded-xl border border-flame-200 bg-flame-50 px-4 py-3 text-sm text-flame-800">{message}</p>}
    {credential && <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5" aria-label="Temporary credentials">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-gray-900">Temporary password for {credential.email}</h2><p className="mt-1 text-sm text-gray-700">Shown only now and valid for 24 hours. Share it privately; this admin must change it at sign-in.</p></div><button type="button" onClick={() => setCredential(null)} className="text-sm font-medium text-gray-700 underline underline-offset-4">Dismiss</button></div>
      <div className="mt-4 flex flex-wrap items-center gap-2"><code className="min-w-0 break-all rounded-lg bg-white px-3 py-2 text-sm text-gray-900">{credential.password}</code><button type="button" className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white" onClick={async () => { await navigator.clipboard.writeText(credential.password); setMessage('Temporary password copied.'); }}><Copy className="h-4 w-4" /> Copy</button></div>
    </section>}
    <section className="min-w-0 rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4"><h2 className="font-semibold text-gray-900">People with admin access</h2><p className="mt-1 text-sm text-gray-500">Role changes and deactivation end existing sessions.</p></div>
        <AnimatePresence initial={false}>
          {showAddUser&&<motion.div id="add-admin-user" initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:reduceMotion?0:0.24,ease:[0.22,1,0.36,1]}} onAnimationStart={()=>setAddUserExpanded(false)} onAnimationComplete={()=>setAddUserExpanded(showAddUser)} className={`relative z-20 border-b border-gray-100 bg-flame-50/40 ${addUserExpanded?'overflow-visible':'overflow-hidden'}`}>
            <div className="px-5 py-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-gray-900">Add admin user</h2><p className="mt-1 text-sm text-gray-600">Create a separate sign-in for a colleague.</p></div><button type="button" onClick={()=>setShowAddUser(false)} className="text-sm font-medium text-gray-600 underline underline-offset-4 hover:text-gray-900">Cancel</button></div>
              <form onSubmit={create} className="mt-5 grid items-end gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px_auto]">
                <label className="block text-sm font-medium text-gray-700">Full name<input ref={nameInputRef} required minLength={2} maxLength={100} value={name} onChange={e => setName(e.target.value)} className="mt-1 block h-11 w-full rounded-lg border border-gray-300 bg-white px-3" /></label>
                <label className="block text-sm font-medium text-gray-700">Email address<input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block h-11 w-full rounded-lg border border-gray-300 bg-white px-3" /></label>
                <div><span className="block text-sm font-medium text-gray-700">Role</span><div className="mt-1"><AdminOptionMenu simple icon={ShieldCheck} label="Role" title="Choose an admin role" description="Select what this user can access." value={roleId} options={assignableRoles.map(role=>({value:role.id,label:role.name}))} onChange={setRoleId}/></div></div>
                <button disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-flame-600 px-5 text-sm font-semibold text-white hover:bg-flame-700 disabled:opacity-50"><Plus className="h-4 w-4" /> {busy ? 'Working…' : 'Create admin'}</button>
              </form>
            </div>
          </motion.div>}
        </AnimatePresence>
        <div className="divide-y divide-gray-100">{orderedUsers.map(user => <div key={user.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
          <div className="flex min-w-[220px] flex-1 items-center gap-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-flame-50 text-flame-700"><UserRound className="h-5 w-5" /></div>
          <div className="min-w-0"><p className="font-semibold text-gray-900">{user.name}{user.id === currentId && <span className="ml-2 text-xs font-normal text-gray-500">You</span>}</p><p className="break-all text-sm text-gray-600">{user.email}{user.id === currentId && user.roleId === 'owner' && <Link href="/admin/account" className="ml-2 text-xs font-medium text-flame-700 hover:underline">Change email in profile</Link>}</p><p className="mt-1 text-xs text-gray-500">{!user.isActive ? 'Inactive' : user.mustChangePassword ? user.temporaryPasswordExpiresAt && Date.parse(user.temporaryPasswordExpiresAt) <= Date.now() ? 'Temporary password expired · Reset required' : user.temporaryPasswordExpiresAt ? `Password change required · Expires ${adminDateFormatter.format(new Date(user.temporaryPasswordExpiresAt))}` : 'Password change required' : 'Active'}</p></div></div>
          <div className="flex flex-wrap items-end gap-3"><div className="min-w-40"><span className="block text-xs font-medium text-gray-600">Role</span><div className="mt-1"><AdminOptionMenu simple compact align="end" icon={ShieldCheck} label={`Role for ${user.name}`} title="Choose a role." description="Changing the role ends this user's existing sessions." value={user.roleId} disabled={busy||user.id===currentId} options={roles.filter(role=>user.roleId==='owner'?role.id==='owner':role.id!=='owner').map(role=>({value:role.id,label:role.name}))} onChange={nextRole=>{void update(user.id,{roleId:nextRole});}}/></div></div>
          <div><span className="mb-1 block text-xs font-medium text-gray-600">Actions</span><div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => reset(user)} className="inline-flex h-10 items-center gap-1 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"><RefreshCw className="h-4 w-4" /> Reset password</button><button type="button" disabled={busy || user.id === currentId} onClick={() => update(user.id, { isActive: !user.isActive })} className="inline-flex h-10 items-center gap-1 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"><UserRoundX className="h-4 w-4" /> {user.isActive ? 'Deactivate' : 'Reactivate'}</button>
          {!user.isActive&&user.id!==currentId&&<button type="button" disabled={busy} onClick={()=>setRemoveTarget(user)} className="inline-flex h-10 items-center gap-1 rounded-lg border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /> Remove permanently</button>}</div></div></div>
        </div>)}</div>
    </section>
    {removeTarget&&<AdminDialog label={`Remove ${removeTarget.name} permanently`} busy={busy} dismissible={false} onClose={()=>setRemoveTarget(null)}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700"><AlertTriangle className="h-5 w-5" aria-hidden="true"/></span>
        <div><h2 className="text-lg font-semibold text-gray-900">Remove {removeTarget.name} permanently?</h2><p className="mt-2 text-sm leading-6 text-gray-600">This deletes <span className="font-medium text-gray-800">{removeTarget.email}</span>, revokes every session and cannot be undone. Future sign-in attempts will state that the account was removed.</p></div>
      </div>
      <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} onClick={()=>setRemoveTarget(null)} className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button><button type="button" disabled={busy} onClick={()=>void remove()} className="h-10 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">{busy?'Removing…':'Confirm'}</button></div>
    </AdminDialog>}
  </div>;
}
