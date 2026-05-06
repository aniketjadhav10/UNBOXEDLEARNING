import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Button }     from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { InputField } from '../../../components/ui/InputField';
import { Loader }     from '../../../components/ui/Loader';
import { Toast }      from '../../../components/ui/Toast';
import {
  addParentToFamily,
  createFamily,
  getMyProfile,
  listFamilyMembers,
  type FamilyMember,
  type ProfileWithFamily,
} from '../../../services/familyService';
import { useAdminStore } from '../../../store/useAdminStore';

export function FamilyPage() {
  const [profile, setProfile] = useState<ProfileWithFamily | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [familyName, setFamilyName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const { loading, setLoading, showToast } = useAdminStore();

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const nextProfile = await getMyProfile();
      setProfile(nextProfile);
      setFamilyName(nextProfile.families?.name ?? '');
      if (nextProfile.family_id) {
        setMembers(await listFamilyMembers());
      }
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : 'Unable to load family', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [setLoading, showToast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleCreateFamily(event: FormEvent) {
    event.preventDefault();

    try {
      await createFamily(familyName.trim());
      showToast({ message: 'Family workspace created', type: 'success' });
      loadProfile();
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : 'Unable to create family', type: 'error' });
    }
  }

  async function handleAddParent(event: FormEvent) {
    event.preventDefault();

    try {
      await addParentToFamily(parentEmail.trim());
      setParentEmail('');
      showToast({ message: 'Parent added to family', type: 'success' });
      setMembers(await listFamilyMembers());
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : 'Unable to add parent', type: 'error' });
    }
  }

  if (loading) return <Loader />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Family</h1>
        <p className="mt-1 text-sm text-ink/65">Set up the private family workspace used by children and curriculum.</p>
      </div>

      {profile?.families ? (
        <div className="space-y-4">
          <section className="rounded-xl bg-white p-4 shadow-md">
            <p className="text-sm font-medium text-moss">Current workspace</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">{profile.families.name}</h2>
            <p className="mt-2 text-sm text-ink/65">Children, subjects, topics, tasks, and activities now belong to this family space.</p>
          </section>

          <section className="space-y-4 rounded-xl bg-white p-4 shadow-md">
            <div>
              <h2 className="text-lg font-semibold text-ink">Parents</h2>
              <p className="mt-1 text-sm text-ink/65">Add another parent by email after they sign in once with Google.</p>
            </div>

            <form className="space-y-3" onSubmit={handleAddParent}>
              <InputField
                label="Parent email"
                onChange={(event) => setParentEmail(event.target.value)}
                placeholder="mother@example.com"
                required
                type="email"
                value={parentEmail}
              />
              <Button className="w-full" type="submit">
                Add parent
              </Button>
            </form>

            <div className="space-y-2">
              {members.map((member) => (
                <article key={member.member_id} className="rounded-md border border-black/10 p-3">
                  <p className="font-medium text-ink">{member.member_email}</p>
                  <p className="text-sm text-ink/60">{member.member_user_id}</p>
                  <span className="mt-2 inline-flex rounded-md bg-skywash px-2 py-1 text-xs font-semibold text-ink">
                    {member.member_role}
                  </span>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <section className="space-y-4 rounded-xl bg-white p-4 shadow-md">
          <EmptyState message="No family workspace found" />
          <form className="space-y-4" onSubmit={handleCreateFamily}>
            <InputField
              label="Family name"
              onChange={(event) => setFamilyName(event.target.value)}
              placeholder="The Sharma Family"
              required
              value={familyName}
            />
            <Button className="w-full" type="submit">
              Create family workspace
            </Button>
          </form>
        </section>
      )}

      <Toast />
    </div>
  );
}
