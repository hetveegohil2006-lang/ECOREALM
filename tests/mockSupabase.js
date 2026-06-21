/**
 * Reusable Supabase mock helper for Jest tests.
 * Provides a chainable thenable object that resolves queries cleanly.
 */

const createMockChain = (resolvedData, count = null) => {
  const chain = {
    then: (resolve) => resolve({ data: resolvedData, count, error: null })
  };
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.neq = jest.fn().mockReturnValue(chain);
  chain.order = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockReturnValue(chain);
  chain.range = jest.fn().mockReturnValue(chain);
  chain.in = jest.fn().mockReturnValue(chain);
  chain.gte = jest.fn().mockReturnValue(chain);
  
  chain.single = jest.fn().mockResolvedValue({ data: resolvedData, error: null });
  chain.maybeSingle = jest.fn().mockResolvedValue({ data: resolvedData, error: null });
  chain.insert = jest.fn().mockResolvedValue({ data: resolvedData, error: null });
  chain.update = jest.fn().mockReturnValue(chain);
  chain.delete = jest.fn().mockResolvedValue({ error: null });
  
  return chain;
};

module.exports = { createMockChain };
