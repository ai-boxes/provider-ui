import assert from 'node:assert/strict'
import test from 'node:test'

import {
  commonProviderModelInputModalities,
  decodeProviderModelInputModalities,
  formatProviderModelInputModalities,
  providerModelInputModalitiesForUpdate,
} from '../src/features/providers/provider-model-modalities.ts'

test('model input modality decoder accepts any unique supported combination', () => {
  assert.deepEqual(
    decodeProviderModelInputModalities(['video', 'text', 'pdf']),
    ['video', 'text', 'pdf'],
  )
  assert.equal(decodeProviderModelInputModalities(null), null)
})

test('model input modality decoder rejects invalid combinations', () => {
  assert.throws(() => decodeProviderModelInputModalities([]), /must not be empty/)
  assert.throws(
    () => decodeProviderModelInputModalities(['text', 'text']),
    /must not contain duplicates/,
  )
  assert.throws(
    () => decodeProviderModelInputModalities(['text', 'embeddings']),
    /is unsupported/,
  )
})

test('model input modality options contain the five supported capabilities', () => {
  assert.deepEqual(
    commonProviderModelInputModalities,
    ['text', 'image', 'pdf', 'audio', 'video'],
  )
})

test('model input modalities submit null only when no options are selected', () => {
  assert.equal(providerModelInputModalitiesForUpdate([]), null)
  assert.deepEqual(
    providerModelInputModalitiesForUpdate(['pdf', 'audio', 'video']),
    ['pdf', 'audio', 'video'],
  )
})

test('model input modality summary displays every declared capability', () => {
  assert.equal(
    formatProviderModelInputModalities([
      'text',
      'image',
      'pdf',
      'audio',
      'video',
    ]),
    'Text, image, PDF, audio, and video input',
  )
  assert.equal(
    formatProviderModelInputModalities(null),
    'Input capability not declared',
  )
})
