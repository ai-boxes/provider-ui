import { providerKinds } from '../providers/provider-format.ts'
import type {
  DashboardAccountCounts,
  DashboardAccountMetrics,
  DashboardFailureLayers,
  DashboardOverview,
  DashboardProviders,
  DashboardQuota,
  DashboardSeries,
} from './dashboard-types.ts'
import {
  requireArray,
  requireBoolean,
  requireEnum,
  requireNonEmptyString,
  requireNonNegativeInteger,
  requirePositiveInteger,
  requireRecord,
  requireTimestamp,
} from '../../lib/api/decode.ts'

const authStates = ['active', 'reauth_required'] as const

export function decodeDashboardOverview(value: unknown): DashboardOverview {
  const record = requireRecord(value, 'dashboard overview')

  return {
    fromMs: requireTimestamp(record.from_ms, 'dashboard range start'),
    toMs: requireTimestamp(record.to_ms, 'dashboard range end'),
    requests: requireNonNegativeInteger(record.requests, 'dashboard requests'),
    successes: requireNonNegativeInteger(record.successes, 'dashboard successes'),
    failures: requireNonNegativeInteger(record.failures, 'dashboard failures'),
    successRate: nullableRate(record.success_rate, 'dashboard success rate'),
    tokens: decodeTokens(record.tokens),
    totalTokens: decodeTokens(record.total_tokens),
    costUsd: decodeCost(record.cost),
    avgResponseMs: nullableNonNegativeInteger(
      record.avg_response_ms,
      'dashboard average response',
    ),
    ttftP50Ms: nullableNonNegativeInteger(
      record.ttft_p50_ms,
      'dashboard TTFT p50',
    ),
    accounts: decodeAccountCounts(record.accounts),
    failureLayers: decodeFailureLayers(record.failure_layers),
  }
}

export function decodeDashboardProviders(value: unknown): DashboardProviders {
  const record = requireRecord(value, 'dashboard providers')
  const accounts = requireArray(record.accounts, 'dashboard provider accounts').map(
    (account, index) => decodeAccount(account, `dashboard account ${index + 1}`),
  )
  return {
    accounts,
    groups: decodeGroups(record.groups),
    series: decodeSeries(record.series),
  }
}

function decodeAccountCounts(value: unknown): DashboardAccountCounts {
  const record = requireRecord(value, 'dashboard account counts')
  return {
    active: requireNonNegativeInteger(record.active, 'dashboard active accounts'),
    reauthRequired: requireNonNegativeInteger(
      record.reauth_required,
      'dashboard accounts requiring reauth',
    ),
    disabled: requireNonNegativeInteger(
      record.disabled,
      'dashboard disabled accounts',
    ),
  }
}

function decodeFailureLayers(value: unknown): DashboardFailureLayers {
  const record = requireRecord(value, 'dashboard failure layers')
  return {
    upstreamFailedRequests: requireNonNegativeInteger(
      record.upstream_failed_requests,
      'dashboard upstream failures',
    ),
    zeroDispatchLogicalFailures: requireNonNegativeInteger(
      record.zero_dispatch_logical_failures,
      'dashboard zero-dispatch failures',
    ),
  }
}

function decodeGroups(value: unknown): string[] {
  return requireArray(value, 'dashboard groups').map((group, index) =>
    requireNonEmptyString(group, `dashboard group ${index + 1}`),
  )
}

function decodeTokens(value: unknown): DashboardOverview['tokens'] {
  const record = requireRecord(value, 'dashboard tokens')
  const effectiveInput = requireNonNegativeInteger(
    record.effective_input,
    'dashboard effective input tokens',
  )
  const output = requireNonNegativeInteger(record.output, 'dashboard output tokens')
  const total = requireNonNegativeInteger(record.total, 'dashboard total tokens')
  if (total !== effectiveInput + output) {
    throw new TypeError('dashboard total tokens do not match input and output')
  }
  return {
    cacheReadInput: requireNonNegativeInteger(
      record.cache_read_input,
      'dashboard cache read tokens',
    ),
    effectiveInput,
    output,
    total,
  }
}

function decodeCost(value: unknown): string | null {
  const record = requireRecord(value, 'dashboard cost')
  if (record.usd == null) {
    return null
  }
  if (typeof record.usd !== 'string' || !/^\d+(\.\d+)?$/.test(record.usd)) {
    throw new TypeError('dashboard cost must be a non-negative decimal amount')
  }
  return record.usd
}

function decodeAccount(value: unknown, label: string): DashboardAccountMetrics {
  const record = requireRecord(value, label)
  return {
    accountId: requireNonEmptyString(record.account_id, `${label} ID`),
    provider: requireEnum(record.provider, providerKinds, `${label} provider`),
    label: requireNonEmptyString(record.label, `${label} label`),
    groupLabel: requireNonEmptyString(record.group_label, `${label} group`),
    enabled: requireBoolean(record.enabled, `${label} enabled state`),
    authState: requireEnum(record.auth_state, authStates, `${label} auth state`),
    requests: requireNonNegativeInteger(record.requests, `${label} requests`),
    successes: requireNonNegativeInteger(record.successes, `${label} successes`),
    failures: requireNonNegativeInteger(record.failures, `${label} failures`),
    successRate: nullableRate(record.success_rate, `${label} success rate`),
    ttftP50Ms: nullableNonNegativeInteger(record.ttft_p50_ms, `${label} TTFT p50`),
    durationP95Ms: nullableNonNegativeInteger(
      record.duration_p95_ms,
      `${label} duration p95`,
    ),
    quota: decodeQuota(record.quota, `${label} quota`),
  }
}

function decodeSeries(value: unknown): DashboardSeries {
  const record = requireRecord(value, 'dashboard series')
  const buckets = requireArray(record.buckets, 'dashboard series buckets').map(
    (bucket, index) => requireTimestamp(bucket, `dashboard bucket ${index + 1}`),
  )
  const requests = requireArray(record.requests, 'dashboard series requests').map(
    (request, index) =>
      requireNonNegativeInteger(request, `dashboard bucket ${index + 1} requests`),
  )
  const failures = requireArray(record.failures, 'dashboard series failures').map(
    (failure, index) =>
      requireNonNegativeInteger(failure, `dashboard bucket ${index + 1} failures`),
  )
  if (requests.length !== buckets.length || failures.length !== buckets.length) {
    throw new TypeError('dashboard series arrays must have the same length')
  }

  return {
    bucketMs: requirePositiveInteger(record.bucket_ms, 'dashboard bucket size'),
    buckets,
    requests,
    failures,
  }
}

function decodeQuota(value: unknown, label: string): DashboardQuota {
  const record = requireRecord(value, label)
  return {
    tightestRemainingPercent: nullableNumber(
      record.tightest_remaining_percent,
      `${label} remaining percent`,
    ),
  }
}

function nullableNonNegativeInteger(value: unknown, label: string): number | null {
  return value == null ? null : requireNonNegativeInteger(value, label)
}

function nullableRate(value: unknown, label: string): number | null {
  const rate = nullableNumber(value, label)
  if (rate !== null && (rate < 0 || rate > 1)) {
    throw new TypeError(`${label} must be between 0 and 1`)
  }
  return rate
}

function nullableNumber(value: unknown, label: string): number | null {
  if (value == null) {
    return null
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number`)
  }
  return value
}
