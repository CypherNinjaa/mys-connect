/**
 * Presentation metadata for app settings.
 *
 * `AppSetting` rows only carry `key`, `value`, `type` and `group`, so the
 * human-readable label, help text and the right editor widget are declared
 * here. Unknown keys still render — they fall back to a humanized label and
 * an editor derived from the stored `type`.
 */

export type SettingEditor = 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'json' | 'email' | 'tel' | 'csv';

export interface SettingMeta {
  label: string;
  description?: string;
  /** Overrides the editor implied by the stored type */
  editor?: SettingEditor;
  options?: { value: string; label: string }[];
  placeholder?: string;
  /** Suffix rendered inside number inputs, e.g. 'MB' */
  unit?: string;
  min?: number;
  max?: number;
}

export const SETTING_META: Record<string, SettingMeta> = {
  'app.name': {
    label: 'App Name',
    description: 'Shown in the mobile app header and on the sign-in screen.',
    placeholder: 'MYS CONNECT',
  },
  'app.tagline': {
    label: 'Tagline',
    description: 'One-line strapline displayed beneath the app name.',
    placeholder: 'Connecting Every Member, Digitally',
  },
  'app.org_full_name': {
    label: 'Organisation Full Name',
    description: 'Formal name used on certificates, exports and receipts.',
  },
  'app.city': {
    label: 'City / Chapter',
    description: 'Primary city this chapter operates in.',
  },
  'app.motto_hindi': {
    label: 'Motto (Hindi)',
    description: 'Displayed on the app splash and about screens.',
    editor: 'textarea',
  },
  'app.contact_email': {
    label: 'Contact Email',
    description: 'Where members are directed for support enquiries.',
    editor: 'email',
    placeholder: 'contact@example.org',
  },
  'app.contact_phone': {
    label: 'Contact Phone',
    description: 'Helpline number surfaced in the app’s contact card.',
    editor: 'tel',
    placeholder: '+91-9876543210',
  },
  'registration.requires_approval': {
    label: 'Require Admin Approval',
    description: 'New sign-ups stay Pending until an admin approves them. Turn off to activate members instantly.',
  },
  'registration.default_role': {
    label: 'Default Role',
    description: 'Role assigned to a member on approval.',
    editor: 'select',
    options: [
      { value: 'MEMBER', label: 'Member' },
      { value: 'VOLUNTEER', label: 'Volunteer' },
      { value: 'EXECUTIVE', label: 'Executive' },
      { value: 'GUEST', label: 'Guest' },
    ],
  },
  'upload.max_image_size_mb': {
    label: 'Max Image Size',
    description: 'Rejects uploads larger than this. The server hard limit is 10 MB.',
    unit: 'MB',
    min: 1,
    max: 10,
  },
  'upload.max_images_per_album': {
    label: 'Max Photos Per Album',
    description: 'Upper bound on photos in a single album upload batch.',
    unit: 'photos',
    min: 1,
    max: 500,
  },
  'upload.allowed_image_types': {
    label: 'Allowed Image Types',
    description: 'Comma-separated MIME types accepted by the uploader.',
    editor: 'csv',
    placeholder: 'image/jpeg,image/png,image/webp',
  },
  'notification.enable_push': {
    label: 'Enable Push Notifications',
    description: 'Master switch for member push delivery. Off means notices are saved but never pushed.',
  },
};

export interface GroupMeta {
  label: string;
  description: string;
  /** Lower sorts first; unknown groups fall to the end alphabetically. */
  order: number;
}

export const GROUP_META: Record<string, GroupMeta> = {
  general: {
    label: 'General',
    description: 'Branding and identity shown throughout the member app.',
    order: 1,
  },
  contact: {
    label: 'Contact',
    description: 'How members reach the organisation for help.',
    order: 2,
  },
  registration: {
    label: 'Registration',
    description: 'Controls what happens when someone signs up.',
    order: 3,
  },
  upload: {
    label: 'Uploads & Media',
    description: 'Limits applied to images uploaded by admins.',
    order: 4,
  },
  notification: {
    label: 'Notifications',
    description: 'Delivery switches for push and in-app alerts.',
    order: 5,
  },
};

/** 'app.contact_email' -> 'Contact email' (drops the group prefix). */
export function fallbackLabel(key: string): string {
  const tail = key.includes('.') ? key.slice(key.indexOf('.') + 1) : key;
  const spaced = tail.replace(/[_.-]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function settingMeta(key: string): SettingMeta {
  return SETTING_META[key] ?? { label: fallbackLabel(key) };
}

export function groupMeta(group: string): GroupMeta {
  return (
    GROUP_META[group] ?? {
      label: group.charAt(0).toUpperCase() + group.slice(1),
      description: 'Additional configuration.',
      order: 99,
    }
  );
}

/** Pick the editor widget: explicit override first, otherwise the stored type. */
export function resolveEditor(key: string, type: string): SettingEditor {
  const meta = SETTING_META[key];
  if (meta?.editor) return meta.editor;
  switch (type) {
    case 'boolean':
      return 'boolean';
    case 'number':
      return 'number';
    case 'json':
      return 'json';
    default:
      return 'text';
  }
}

/**
 * Client-side mirror of the server's validateSettingValue, plus the extra
 * checks the editor overrides imply. Returns null when the value is fine.
 */
export function validateSettingValue(key: string, value: string, type: string): string | null {
  const meta = SETTING_META[key];
  const editor = resolveEditor(key, type);

  if (type === 'boolean' && value !== 'true' && value !== 'false') {
    return 'Must be true or false.';
  }

  if (type === 'number') {
    if (value.trim() === '' || !Number.isFinite(Number(value))) return 'Must be a number.';
    const n = Number(value);
    if (meta?.min !== undefined && n < meta.min) return `Must be at least ${meta.min}.`;
    if (meta?.max !== undefined && n > meta.max) return `Must be at most ${meta.max}.`;
  }

  if (type === 'json') {
    try {
      JSON.parse(value);
    } catch {
      return 'Must be valid JSON.';
    }
  }

  if (editor === 'email' && value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    return 'Must be a valid email address.';
  }

  if (editor === 'csv' && !value.trim()) {
    return 'Provide at least one value.';
  }

  if (editor === 'select' && meta?.options && !meta.options.some((o) => o.value === value)) {
    return 'Choose one of the listed options.';
  }

  return null;
}
