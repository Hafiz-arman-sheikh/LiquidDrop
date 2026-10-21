import { supabase, BUCKET, MAX_FILE_BYTES } from './supabase-config.js';

import {
  initAuth,
  getUser,
  requireUser,
  onUserChange,
  setActivity
} from './auth.js';

const $ = id => document.getElementById(id);

const make = (tag, className = '', text = '') => {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
};

let files = [];
let queue = [];
let epoch = 0;
let loadVersion = 0;

let running = false;
let deleting = false;
let view = 'grid';

let previewFile = null;
let deleteFile = null;
let previewVersion = 0;
let previewURL = null;

const objectURLs = new Map();

const bytes = value => {
  if (value === 0) return '0 B';

  const units = ['B', 'KiB', 'MiB', 'GiB'];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    3
  );

  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
};

const date = value => new Date(value).toLocaleDateString(
  undefined,
  { year: 'numeric', month: 'short', day: 'numeric' }
);

const category = file => {
  const mime = file.mime_type || '';

  if (mime === 'application/pdf') return 'pdf';
  if (/^image\//.test(mime)) return 'image';
  if (/^audio\//.test(mime)) return 'audio';
  if (/^video\//.test(mime)) return 'video';

  return 'other';
};

function toast(message, error = false) {
  const node = make('div', `toast${error ? ' error' : ''}`, message);
  $('toasts').append(node);

  setTimeout(() => node.remove(), error ? 12000 : 6000);
}

function sameAccount(owner, generation) {
  return getUser()?.id === owner && epoch === generation;
}

function assertAccount(owner, generation) {
  if (!sameAccount(owner, generation)) {
    throw new Error('Account changed. Refresh and try again.');
  }
}

function refreshBusy() {
  setActivity(running || deleting);
  $('choose-files').disabled = deleting;
  $('clear-queue').disabled = running;
}

function keepURL(blob) {
  const url = URL.createObjectURL(blob);
  objectURLs.set(url, null);
  return url;
}

function releaseURL(url) {
  clearTimeout(objectURLs.get(url));
  URL.revokeObjectURL(url);
  objectURLs.delete(url);
}

function clearURLs() {
  [...objectURLs.keys()].forEach(releaseURL);
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;

  $('theme-toggle').setAttribute(
    'aria-label',
    `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`
  );
}

let savedTheme;

try {
  savedTheme = localStorage.getItem('liquiddrop-theme');
} catch {
  // Browser storage may be blocked.
}

setTheme(
  savedTheme === 'dark' || savedTheme === 'light'
    ? savedTheme
    : matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
);

$('theme-toggle').onclick = () => {
  const theme = document.documentElement.dataset.theme === 'dark'
    ? 'light'
    : 'dark';

  setTheme(theme);

  try {
    localStorage.setItem('liquiddrop-theme', theme);
  } catch {
    // Theme still works in memory.
  }
};

$('upload-limit').textContent =
  `Any file type · Up to ${bytes(MAX_FILE_BYTES)} per file · Private to your account`;

/* ---------------- Upload queue ---------------- */

function drawQueue() {
  $('queue-panel').hidden = queue.length === 0;
  $('queue').replaceChildren();

  queue.forEach(item => {
    const row = make('li', `queue-item ${item.state}`);
    const info = make('div', 'queue-info');

    info.append(
      make('p', 'queue-name', item.file.name),
      make(
        'p',
        'queue-detail',
        `${bytes(item.file.size)} · ${item.message || item.state}`
      )
    );

    row.append(info);

    if (item.state === 'uploading') {
      const spinner = make('span', 'spinner');
      spinner.setAttribute('aria-label', 'Uploading');
      row.append(spinner);
    } else if (item.state === 'failed') {
      const retry = make('button', 'button secondary', 'Retry');
      retry.disabled = running || deleting;

      retry.onclick = () => {
        if (running || deleting || !getUser()) return;

        item.state = 'waiting';
        item.message = '';

        drawQueue();
        void processQueue();
      };

      row.append(retry);
    } else {
      row.append(
        make(
          'span',
          'queue-state',
          item.state === 'completed' ? '✓ Completed' : 'Waiting'
        )
      );
    }

    $('queue').append(row);
  });
}

function safeName(name) {
  const clean = name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-100);

  return /^[a-zA-Z0-9_]/.test(clean) ? clean : `file_${clean}`;
}

function enqueue(incoming) {
  if (!getUser()) {
    toast('Log in before uploading files.', true);
    return;
  }

  if (deleting) {
    toast('Wait for deletion to finish.');
    return;
  }

  for (const file of incoming) {
    if (file.size > MAX_FILE_BYTES) {
      toast(
        `${file.name}: maximum size is ${bytes(MAX_FILE_BYTES)}.`,
        true
      );
      continue;
    }

    if (file.name.length > 1024) {
      toast('Filename is too long (maximum 1024 characters).', true);
      continue;
    }

    const duplicate = queue.some(item =>
      ['waiting', 'uploading'].includes(item.state) &&
      item.file.name === file.name &&
      item.file.size === file.size &&
      item.file.lastModified === file.lastModified
    );

    if (duplicate) {
      toast(`${file.name} is already in the queue.`);
      continue;
    }

    const id = crypto.randomUUID();

    queue.push({
      id,
      file,
      owner: getUser().id,
      path: `${getUser().id}/${id}/${safeName(file.name)}`,
      state: 'waiting',
      message: ''
    });
  }

  drawQueue();
  void processQueue();
}

async function findMetadata(item) {
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('id', item.id)
    .eq('owner_id', item.owner)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function uploadOne(item, generation) {
  await requireUser();
  assertAccount(item.owner, generation);

  // A stable ID lets retries reconcile responses lost during a network failure.
  if (await findMetadata(item)) return;

  assertAccount(item.owner, generation);

  const folder = `${item.owner}/${item.id}`;
  const objectName = item.path.split('/').at(-1);

  const { data: objects, error: listError } = await supabase
    .storage
    .from(BUCKET)
    .list(folder, { limit: 100 });

  if (listError) throw listError;
  assertAccount(item.owner, generation);

  if (!objects.some(object => object.name === objectName)) {
    const { error } = await supabase.storage.from(BUCKET).upload(
      item.path,
      item.file,
      {
        upsert: false,
        contentType: item.file.type || 'application/octet-stream',
        cacheControl: '0'
      }
    );

    if (error) throw error;
  }

  assertAccount(item.owner, generation);

  const { error: insertError } = await supabase.from('files').insert({
    id: item.id,
    owner_id: item.owner,
    original_name: item.file.name,
    object_path: item.path,
    mime_type: item.file.type || 'application/octet-stream',
    size_bytes: item.file.size
  });

  if (!insertError) return;

  // Do not remove an object if metadata may already have committed.
  let saved;

  try {
    saved = await findMetadata(item);
  } catch {
    throw new Error(
      `${insertError.message}. Save status is uncertain; Retry will check it before uploading again.`
    );
  }

  if (saved) return;

  assertAccount(item.owner, generation);

  const { error: cleanupError } = await supabase
    .storage
    .from(BUCKET)
    .remove([item.path]);

  throw new Error(
    `${insertError.message}${
      cleanupError
        ? '. Object cleanup failed; Retry will reconcile it.'
        : '. Uploaded object was cleaned up.'
    }`
  );
}

async function processQueue() {
  if (
    running ||
    deleting ||
    !getUser() ||
    !queue.some(item => item.state === 'waiting')
  ) return;

  running = true;
  refreshBusy();
  drawQueue();

  const generation = epoch;
  const owner = getUser().id;
  let completed = 0;

  try {
    while (sameAccount(owner, generation)) {
      const item = queue.find(entry =>
        entry.state === 'waiting' && entry.owner === owner
      );

      if (!item) break;

      item.state = 'uploading';
      drawQueue();

      try {
        await uploadOne(item, generation);

        if (!sameAccount(owner, generation)) break;

        item.state = 'completed';
        item.message = 'Saved in your private space';
        completed++;
      } catch (error) {
        if (!sameAccount(owner, generation)) break;

        item.state = 'failed';
        item.message =
          error.message || 'Upload failed. Retry when connected.';
      }

      drawQueue();
    }
  } finally {
    running = false;
    refreshBusy();
    drawQueue();

    if (sameAccount(owner, generation)) {
      if (completed) {
        toast(`${completed} file${completed === 1 ? '' : 's'} saved.`);

        $('upload-success').hidden = false;
        setTimeout(() => {
          $('upload-success').hidden = true;
        }, 3500);
      }

      void loadFiles();
    } else if (getUser()) {
      // A new account may have queued files while an older request finished.
      void processQueue();
    }
  }
}

$('choose-files').onclick = () => {
  if (getUser()) $('file-input').click();
};

$('file-input').onchange = event => {
  enqueue([...event.target.files]);
  event.target.value = '';
};

$('clear-queue').onclick = () => {
  if (!running) {
    queue = queue.filter(item => item.state === 'waiting');
    drawQueue();
  }
};

/* ---------------- Drag, drop and paste ---------------- */

let dragDepth = 0;

const hasFiles = event =>
  [...(event.dataTransfer?.types || [])].includes('Files');

window.addEventListener('dragover', event => {
  if (hasFiles(event)) event.preventDefault();
});

window.addEventListener('drop', event => {
  if (hasFiles(event)) event.preventDefault();
});

$('drop-zone').addEventListener('dragenter', event => {
  if (!hasFiles(event)) return;

  event.preventDefault();
  dragDepth++;
  $('drop-zone').classList.add('dragging');
});

$('drop-zone').addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);

  if (!dragDepth) {
    $('drop-zone').classList.remove('dragging');
  }
});

$('drop-zone').addEventListener('drop', event => {
  event.preventDefault();
  dragDepth = 0;
  $('drop-zone').classList.remove('dragging');
  enqueue([...event.dataTransfer.files]);
});

document.addEventListener('paste', event => {
  if (
    event.target.isContentEditable ||
    event.target.closest('input, textarea, [role="textbox"]')
  ) return;

  const images = [...(event.clipboardData?.items || [])]
    .filter(item =>
      item.kind === 'file' && item.type.startsWith('image/')
    )
    .map(item => item.getAsFile())
    .filter(Boolean);

  if (images.length) {
    event.preventDefault();
    enqueue(images);
  }
});

/* ---------------- Saved file listing ---------------- */

function skeletons() {
  $('files').replaceChildren();

  for (let i = 0; i < 3; i++) {
    const card = make('div', 'glass skeleton');
    card.setAttribute('aria-hidden', 'true');
    card.append(make('div'), make('div'), make('div'));
    $('files').append(card);
  }
}

async function loadFiles() {
  if (!getUser()) return;

  const owner = getUser().id;
  const generation = epoch;
  const request = ++loadVersion;

  const current = () =>
    sameAccount(owner, generation) && request === loadVersion;

  $('load-error').hidden = true;
  $('empty-state').hidden = true;
  $('files').setAttribute('aria-busy', 'true');
  $('list-status').textContent = 'Loading your files…';
  $('file-count').textContent = '—';
  $('total-size').textContent = '—';

  skeletons();

  try {
    await requireUser();
    assertAccount(owner, generation);

    // Fetch all rows in pages; do not silently stop at the API row cap.
    const all = [];

    for (let start = 0; ; start += 500) {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('owner_id', owner)
        .order('id')
        .range(start, start + 499);

      if (error) throw error;
      if (!current()) return;

      all.push(...data);

      if (data.length < 500) break;
    }

    if (!current()) return;

    files = all;

    $('file-count').textContent = String(files.length);
    $('total-size').textContent = bytes(
      files.reduce((sum, file) => sum + Number(file.size_bytes), 0)
    );

    renderFiles();
  } catch (error) {
    if (!current()) return;

    files = [];
    $('files').replaceChildren();
    $('load-error').hidden = false;
    $('load-error-text').textContent = error.message;
    $('list-status').textContent = 'Files are temporarily unavailable.';
  } finally {
    if (current()) {
      $('files').setAttribute('aria-busy', 'false');
    }
  }
}

function action(label, handler, className = '') {
  const button = make(
    'button',
    `button secondary ${className}`,
    label
  );

  button.onclick = async () => {
    if (button.disabled) return;
    button.disabled = true;

    try {
      await handler();
    } catch (error) {
      toast(error.message, true);
    } finally {
      button.disabled = false;
    }
  };

  return button;
}

function renderFiles() {
  const term = $('search').value.toLocaleLowerCase().trim();

  const filtered = files.filter(file =>
    file.original_name.toLocaleLowerCase().includes(term) &&
    (
      $('category').value === 'all' ||
      category(file) === $('category').value
    )
  );

  const sorting = {
    newest: (a, b) => b.created_at.localeCompare(a.created_at),
    oldest: (a, b) => a.created_at.localeCompare(b.created_at),
    name: (a, b) => a.original_name.localeCompare(b.original_name),
    size: (a, b) => b.size_bytes - a.size_bytes
  };

  filtered.sort(sorting[$('sort').value]);

  $('files').replaceChildren();
  $('files').className = `files ${view}`;

  filtered.forEach(file => {
    const card = make('article', 'glass file-card');

    const extension = file.original_name.includes('.')
      ? file.original_name.split('.').at(-1).slice(0, 7).toUpperCase()
      : 'FILE';

    const icon = make(
      'div',
      `file-icon ${category(file)}`,
      extension || 'FILE'
    );

    icon.setAttribute('aria-hidden', 'true');

    const body = make('div', 'file-body');

    body.append(
      make('h3', 'file-name', file.original_name),
      make(
        'p',
        'file-meta',
        `${bytes(Number(file.size_bytes))} · ${date(file.created_at)} · ${file.mime_type}`
      ),
      make('span', 'file-status', '● Saved')
    );

    const actions = make('div', 'file-actions');

    actions.append(
      action('Preview', () => openPreview(file)),
      action('Download', () => downloadFile(file)),
      action('Delete', () => openDelete(file), 'delete')
    );

    card.append(icon, body, actions);
    $('files').append(card);
  });

  $('empty-state').hidden = filtered.length > 0;

  $('empty-heading').textContent = files.length
    ? 'No matching files'
    : 'A fresh start';

  $('empty-text').textContent = files.length
    ? 'Try another filename or file type.'
    : 'Upload your first file to make this space yours.';

  $('list-status').textContent =
    `${filtered.length} of ${files.length} files`;
}

['search', 'category', 'sort'].forEach(id => {
  $(id).addEventListener(
    id === 'search' ? 'input' : 'change',
    () => {
      if (
        $('files').getAttribute('aria-busy') !== 'true' &&
        $('load-error').hidden
      ) {
        renderFiles();
      }
    }
  );
});

function switchView(next) {
  view = next;

  $('grid-view').setAttribute('aria-pressed', String(next === 'grid'));
  $('list-view').setAttribute('aria-pressed', String(next === 'list'));
  $('files').className = `files ${view}`;
}

$('grid-view').onclick = () => switchView('grid');
$('list-view').onclick = () => switchView('list');
$('refresh-files').onclick = loadFiles;
$('retry-load').onclick = loadFiles;

/* ---------------- Authenticated downloads and previews ---------------- */

async function getBlob(file) {
  const generation = epoch;
  const user = await requireUser();

  if (user.id !== file.owner_id) {
    throw new Error('This file belongs to another account.');
  }

  const { data, error } = await supabase
    .storage
    .from(BUCKET)
    .download(file.object_path);

  if (error) throw error;

  assertAccount(file.owner_id, generation);
  return data;
}

async function downloadFile(file) {
  const blob = await getBlob(file);

  const url = keepURL(
    new Blob([blob], { type: 'application/octet-stream' })
  );

  const link = make('a');
  link.href = url;
  link.download = file.original_name;

  document.body.append(link);
  link.click();
  link.remove();

  objectURLs.set(
    url,
    setTimeout(() => releaseURL(url), 60000)
  );
}

function closePreview() {
  previewVersion++;
  previewFile = null;

  $('preview-content').replaceChildren();

  if (previewURL) {
    releaseURL(previewURL);
    previewURL = null;
  }
}

$('close-preview').onclick = () => $('preview-dialog').close();

$('preview-dialog').addEventListener('close', closePreview);

const safeImages = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/bmp'
]);

async function openPreview(file) {
  if (getUser()?.id !== file.owner_id) return;

  closePreview();

  const request = previewVersion;
  previewFile = file;

  $('preview-title').textContent = file.original_name;

  $('preview-content').replaceChildren(
    make('p', 'muted', 'Preparing preview…')
  );

  if (!$('preview-dialog').open) {
    $('preview-dialog').showModal();
  }

  const mime = file.mime_type;

  const kind = safeImages.has(mime)
    ? 'img'
    : mime === 'application/pdf'
      ? 'iframe'
      : /^(audio|video)\/[a-zA-Z0-9.+-]+$/.test(mime)
        ? mime.split('/')[0]
        : null;

  if (!kind) {
    $('preview-content').replaceChildren(
      make(
        'p',
        'muted',
        'No safe preview for this type. Download it to open in a suitable app. HTML and SVG are download-only.'
      )
    );
    return;
  }

  try {
    const blob = await getBlob(file);

    if (
      request !== previewVersion ||
      !$('preview-dialog').open
    ) return;

    const url = keepURL(new Blob([blob], { type: mime }));
    previewURL = url;

    const media = document.createElement(kind);

    if (kind === 'img') {
      media.alt = file.original_name;
    }

    if (kind === 'iframe') {
      media.title = `PDF preview: ${file.original_name}`;

      // No uploaded scripts or same-origin permissions.
      media.setAttribute('sandbox', '');
    }

    if (kind === 'audio' || kind === 'video') {
      media.controls = true;
      media.preload = 'metadata';
    }

    media.onerror = () => {
      if (request !== previewVersion) return;

      $('preview-content').replaceChildren(
        make(
          'p',
          'muted',
          'This browser cannot preview the file. Use Download file below.'
        )
      );

      releaseURL(url);
    };

    media.src = url;
    $('preview-content').replaceChildren(media);

    if (kind === 'iframe') {
      $('preview-content').append(
        make(
          'p',
          'small',
          'PDF viewer unavailable or blank? Use Download file below.'
        )
      );
    }
  } catch (error) {
    if (request === previewVersion) {
      $('preview-content').replaceChildren(
        action(
          `Preview failed: ${error.message} — Retry`,
          () => openPreview(file)
        )
      );
    }
  }
}

$('preview-download').onclick = async () => {
  if (!previewFile) return;

  $('preview-download').disabled = true;

  try {
    await downloadFile(previewFile);
  } catch (error) {
    toast(error.message, true);
  } finally {
    $('preview-download').disabled = false;
  }
};

/* ---------------- File deletion ---------------- */

function openDelete(file) {
  if (running || deleting) {
    toast('Wait for current uploads or deletion to finish.');
    return;
  }

  if (getUser()?.id !== file.owner_id) return;

  deleteFile = file;
  $('delete-name').textContent = file.original_name;
  $('delete-message').textContent = '';
  $('delete-dialog').showModal();
}

$('cancel-delete').onclick = () => $('delete-dialog').close();

$('delete-dialog').addEventListener('cancel', event => {
  if (deleting) event.preventDefault();
});

$('confirm-delete').onclick = async () => {
  if (!deleteFile || deleting || running) return;

  const file = deleteFile;
  const generation = epoch;

  deleting = true;
  refreshBusy();
  drawQueue();

  $('confirm-delete').disabled = true;
  $('cancel-delete').disabled = true;
  $('delete-message').textContent = 'Deleting…';

  let objectRemoved = false;

  try {
    await requireUser();
    assertAccount(file.owner_id, generation);

    const { error: storageError } = await supabase
      .storage
      .from(BUCKET)
      .remove([file.object_path]);

    if (storageError) throw storageError;

    objectRemoved = true;
    assertAccount(file.owner_id, generation);

    const { error } = await supabase
      .from('files')
      .delete()
      .eq('id', file.id)
      .eq('owner_id', file.owner_id);

    if (error) throw error;

    const { data: remaining, error: checkError } = await supabase
      .from('files')
      .select('id')
      .eq('id', file.id)
      .eq('owner_id', file.owner_id)
      .maybeSingle();

    if (checkError) throw checkError;

    if (remaining) {
      throw new Error(
        'Metadata still exists. Check the DELETE policy and retry.'
      );
    }

    assertAccount(file.owner_id, generation);

    $('delete-dialog').close();
    toast('File deleted.');

    await loadFiles();
  } catch (error) {
    if (sameAccount(file.owner_id, generation)) {
      $('delete-message').textContent = `${error.message}${
        objectRemoved
          ? ' Storage removal succeeded, but metadata removal is unconfirmed. Retry Delete to finish cleanup.'
          : ' Deletion is unconfirmed. Retry when connected.'
      }`;
    }
  } finally {
    deleting = false;
    refreshBusy();
    drawQueue();

    $('confirm-delete').disabled = false;
    $('cancel-delete').disabled = false;
  }
};

/* ---------------- Session lifecycle ---------------- */

onUserChange(user => {
  epoch++;
  loadVersion++;

  files = [];
  queue = [];

  $('files').replaceChildren();
  $('queue').replaceChildren();
  $('queue-panel').hidden = true;

  $('search').value = '';
  $('category').value = 'all';

  $('file-count').textContent = '—';
  $('total-size').textContent = '—';

  $('load-error').hidden = true;
  $('empty-state').hidden = true;
  $('upload-success').hidden = true;
  $('toasts').replaceChildren();

  $('preview-dialog').close();
  closePreview();
  clearURLs();

  $('delete-dialog').close();
  deleteFile = null;

  // Never await another Supabase method inside onAuthStateChange.
  if (user) {
    setTimeout(() => {
      if (getUser()?.id === user.id) void loadFiles();
    }, 0);
  }
});

window.addEventListener('beforeunload', event => {
  if (running || deleting) {
    event.preventDefault();
    event.returnValue = '';
  }
});

window.addEventListener('pagehide', clearURLs);

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && getUser()) {
    void requireUser().catch(error => toast(error.message, true));
  }
});

initAuth().catch(error => {
  $('startup').hidden = false;
  $('startup').textContent = `Startup failed: ${error.message}`;
});