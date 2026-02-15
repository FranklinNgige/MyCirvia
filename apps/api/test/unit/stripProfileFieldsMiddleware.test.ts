import { describe, expect, it } from 'vitest';
import { stripProfileFieldsMiddleware } from '../../src/middleware/stripProfileFields.js';

describe('stripProfileFieldsMiddleware', () => {
  it('removes profile keys recursively from response payload', () => {
    const req = {};
    let payload: unknown;
    const res = {
      json(body: unknown) {
        payload = body;
        return body;
      },
    };

    stripProfileFieldsMiddleware(req, res, () => {});

    res.json({
      userId: 'u1',
      realName: 'Secret',
      nested: { chosenName: 'Secret2', safe: true },
      list: [{ gender: 'x', city: 'nowhere', keep: 'ok' }],
    });

    expect(payload).toEqual({ userId: 'u1', nested: { safe: true }, list: [{ keep: 'ok' }] });
  });
});
