import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';

// Mock pg module before importing server
const mockPool = {
  query: vi.fn(),
  end: vi.fn()
};

vi.mock('pg', () => {
  return {
    default: {
      Pool: class MockPool {
        constructor() {
          return mockPool;
        }
      }
    },
    Pool: class MockPool {
      constructor() {
        return mockPool;
      }
    }
  };
});

// Import after mocking
const { app, pool } = await import('../../server.js');

describe('Backend API Server', () => {
  beforeEach(() => {
    // Clear all mock calls
    mockPool.query.mockClear();
  });

  afterAll(() => {
    // Clean up pool connection
    mockPool.end();
  });

  describe('GET /api/health', () => {
    it('should return health status when database is connected', async () => {
      // Mock successful database query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ count: '42' }]
      });

      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        database: 'connected',
        totalPoems: 42
      });

      expect(mockPool.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM poems');
    });

    it('should return error status when database query fails', async () => {
      // Mock database error
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({
        status: 'error',
        message: 'Database connection failed'
      });
    });

    it('should handle database timeout gracefully', async () => {
      // Mock database timeout
      mockPool.query.mockRejectedValueOnce(new Error('Connection timeout'));

      const response = await request(app)
        .get('/api/health')
        .expect(500);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('timeout');
    });
  });

  describe('GET /api/poems/random', () => {
    const mockPoem = {
      id: 123,
      title: 'قصيدة الحب',
      arabic: 'بيت أول*بيت ثاني*بيت ثالث',
      poet: 'نزار قباني',
      theme: 'رومانسي'
    };

    it('should return a random poem without poet filter', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [mockPoem]
      });

      const response = await request(app)
        .get('/api/poems/random')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        id: 123,
        poet: 'نزار قباني',
        poetArabic: 'نزار قباني',
        title: 'قصيدة الحب',
        titleArabic: 'قصيدة الحب',
        arabic: 'بيت أول*بيت ثاني*بيت ثالث',
        english: '',
        tags: ['رومانسي']
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY RANDOM() LIMIT 1'),
        []
      );
    });

    it('should return a random poem filtered by poet', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [mockPoem]
      });

      const response = await request(app)
        .get('/api/poems/random?poet=نزار قباني')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.poet).toBe('نزار قباني');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE po.name = $1'),
        ['نزار قباني']
      );
    });

    it('should not filter when poet is "All"', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [mockPoem]
      });

      const response = await request(app)
        .get('/api/poems/random?poet=All')
        .expect(200);

      expect(pool.query).toHaveBeenCalledWith(
        expect.not.stringContaining('WHERE'),
        []
      );
    });

    it('should return 404 when no poems found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .get('/api/poems/random')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toEqual({ error: 'No poems found' });
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Query failed'));

      const response = await request(app)
        .get('/api/poems/random')
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({ error: 'Query failed' });
    });

    it('should handle Arabic text encoding correctly', async () => {
      const arabicPoem = {
        id: 1,
        title: 'الحُبّ والحياة',
        arabic: 'يا حبيبي*أنت نور عيني',
        poet: 'محمود درويش',
        theme: 'حب'
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [arabicPoem]
      });

      const response = await request(app)
        .get('/api/poems/random')
        .expect(200);

      expect(response.body.arabic).toBe('يا حبيبي*أنت نور عيني');
      expect(response.body.poet).toBe('محمود درويش');
    });
  });

  describe('GET /api/poems/by-poet/:poet', () => {
    const mockPoems = [
      {
        id: 1,
        title: 'قصيدة 1',
        arabic: 'بيت 1',
        poet: 'نزار قباني',
        theme: 'رومانسي'
      },
      {
        id: 2,
        title: 'قصيدة 2',
        arabic: 'بيت 2',
        poet: 'نزار قباني',
        theme: 'وطني'
      }
    ];

    it('should return poems by specified poet', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: mockPoems
      });

      const response = await request(app)
        .get('/api/poems/by-poet/نزار قباني')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].poet).toBe('نزار قباني');
      expect(response.body[1].poet).toBe('نزار قباني');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE po.name = $1'),
        ['نزار قباني', 10, 0]
      );
    });

    it('should support pagination with limit and offset', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: mockPoems.slice(0, 1)
      });

      const response = await request(app)
        .get('/api/poems/by-poet/نزار قباني?limit=5&offset=10')
        .expect(200);

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['نزار قباني', '5', '10']
      );
    });

    it('should use default pagination values when not specified', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: mockPoems
      });

      await request(app)
        .get('/api/poems/by-poet/محمود درويش')
        .expect(200);

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['محمود درويش', 10, 0]
      );
    });

    it('should return empty array when poet has no poems', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .get('/api/poems/by-poet/Unknown Poet')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/poems/by-poet/نزار قباني')
        .expect(500);

      expect(response.body).toEqual({ error: 'Database error' });
    });

    it('should handle URL encoded poet names', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: mockPoems
      });

      await request(app)
        .get('/api/poems/by-poet/%D9%86%D8%B2%D8%A7%D8%B1%20%D9%82%D8%A8%D8%A7%D9%86%D9%8A')
        .expect(200);

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['نزار قباني', 10, 0]
      );
    });
  });

  describe('GET /api/poets', () => {
    const mockPoets = [
      { name: 'نزار قباني', poem_count: '150' },
      { name: 'محمود درويش', poem_count: '120' },
      { name: 'أحمد شوقي', poem_count: '100' }
    ];

    it('should return list of poets with poem counts', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: mockPoets
      });

      const response = await request(app)
        .get('/api/poets')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(mockPoets);
      expect(response.body).toHaveLength(3);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('GROUP BY po.name')
      );
    });

    it('should return poets ordered by poem count descending', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: mockPoets
      });

      const response = await request(app)
        .get('/api/poets')
        .expect(200);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY poem_count DESC')
      );
    });

    it('should limit results to 50 poets', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: mockPoets
      });

      await request(app)
        .get('/api/poets')
        .expect(200);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 50')
      );
    });

    it('should only return poets with poems', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: mockPoets
      });

      await request(app)
        .get('/api/poets')
        .expect(200);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('HAVING COUNT(p.id) > 0')
      );
    });

    it('should return empty array when no poets found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .get('/api/poets')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Query error'));

      const response = await request(app)
        .get('/api/poets')
        .expect(500);

      expect(response.body).toEqual({ error: 'Query error' });
    });
  });

  describe('GET /api/poems/search', () => {
    const mockSearchResults = [
      {
        id: 1,
        title: 'قصيدة الحب',
        arabic: 'الحب الكبير',
        poet: 'نزار قباني',
        theme: 'رومانسي'
      },
      {
        id: 2,
        title: 'أحبك',
        arabic: 'أحبك يا حبيبتي',
        poet: 'محمود درويش',
        theme: 'حب'
      }
    ];

    it('should search poems by query string', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: mockSearchResults
      });

      const response = await request(app)
        .get('/api/poems/search?q=حب')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE $1'),
        ['%حب%', 10]
      );
    });

    it('should return 400 when search query is missing', async () => {
      const response = await request(app)
        .get('/api/poems/search')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'Search query required' });
    });

    it('should support custom limit parameter', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: mockSearchResults.slice(0, 1)
      });

      await request(app)
        .get('/api/poems/search?q=test&limit=5')
        .expect(200);

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['%test%', '5']
      );
    });

    it('should use default limit when not specified', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: mockSearchResults
      });

      await request(app)
        .get('/api/poems/search?q=حب')
        .expect(200);

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['%حب%', 10]
      );
    });

    it('should search in title, content, and poet name', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: mockSearchResults
      });

      await request(app)
        .get('/api/poems/search?q=نزار')
        .expect(200);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('p.title ILIKE $1 OR p.content ILIKE $1 OR po.name ILIKE $1'),
        expect.any(Array)
      );
    });

    it('should return empty array when no results found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .get('/api/poems/search?q=nonexistent')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should handle special characters in search query', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: []
      });

      // URL encoding will strip some characters like # @ !
      // Test with a character that survives URL encoding
      await request(app)
        .get('/api/poems/search?q=%$')
        .expect(200);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['%%$%', 10]
      );
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Search error'));

      const response = await request(app)
        .get('/api/poems/search?q=test')
        .expect(500);

      expect(response.body).toEqual({ error: 'Search error' });
    });

    it('should format search results correctly', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [mockSearchResults[0]]
      });

      const response = await request(app)
        .get('/api/poems/search?q=test')
        .expect(200);

      expect(response.body[0]).toEqual({
        id: 1,
        poet: 'نزار قباني',
        poetArabic: 'نزار قباني',
        title: 'قصيدة الحب',
        titleArabic: 'قصيدة الحب',
        arabic: 'الحب الكبير',
        english: '',
        tags: ['رومانسي']
      });
    });
  });

  describe('CORS Configuration', () => {
    it('should allow cross-origin requests', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ count: '10' }]
      });

      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:5173')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for undefined routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.status).toBe(404);
    });

    it('should handle JSON parsing errors gracefully', async () => {
      const response = await request(app)
        .post('/api/poems/random')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.status).toBe(400);
    });
  });

  describe('Response Format Validation', () => {
    it('should always include required poem fields in random endpoint', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          title: 'Test',
          arabic: 'Test content',
          poet: 'Test Poet',
          theme: 'Test Theme'
        }]
      });

      const response = await request(app)
        .get('/api/poems/random')
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('poet');
      expect(response.body).toHaveProperty('poetArabic');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('titleArabic');
      expect(response.body).toHaveProperty('arabic');
      expect(response.body).toHaveProperty('english');
      expect(response.body).toHaveProperty('tags');
    });

    it('should format tags as array', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          title: 'Test',
          arabic: 'Test',
          poet: 'Test',
          theme: 'رومانسي'
        }]
      });

      const response = await request(app)
        .get('/api/poems/random')
        .expect(200);

      expect(Array.isArray(response.body.tags)).toBe(true);
      expect(response.body.tags).toContain('رومانسي');
    });
  });
});
