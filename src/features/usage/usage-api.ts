import { requestAuthenticatedData } from '@/features/auth/authenticated-request'
import { decodeUsageOverview } from '@/features/usage/usage-decoders'
import type {
  UsageAttributionBasis,
  UsageOverview,
  UsageRange,
} from '@/features/usage/usage-types'

export async function getUsageOverview(
  range: UsageRange,
  basis: UsageAttributionBasis,
): Promise<UsageOverview> {
  const params = new URLSearchParams({
    from_ms: String(range.fromMs),
    to_ms: String(range.toMs),
    basis,
  })

  const overview = await requestAuthenticatedData(
    `/api/v1/usage/overview?${params.toString()}`,
    decodeUsageOverview,
  )

  // The two attribution bases are both correct and give different totals, so a
  // response counting something other than what was asked for would silently
  // redefine every number on the page. The UI does not name the basis, which
  // makes this the only place the mismatch could be caught.
  if (overview.attributionBasis !== basis) {
    throw new TypeError('usage overview used a different attribution basis')
  }

  return overview
}
