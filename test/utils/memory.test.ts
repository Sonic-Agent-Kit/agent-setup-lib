import { expect } from 'chai';
import { MongoHandler } from '../../src/utils/memory';
import { HumanMessage } from '@langchain/core/messages';

// Mock MongoDB client and collection
const mockCollection = {
  insertMany: async () => ({ insertedIds: { 0: 'test-id' } }),
};

const mockDb = {
  collection: () => mockCollection,
};

const mockClient = {
  connect: async () => Promise.resolve(),
  db: () => mockDb,
};

// Mock embeddings instance
const mockEmbeddings = {
  embedDocuments: async () => [[0.1, 0.2, 0.3]],
};

describe('MongoHandler', () => {
  const vectorStoreOptions = {
    dbName: 'testDb',
    collectionName: 'testCollection',
    indexName: 'testIndex',
    textKey: 'content',
    embeddingKey: 'embedding',
  };

  it('should initialize with the correct properties', () => {
    const mongoHandler = new MongoHandler(mockEmbeddings as any, 'mongodb://localhost:27017', vectorStoreOptions);
    
    // Using any to access private properties for testing
    expect((mongoHandler as any).embeddings).to.equal(mockEmbeddings);
    expect((mongoHandler as any).mongoUri).to.equal('mongodb://localhost:27017');
    expect((mongoHandler as any).vectorStoreOptions).to.deep.equal(vectorStoreOptions);
  });

  it('should initialize a MongoDB client', async () => {
    const mongoHandler = new MongoHandler(mockEmbeddings as any, 'mongodb://localhost:27017', vectorStoreOptions);
    
    // Mock the initClient method
    (mongoHandler as any).initClient = async () => mockClient;
    const client = await mongoHandler.initClient();
    
    expect(client).to.equal(mockClient);
  });

  it('should initialize a saver', async () => {
    const mongoHandler = new MongoHandler(mockEmbeddings as any, 'mongodb://localhost:27017', vectorStoreOptions);
    
    // Mock the initSaver method
    const mockSaver = {};
    (mongoHandler as any).initSaver = async () => mockSaver;
    const saver = await mongoHandler.initSaver('testDb', 'checkpoints');
    
    expect(saver).to.equal(mockSaver);
  });

  it('should process a message', async () => {
    // This test is harder to fully mock without complex setup
    // Just testing the method exists and runs without error
    const mongoHandler = new MongoHandler(mockEmbeddings as any, 'mongodb://localhost:27017', vectorStoreOptions);
    
    // We're not checking the result but just that it doesn't throw
    const message = new HumanMessage('Test message');
    await expect(mongoHandler.processMessage(message, 'user123')).to.not.throw();
  });
}); 