const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const ObjectId = function(val) {
  if (this instanceof ObjectId) {
    this.id = val || crypto.randomUUID();
    this.toString = () => this.id;
    return this;
  }
  return val || crypto.randomUUID();
};
ObjectId.toString = () => 'ObjectId';

class Schema {
  constructor(definition, options = {}) {
    this.definition = definition;
    this.options = options;
    this.methods = {};
    this.statics = {};
    this.hooks = { pre: {}, post: {} };
  }

  pre(hook, fn) {
    if (!this.hooks.pre[hook]) this.hooks.pre[hook] = [];
    this.hooks.pre[hook].push(fn);
  }

  post(hook, fn) {
    if (!this.hooks.post[hook]) this.hooks.post[hook] = [];
    this.hooks.post[hook].push(fn);
  }

  index() {
    return this;
  }

  virtual() {
    return {
      get() { return this; },
      set() { return this; }
    };
  }
}

Schema.Types = {
  ObjectId,
  String,
  Number,
  Date,
  Boolean,
  Mixed: Object
};

// Global In-Memory Database store
const dbStore = {};

function getStore(modelName) {
  if (!dbStore[modelName]) {
    dbStore[modelName] = [];
  }
  return dbStore[modelName];
}

class QueryHelper {
  constructor(modelClass, executeQuery) {
    this.modelClass = modelClass;
    this.executeQuery = executeQuery;
    this._sort = null;
    this._limit = null;
    this._select = null;
  }

  sort(arg) {
    this._sort = arg;
    return this;
  }

  limit(arg) {
    this._limit = arg;
    return this;
  }

  select(arg) {
    this._select = arg;
    return this;
  }

  populate(arg) {
    return this;
  }

  async exec() {
    let result = await this.executeQuery();
    if (result === null || result === undefined) return result;

    // Apply sort
    if (this._sort && Array.isArray(result)) {
      const sortField = Object.keys(this._sort)[0];
      const sortDir = this._sort[sortField];
      result.sort((a, b) => {
        if (a[sortField] < b[sortField]) return sortDir === -1 ? 1 : -1;
        if (a[sortField] > b[sortField]) return sortDir === -1 ? -1 : 1;
        return 0;
      });
    }

    // Apply limit
    if (this._limit && Array.isArray(result)) {
      result = result.slice(0, this._limit);
    }

    return result;
  }

  then(onSuccess, onError) {
    return this.exec().then(onSuccess, onError);
  }
}

function createModelClass(modelName, schema) {
  const store = getStore(modelName);

  const getSchemaDefaults = (schemaInstance) => {
    const defaults = {};
    for (const [key, val] of Object.entries(schemaInstance.definition)) {
      if (Array.isArray(val)) {
        defaults[key] = [];
      } else if (val && typeof val === 'object') {
        if (val.type instanceof Schema) {
          defaults[key] = getSchemaDefaults(val.type);
          if (val.default !== undefined) {
            const defVal = typeof val.default === 'function' ? val.default() : val.default;
            Object.assign(defaults[key], defVal);
          }
        } else if (val.default !== undefined) {
          defaults[key] = typeof val.default === 'function' ? val.default() : val.default;
        } else if (!(val instanceof Schema)) {
          defaults[key] = {};
          const subDefaults = getSchemaDefaults({ definition: val });
          Object.assign(defaults[key], subDefaults);
        }
      } else if (val instanceof Schema) {
        defaults[key] = getSchemaDefaults(val);
      }
    }
    return defaults;
  };

  class MockDocument {
    constructor(data = {}) {
      const defaults = getSchemaDefaults(schema);
      Object.assign(this, defaults, JSON.parse(JSON.stringify(data)));

      if (!this._id) {
        this._id = new ObjectId().toString();
      }
      if (!this.createdAt) {
        this.createdAt = new Date();
      }
      this.updatedAt = new Date();

      // Bind methods
      for (const [methodName, fn] of Object.entries(schema.methods)) {
        this[methodName] = fn.bind(this);
      }
    }

    isModified(path) {
      return true;
    }

    toObject() {
      const obj = { ...this };
      // remove methods
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'function') delete obj[key];
      }
      return obj;
    }

    toJSON() {
      return this.toObject();
    }

    async save() {
      // Execute pre-save hooks
      const preHooks = schema.hooks.pre['save'] || [];
      for (const hook of preHooks) {
        await new Promise((resolve, reject) => {
          hook.call(this, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      this.updatedAt = new Date();

      // Find if exists in store
      const idx = store.findIndex(d => d._id.toString() === this._id.toString());
      if (idx !== -1) {
        store[idx] = this;
      } else {
        store.push(this);
      }

      // Execute post-save hooks
      const postHooks = schema.hooks.post['save'] || [];
      for (const hook of postHooks) {
        hook.call(this);
      }

      return this;
    }

    async deleteOne() {
      const idx = store.findIndex(d => d._id.toString() === this._id.toString());
      if (idx !== -1) {
        store.splice(idx, 1);
      }
      return { deletedCount: 1 };
    }
  }

  // Copy statics
  for (const [staticName, fn] of Object.entries(schema.statics)) {
    MockDocument[staticName] = fn.bind(MockDocument);
  }

  MockDocument._schema = schema;
  MockDocument.modelName = modelName;

  // Helper to match query
  const matchQuery = (doc, query) => {
    if (!query) return true;
    for (const key of Object.keys(query)) {
      const val = query[key];
      if (key === '$or') {
        return val.some(sub => matchQuery(doc, sub));
      }
      if (key === '$and') {
        return val.every(sub => matchQuery(doc, sub));
      }
      if (doc[key] !== val) {
        if (key === '_id' && doc[key] && val) {
          if (doc[key].toString() === val.toString()) continue;
        }
        return false;
      }
    }
    return true;
  };

  // Implement static queries
  MockDocument.find = function(query = {}) {
    return new QueryHelper(MockDocument, async () => {
      return store.filter(d => matchQuery(d, query));
    });
  };

  MockDocument.findOne = function(query = {}) {
    return new QueryHelper(MockDocument, async () => {
      const doc = store.find(d => matchQuery(d, query));
      return doc || null;
    });
  };

  MockDocument.findById = function(id) {
    return new QueryHelper(MockDocument, async () => {
      if (!id) return null;
      const doc = store.find(d => d._id.toString() === id.toString());
      return doc || null;
    });
  };

  MockDocument.create = async function(data) {
    if (Array.isArray(data)) {
      const docs = [];
      for (const item of data) {
        const doc = new MockDocument(item);
        await doc.save();
        docs.push(doc);
      }
      return docs;
    } else {
      const doc = new MockDocument(data);
      await doc.save();
      return doc;
    }
  };

  MockDocument.insertMany = async function(arr) {
    return await MockDocument.create(arr);
  };

  MockDocument.findByIdAndUpdate = function(id, update, options = {}) {
    return new QueryHelper(MockDocument, async () => {
      const doc = store.find(d => d._id.toString() === id.toString());
      if (!doc) return null;
      
      const fields = update.$set || update;
      Object.assign(doc, fields);
      doc.updatedAt = new Date();
      return doc;
    });
  };

  MockDocument.findOneAndUpdate = function(query, update, options = {}) {
    return new QueryHelper(MockDocument, async () => {
      const doc = store.find(d => matchQuery(d, query));
      if (!doc) return null;
      
      const fields = update.$set || update;
      Object.assign(doc, fields);
      doc.updatedAt = new Date();
      return doc;
    });
  };

  MockDocument.updateOne = async function(query, update, options = {}) {
    const doc = store.find(d => matchQuery(d, query));
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };
    
    const fields = update.$set || update;
    Object.assign(doc, fields);
    doc.updatedAt = new Date();
    return { matchedCount: 1, modifiedCount: 1 };
  };

  MockDocument.deleteMany = async function(query = {}) {
    let count = 0;
    for (let i = store.length - 1; i >= 0; i--) {
      if (matchQuery(store[i], query)) {
        store.splice(i, 1);
        count++;
      }
    }
    return { deletedCount: count };
  };

  MockDocument.deleteOne = async function(query = {}) {
    const idx = store.findIndex(d => matchQuery(d, query));
    if (idx !== -1) {
      store.splice(idx, 1);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  };

  MockDocument.countDocuments = async function(query = {}) {
    return store.filter(d => matchQuery(d, query)).length;
  };

  return MockDocument;
}

const mockMongoose = {
  Schema,
  Types: {
    ObjectId
  },
  models: {},
  model(name, schema) {
    if (this.models[name]) {
      return this.models[name];
    }
    const modelClass = createModelClass(name, schema);
    this.models[name] = modelClass;
    return modelClass;
  },
  connect: async () => {
    console.log('⚡ [MockDB] Connected to In-Memory Mock Database.');
    return {
      connection: {
        host: 'in-memory-mock-db',
        on: () => {},
        once: () => {}
      }
    };
  },
  connection: {
    readyState: 1,
    on: () => {},
    once: () => {}
  },
  set: () => {},
  pluralize: () => {}
};

module.exports = mockMongoose;
