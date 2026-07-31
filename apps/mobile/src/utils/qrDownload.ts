import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Matches `data:image/png;base64,iVBORw0…` and captures the payload. */
const DATA_URI = /^data:image\/(png|jpe?g);base64,(.+)$/i;

/** Anything that is not safe in a filename on either platform. */
const UNSAFE_FILENAME = /[^A-Za-z0-9._-]+/g;

export class QrSaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QrSaveError';
  }
}

/**
 * Writes a QR data URI to a cache file and hands it to the OS share sheet, from
 * where the member can save it to Photos, Files, or send it to somebody.
 *
 * The share sheet is used rather than writing straight into the gallery because
 * that would need `expo-media-library` — a native module, and so a full rebuild
 * of the checked-in Android project. The share sheet reaches the same
 * destinations through a dialog the user already knows.
 *
 * @param dataUrl The `qrDataUrl` from a registration, as produced by the server.
 * @param code    The registration code, used to name the file.
 * @throws QrSaveError when the QR is missing, malformed, or sharing is unavailable.
 */
export async function saveQrToDevice(
  dataUrl: string | null | undefined,
  code: string | null | undefined
): Promise<void> {
  if (!dataUrl) {
    throw new QrSaveError('This ticket has no QR code yet. Pull down to refresh and try again.');
  }

  const match = DATA_URI.exec(dataUrl.trim());
  if (!match) {
    throw new QrSaveError('The QR code image could not be read.');
  }

  const [, format, base64] = match;
  const extension = format.toLowerCase().startsWith('jp') ? 'jpg' : 'png';
  const safeCode = (code ?? 'ticket').replace(UNSAFE_FILENAME, '-');
  const filename = `MYS-Ticket-${safeCode}.${extension}`;

  if (!(await Sharing.isAvailableAsync())) {
    throw new QrSaveError('Sharing is not available on this device.');
  }

  const file = new File(Paths.cache, filename);

  // A ticket saved earlier this session leaves the file behind; overwrite it so
  // the member always shares the QR that is on screen right now.
  file.create({ overwrite: true, intermediates: true });
  file.write(base64, { encoding: 'base64' });

  try {
    await Sharing.shareAsync(file.uri, {
      mimeType: `image/${extension === 'jpg' ? 'jpeg' : 'png'}`,
      dialogTitle: 'Save or share your event ticket',
      UTI: extension === 'jpg' ? 'public.jpeg' : 'public.png',
    });
  } finally {
    // The share sheet has copied the bytes by the time it resolves, and the
    // cache is not the member's storage — leaving a stale QR there is worse
    // than the cost of rewriting it next time.
    try {
      file.delete();
    } catch {
      // A file we cannot delete is the OS's problem, not the member's; the share
      // already succeeded and cache is reclaimable.
    }
  }
}
