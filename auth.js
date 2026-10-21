import { supabase, configured } from './supabase-config.js';

const $ = id => document.getElementById(id);

let session = null;
let mode = 'login';
let activity = false;
let submitting = false;

const listeners = new Set();

export const getUser = () => session?.user ?? null;

export function onUserChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function setActivity(busy) {
  activity = busy;
  $('logout').disabled = busy || submitting;
}

function publish(next) {
  const previous = session?.user?.id;
  session = next;

  $('startup').hidden = true;
  $('auth-panel').hidden = Boolean(session);
  $('workspace').hidden = !session;
  $('logout').hidden = !session;
  $('user-email').hidden = !session;
  $('user-email').textContent = session?.user?.email ?? '';

  if (previous !== session?.user?.id) {
    // Listeners must stay synchronous; app.js defers its Supabase requests.
    listeners.forEach(callback => callback(session?.user ?? null));
  }
}

function setMode(next) {
  mode = next;

  $('login-tab').setAttribute('aria-pressed', String(mode === 'login'));
  $('signup-tab').setAttribute('aria-pressed', String(mode === 'signup'));

  $('auth-heading').textContent =
    mode === 'login' ? 'Welcome back' : 'Your space starts here';

  $('auth-submit').textContent =
    mode === 'login' ? 'Log in' : 'Create account';

  $('password').autocomplete =
    mode === 'login' ? 'current-password' : 'new-password';

  $('auth-message').textContent = '';
}

export async function requireUser() {
  if (!getUser()) throw new Error('Please log in first.');

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    // A network failure alone must not destroy a recoverable session.
    if (!data.user && (!error || [401, 403].includes(error.status))) {
      await supabase.auth.signOut({ scope: 'local' });
      publish(null);
    }

    throw new Error(
      error?.message ?? 'Session expired. Please log in again.'
    );
  }

  if (data.user.id !== getUser()?.id) {
    throw new Error('Account changed. Try again.');
  }

  return data.user;
}

export async function initAuth() {
  $('login-tab').onclick = () => setMode('login');
  $('signup-tab').onclick = () => setMode('signup');

  if (!configured) {
    $('startup').textContent =
      'Setup needed: replace the Project URL and publishable/anon key in supabase-config.js, then refresh.';
    return;
  }

  supabase.auth.onAuthStateChange((_event, next) => publish(next));

  $('auth-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting) return;

    submitting = true;

    const controls = [...$('auth-form').elements];
    controls.forEach(control => { control.disabled = true; });

    $('auth-message').className = 'message';
    $('auth-message').textContent = 'Please wait…';

    const email = $('email').value.trim();
    const password = $('password').value;

    try {
      const redirect = new URL('./index.html', location.href).href;

      const result = mode === 'signup'
        ? await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: redirect }
          })
        : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) throw result.error;

      $('password').value = '';

      $('auth-message').textContent = result.data.session
        ? 'Signed in successfully.'
        : 'Check your email (including spam) to confirm your account, then log in. If already registered, try logging in.';
    } catch (error) {
      $('auth-message').className = 'message error';
      $('auth-message').textContent = error.message;
    } finally {
      submitting = false;
      controls.forEach(control => { control.disabled = false; });
      setActivity(activity);
    }
  });

  $('logout').onclick = async () => {
    if (activity || submitting) return;

    $('logout').disabled = true;

    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;

      publish(null);
      $('auth-message').textContent =
        'You have been logged out on this device.';
    } catch (error) {
      alert(`Could not log out: ${error.message}`);
    } finally {
      setActivity(activity);
    }
  };

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    publish(data.session);
  } catch (error) {
    publish(null);
    $('auth-message').textContent =
      `Session could not be restored: ${error.message}`;
  }
}