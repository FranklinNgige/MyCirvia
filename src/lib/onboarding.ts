import { createClient } from '@/lib/supabase/server';

const avatarSeeds = ['wave', 'ember', 'mist', 'orbit', 'nova', 'river', 'echo'];
const namePrefixes = ['Blue', 'Silent', 'Bright', 'Gentle', 'Calm', 'Hidden', 'Kind'];
const nameSuffixes = ['Wave', 'Sky', 'Forest', 'River', 'Echo', 'Stone', 'Flame'];

const randomItem = (items: string[]) => items[Math.floor(Math.random() * items.length)];

export const generateAnonymousProfile = () => {
  const displayName = `${randomItem(namePrefixes)}${randomItem(nameSuffixes)}_${
    Math.floor(Math.random() * 1000)
  }`;
  const avatarSeed = `${randomItem(avatarSeeds)}-${Math.floor(Math.random() * 10_000)}`;

  return { displayName, avatarSeed };
};

export const getOnboardingState = async (userId: string) => {
  const supabase = createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  const { data: identityTemplate } = await supabase
    .from('identity_scope_templates')
    .select('id')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle();

  return {
    hasProfile: Boolean(profile?.id),
    hasIdentityTemplate: Boolean(identityTemplate?.id)
  };
};

export const completeOnboarding = async (userId: string, email?: string | null) => {
  const supabase = createClient();
  const { displayName, avatarSeed } = generateAnonymousProfile();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) {
    await supabase.from('profiles').insert({
      id: userId,
      email,
      display_name: displayName,
      avatar_seed: avatarSeed
    });
  }

  const { data: identityTemplate } = await supabase
    .from('identity_scope_templates')
    .select('id')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle();

  if (!identityTemplate) {
    await supabase.from('identity_scope_templates').insert({
      user_id: userId,
      display_name: displayName,
      avatar_seed: avatarSeed,
      is_default: true,
      visibility_level: 'anonymous'
    });
  }
};
