import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createCompatibleProviderBody,
  importOAuthProviderBody,
  startProviderOAuthBody,
  updateProviderAccountBody,
} from '../src/features/providers/provider-payload.ts'

test('provider creation payloads include priority', () => {
  assert.deepEqual(
    createCompatibleProviderBody({
      provider: 'openai_compatible',
      label: 'OpenAI compatible',
      groupLabel: 'default',
      priority: 12,
      visibility: 'private',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'secret',
    }),
    {
      method: 'direct',
      provider: 'openai_compatible',
      label: 'OpenAI compatible',
      group_label: 'default',
      priority: 12,
      base_url: 'https://api.example.com/v1',
      api_key: 'secret',
      visibility: 'private',
    },
  )

  assert.deepEqual(
    importOAuthProviderBody({
      provider: 'codex',
      label: 'Codex import',
      groupLabel: 'default',
      priority: 7,
      visibility: 'shared',
      credentialJson: { type: 'codex' },
    }),
    {
      method: 'credential_json',
      provider: 'codex',
      label: 'Codex import',
      group_label: 'default',
      priority: 7,
      credential_json: { type: 'codex' },
      visibility: 'shared',
    },
  )

  assert.deepEqual(
    startProviderOAuthBody({
      provider: 'grok',
      label: 'Grok OAuth',
      groupLabel: 'default',
      priority: 3,
      visibility: 'private',
    }),
    {
      provider: 'grok',
      label: 'Grok OAuth',
      group_label: 'default',
      priority: 3,
      visibility: 'private',
    },
  )
})

test('provider update payload includes priority and omits a blank API key', () => {
  assert.deepEqual(
    updateProviderAccountBody({
      accountId: 'provider-1',
      label: 'Updated',
      groupLabel: 'priority-group',
      priority: 42,
      visibility: 'shared',
      baseUrl: 'https://api.example.com',
      apiKey: '   ',
    }),
    {
      label: 'Updated',
      group_label: 'priority-group',
      priority: 42,
      visibility: 'shared',
      base_url: 'https://api.example.com',
    },
  )
})
