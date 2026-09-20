import { JHARKHAND_DISTRICTS } from '@akhra/shared';
import { districts, type Transaction } from '../index';

export async function seedDistricts(tx: Transaction): Promise<number> {
  await tx
    .insert(districts)
    .values(
      JHARKHAND_DISTRICTS.map((d) => ({
        code: d.code,
        nameEn: d.nameEn,
        nameHi: d.nameHi,
        division: d.division,
        headquarters: d.headquarters,
        lat: d.lat,
        lng: d.lng,
      })),
    )
    .onConflictDoUpdate({
      target: districts.code,
      set: { nameEn: districts.nameEn },
    });
  return JHARKHAND_DISTRICTS.length;
}
