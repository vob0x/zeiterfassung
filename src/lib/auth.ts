// @ts-nocheck
import { supabaseClient as supabase } from './supabase';

type AuthSession = any;

const PSEUDONYMOUS_EMAIL_DOMAIN = '@zeiterfassung.local';

/**
 * Sign up with pseudonymous auth (codename + password)
 * Creates account with codename@zeiterfassung.local as email
 */
export async function signUp(
  codename: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate inputs
    if (!codename || codename.trim().length === 0) {
      return { success: false, error: 'Codename is required' };
    }

    if (!password || password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' };
    }

    // Check if codename is already taken
    const { data: existingCodename } = await supabase
      .from('profiles')
      .select('id')
      .eq('codename', codename.trim())
      .maybeSingle();

    if (existingCodename) {
      return { success: false, error: 'Codename already taken' };
    }

    const email = `${codename.trim().toLowerCase()}${PSEUDONYMOUS_EMAIL_DOMAIN}`;

    // Create auth user
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          codename: codename.trim(),
        },
      },
    });

    if (signUpError) {
      return { success: false, error: signUpError.message };
    }

    if (!data.user) {
      return { success: false, error: 'Failed to create user' };
    }

    // Create profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      codename: codename.trim(),
    });

    if (profileError) {
      // Clean up the auth user if profile creation fails
      await supabase.auth.admin?.deleteUser(data.user.id);
      return { success: false, error: 'Failed to create profile' };
    }

    // Create default user settings
    const { error: settingsError } = await supabase.from('user_settings').insert({
      user_id: data.user.id,
      theme: 'light',
      language: 'de',
    });

    if (settingsError) {
      console.warn('Failed to create user settings:', settingsError);
    }

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return { success: false, error: errorMessage };
  }
}

/**
 * Sign in with codename and password
 */
export async function signIn(
  codename: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!codename || codename.trim().length === 0) {
      return { success: false, error: 'Codename is required' };
    }

    if (!password) {
      return { success: false, error: 'Password is required' };
    }

    const email = `${codename.trim().toLowerCase()}${PSEUDONYMOUS_EMAIL_DOMAIN}`;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return { success: false, error: errorMessage };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return { success: false, error: errorMessage };
  }
}

/**
 * Get current session
 */
export async function getSession(): Promise<AuthSession | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch (err) {
    console.error('Failed to get session:', err);
    return null;
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser() {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch (err) {
    console.error('Failed to get user:', err);
    return null;
  }
}

/**
 * Check if codename is available
 */
export async function checkCodeNameAvailable(codename: string): Promise<boolean> {
  try {
    if (!codename || codename.trim().length === 0) {
      return false;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('codename', codename.trim());

    if (error) {
      console.error('Failed to check codename availability:', error);
      return false;
    }

    return !data || data.length === 0;
  } catch (err) {
    console.error('Failed to check codename availability:', err);
    return false;
  }
}

/**
 * Subscribe to auth state changes
 * Returns unsubscribe function
 */
export function onAuthStateChange(
  callback: (event: string, session: AuthSession | null) => void
): (() => void) | undefined {
  try {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });

    return () => {
      subscription?.unsubscribe();
    };
  } catch (err) {
    console.error('Failed to subscribe to auth state changes:', err);
    return undefined;
  }
}

/**
 * Get the codename from the current session
 */
export async function getCurrentCodename(): Promise<string | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('codename')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Failed to get codename:', error);
      return null;
    }

    return data?.codename || null;
  } catch (err) {
    console.error('Failed to get codename:', err);
    return null;
  }
}
