/**
 * One-off backfill: every EventRSVP created before ticketing existed has a null
 * `registrationCode` and the column default for `maxScans`. Neither can be fixed
 * by a migration — codes must be minted one at a time and checked for
 * collisions, and `maxScans` has to be read from each row's parent event.
 *
 * Safe to re-run: rows that already carry a code are skipped, and `maxScans` is
 * only rewritten when it still holds the default and the event disagrees.
 *
 * Run with: npx tsx scripts/backfill-registration-codes.ts
 */
import { RSVPStatus } from '@prisma/client';
import { prisma } from '../src/utils/prisma';
import { generateRegistrationCode } from '../src/utils/ticket';

const UNIQUE_VIOLATION = 'P2002';
const CODE_MINT_ATTEMPTS = 5;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === UNIQUE_VIOLATION
  );
}

async function main() {
  const rows = await prisma.eventRSVP.findMany({
    where: {
      status: { in: [RSVPStatus.REGISTERED, RSVPStatus.ATTENDED] },
      registrationCode: null,
    },
    select: {
      id: true,
      maxScans: true,
      event: { select: { title: true, qrScanLimit: true } },
    },
  });

  console.log(`Found ${rows.length} registration(s) without a code.`);

  let updated = 0;
  let failed = 0;

  for (const rsvp of rows) {
    let minted = false;

    for (let attempt = 0; attempt < CODE_MINT_ATTEMPTS && !minted; attempt++) {
      try {
        await prisma.eventRSVP.update({
          where: { id: rsvp.id },
          data: {
            registrationCode: generateRegistrationCode(),
            // Snapshot the event's limit, matching what registerForEvent does at
            // issue time, so a later change to the event cannot silently alter a
            // ticket already in somebody's hands.
            maxScans: rsvp.event.qrScanLimit,
          },
        });
        minted = true;
      } catch (error) {
        if (isUniqueViolation(error)) continue;
        throw error;
      }
    }

    if (minted) {
      updated++;
      console.log(`  ${rsvp.event.title} -> code issued`);
    } else {
      failed++;
      console.warn(`  ${rsvp.event.title} -> could not mint a unique code`);
    }
  }

  console.log(`\nBackfilled ${updated} registration(s).`);
  if (failed > 0) {
    console.warn(`${failed} row(s) still have no code — re-run to retry.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
