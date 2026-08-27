import { createReadStream } from 'node:fs';
import { getEnvVar } from '@forklaunch/common';
import { ci, tokens } from '../bootstrapper';
import { CodeSetLoaderService } from '../persistence/etl/codeSetLoader.service';
import { loadHcpcsCodes } from '../persistence/etl/hcpcs.loader';
import { loadIcd10Codes } from '../persistence/etl/icd10.loader';

// Invoked externally on a schedule (k8s CronJob / cloud scheduler), same
// convention as scripts/enforce-retention.ts — there is no in-repo cron
// trigger (§7). Run at the tightest cadence of the code sets it refreshes
// (HCPCS/NCCI are quarterly).
//
// ICD10_SOURCE_PATH / HCPCS_SOURCE_PATH point at a local CSV file today —
// swapping this for a real feed later (a larger CMS/CDC release, an S3
// object, a customer's own real-CPT connector per §5) only means writing a
// new row source; the batching/upsert logic in CodeSetLoaderService and the
// loaders above stays the same. See §7.
async function main() {
  const orm = ci.resolve(tokens.Orm);
  const otel = ci.resolve(tokens.OtelCollector);
  const loader = new CodeSetLoaderService(orm.em, otel);

  const icd10SourcePath = getEnvVar('ICD10_SOURCE_PATH');
  const hcpcsSourcePath = getEnvVar('HCPCS_SOURCE_PATH');

  if (icd10SourcePath) {
    const result = await loadIcd10Codes(
      loader,
      createReadStream(icd10SourcePath, { encoding: 'utf-8' })
    );
    otel.info('[refresh-code-sets] ICD-10-CM refresh complete', result);
  } else {
    otel.warn(
      '[refresh-code-sets] ICD10_SOURCE_PATH not set — skipping ICD-10-CM refresh'
    );
  }

  if (hcpcsSourcePath) {
    const result = await loadHcpcsCodes(
      loader,
      createReadStream(hcpcsSourcePath, { encoding: 'utf-8' })
    );
    otel.info('[refresh-code-sets] HCPCS refresh complete', result);
  } else {
    otel.warn(
      '[refresh-code-sets] HCPCS_SOURCE_PATH not set — skipping HCPCS refresh'
    );
  }
}

main().catch((err) => {
  console.error('[refresh-code-sets] Fatal error', err);
  process.exit(1);
});
