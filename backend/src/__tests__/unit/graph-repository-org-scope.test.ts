// Regression test for the tenant-isolation fix in traversalSearch(): Apache AGE
// cannot constrain intermediate path nodes in Cypher (no ALL()/list-comprehension
// support), so cross-org nodes/edges must be filtered out in application code
// after the query returns. This test asserts that re-verification actually drops
// foreign-org nodes and any edge touching them, using a raw agtype-shaped mock
// response (no real Postgres/AGE connection needed).

const mockConnect = jest.fn();
jest.mock('../../config/database', () => ({
  pool: { connect: () => mockConnect() },
}));

import { GraphRepository } from '../../repositories/graph.repository';

function agtypeNode(id: string, orgId: string) {
  return JSON.stringify({ id, label: 'Entity', properties: { org_id: orgId, name: `node-${id}` } }) + '::vertex';
}

function agtypeEdge(id: string, startId: string, endId: string) {
  return JSON.stringify({ id, label: 'RELATED_TO', start_id: startId, end_id: endId, properties: {} }) + '::edge';
}

describe('GraphRepository.traversalSearch — org re-verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('drops nodes belonging to a foreign org and any edge touching them', async () => {
    const ownOrg = 'org-a';
    const foreignOrg = 'org-b';

    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] }) // SET search_path
        .mockResolvedValueOnce({ rows: [] }) // LOAD 'age'
        .mockResolvedValueOnce({
          rows: [
            {
              nodes: [agtypeNode('1', ownOrg), agtypeNode('2', foreignOrg)],
              edges: [agtypeEdge('e1', '1', '2')],
            },
          ],
        }),
      release: jest.fn(),
    };
    mockConnect.mockResolvedValue(client);

    const repo = new GraphRepository();
    const results = await repo.traversalSearch({ org_id: ownOrg, query: 'related to something', depth: 2 });

    expect(results).toHaveLength(1);
    const [result] = results;
    expect(result.nodes.map((n) => n.id)).toEqual(['1']);
    expect(result.nodes.every((n) => n.properties.org_id === ownOrg)).toBe(true);
    // The edge touches node "2" (foreign org), which was dropped — the edge
    // must be dropped too, otherwise it'd dangle/leak the foreign node's id.
    expect(result.edges).toHaveLength(0);
  });

  it('keeps nodes/edges when both endpoints belong to the requesting org', async () => {
    const ownOrg = 'org-a';

    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              nodes: [agtypeNode('1', ownOrg), agtypeNode('2', ownOrg)],
              edges: [agtypeEdge('e1', '1', '2')],
            },
          ],
        }),
      release: jest.fn(),
    };
    mockConnect.mockResolvedValue(client);

    const repo = new GraphRepository();
    const results = await repo.traversalSearch({ org_id: ownOrg, query: 'related to something', depth: 2 });

    expect(results).toHaveLength(1);
    expect(results[0].nodes).toHaveLength(2);
    expect(results[0].edges).toHaveLength(1);
  });
});
