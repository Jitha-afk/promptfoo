/**
 * Tests for GET /api/eval/:id/table - datasetId in response.
 *
 * Verifies that the API route includes datasetId from the eval's associated dataset.
 */

import { randomUUID } from 'crypto';

import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getDb } from '../../../src/database/index';
import { runDbMigrations } from '../../../src/migrate';
import Eval from '../../../src/models/eval';
import { createApp } from '../../../src/server/server';
import EvalFactory from '../../factories/evalFactory';

describe('GET /api/eval/:id/table - datasetId', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    await runDbMigrations();
  });

  beforeEach(async () => {
    app = createApp();
    const db = getDb();
    await db.run('DELETE FROM eval_results');
    await db.run('DELETE FROM evals_to_datasets');
    await db.run('DELETE FROM evals_to_prompts');
    await db.run('DELETE FROM evals_to_tags');
    await db.run('DELETE FROM evals');
  });

  it('should include datasetId in the response', async () => {
    const eval_ = await EvalFactory.create();

    const response = await request(app).get(`/api/eval/${eval_.id}/table`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('datasetId');
    expect(typeof response.body.datasetId).toBe('string');
    expect(response.body.datasetId.length).toBeGreaterThan(0);
  });

  it('should return different datasetIds for different test configurations', async () => {
    const eval1 = await EvalFactory.create();

    // Create a second eval with a different test configuration
    const eval2 = await Eval.create(
      {
        providers: [{ id: 'test-provider' }],
        prompts: ['Tell me about {{topic}}'],
        tests: [{ vars: { topic: 'astronomy' }, assert: [{ type: 'contains', value: 'star' }] }],
      },
      [{ raw: 'Tell me about astronomy', label: 'Tell me about {{topic}}' }],
      { id: randomUUID() },
    );

    const response1 = await request(app).get(`/api/eval/${eval1.id}/table`);
    const response2 = await request(app).get(`/api/eval/${eval2.id}/table`);

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);

    // Different test configurations should produce different datasetIds
    expect(response1.body.datasetId).not.toBe(response2.body.datasetId);
  });
});
