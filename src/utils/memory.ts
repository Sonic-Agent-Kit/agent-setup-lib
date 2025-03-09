import { MongoClient } from "mongodb";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import type { Document } from "@langchain/core/documents";
import { BaseMessage } from "@langchain/core/messages";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";

export interface VectorStoreOptions {
  dbName: string;
  collectionName: string;
  indexName: string;
  textKey: string;
  embeddingKey: string;
}

export class MongoHandler {
  private embeddings: any; // e.g., OpenAIEmbeddings | OllamaEmbeddings
  private mongoUri: string;
  private vectorStoreOptions: VectorStoreOptions;

  /**
   * @param embeddings - An embeddings instance (e.g., returned from Llm.getOpenAiEmbeddings).
   * @param mongoUri - The MongoDB connection URI.
   * @param vectorStoreOptions - Options for the vector store.
   */
  constructor(embeddings: any, mongoUri: string, vectorStoreOptions: VectorStoreOptions) {
    this.embeddings = embeddings;
    this.mongoUri = mongoUri;
    this.vectorStoreOptions = vectorStoreOptions;
  }

  /**
   * Creates and returns a connected MongoClient.
   * @returns A Promise that resolves to a connected MongoClient.
   */
  async initClient(): Promise<MongoClient> {
    const client = new MongoClient(this.mongoUri);
    await client.connect();
    return client;
  }

  /**
   * Initializes and returns a MongoDBSaver instance.
   * @param dbName - The database name for saving checkpoints.
   * @param checkpointCollectionName - The collection name for checkpoints.
   * @returns A Promise that resolves to a MongoDBSaver.
   */
  async initSaver(dbName: string, checkpointCollectionName: string): Promise<MongoDBSaver> {
    const client = await this.initClient();
    return new MongoDBSaver({
      client,
      dbName,
      checkpointCollectionName,
    });
  }

  /**
   * Processes a message by embedding its content and adding it to a MongoDB vector store.
   * Uses the vector store options provided in the constructor.
   * @param message - The message to process.
   * @param userId - The user identifier associated with the message.
   */
  async processMessage(message: BaseMessage, userId: string): Promise<void> {
    const client = await this.initClient();
    const collection = client
      .db(this.vectorStoreOptions.dbName)
      .collection(this.vectorStoreOptions.collectionName);

    const vectorStore = new MongoDBAtlasVectorSearch(this.embeddings, {
      collection,
      indexName: this.vectorStoreOptions.indexName,
      textKey: this.vectorStoreOptions.textKey,
      embeddingKey: this.vectorStoreOptions.embeddingKey,
    });

    const doc: Document = {
      pageContent: message.content.toString(),
      metadata: { userId, timestamp: new Date() },
    };

    await vectorStore.addDocuments([doc]);
  }
}
