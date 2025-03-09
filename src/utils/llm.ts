import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { ChatGroq } from "@langchain/groq";
import { ChatAnthropic } from "@langchain/anthropic";

export interface LlmConfig {
  OLLAMA_BASE_URL?: string;
  /** Required for OpenAI chat provider */
  OPENAI_CHAT_API_KEY?: string;
  /** Required for OpenAI embeddings provider */
  OPENAI_EMBEDDINGS_API_KEY?: string;
  /** Required for Anthropic chat provider */
  ANTHROPIC_API_KEY?: string;
  /** Required for Groq chat provider */
  GROQ_API_KEY?: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  provider: "ollama" | "openai" | "groq" | "anthropic";
}

export interface EmbeddingsOptions {
  model?: string;
  provider: "ollama" | "openai";
}

export interface ChatLlmInstance {
  name: string;
  instance: ChatInstance;
}

export type ChatInstance = ChatOllama | ChatOpenAI | ChatGroq | ChatAnthropic;

export type EmbedInstance = OllamaEmbeddings | OpenAIEmbeddings;

export interface EmbeddingsInstance {
  name: string;
  instance: EmbedInstance;      
}

export class Llm {
  private config: LlmConfig;
  private chatInstance: ChatInstance | null = null;
  private chatName: string | null = null;
  private embeddingsInstance: EmbedInstance | null = null;
  private embeddingsName: string | null = null;

  /**
   * Constructs a new Llm instance.
   * @param config - Must include at least the OLLAMA_BASE_URL and, for the respective providers,
   * the required API keys.
   */
  constructor(config: LlmConfig) {
    if (!config.OLLAMA_BASE_URL && 
        !config.OPENAI_CHAT_API_KEY && 
        !config.OPENAI_EMBEDDINGS_API_KEY && 
        !config.ANTHROPIC_API_KEY && 
        !config.GROQ_API_KEY) {
      throw new Error("At least one provider configuration is required (OLLAMA_BASE_URL, OPENAI_CHAT_API_KEY, OPENAI_EMBEDDINGS_API_KEY, ANTHROPIC_API_KEY, or GROQ_API_KEY)");
    }
    
    this.config = config;
  }

  /**
   * Returns a chat LLM instance along with the provider name.
   * Uses a mapping (use-case style) to instantiate the chosen provider.
   *
   * @param options - Options for the chat LLM including the provider, model, and temperature.
   * @returns An object containing the provider name and the chat LLM instance.
   */
  getChatLlm(options: ChatOptions): ChatLlmInstance {
    if (!this.chatInstance) {
      const chatProviders: { [key in ChatOptions["provider"]]: () => ChatOllama | ChatOpenAI | ChatGroq | ChatAnthropic } = {
        ollama: () => {
          if (!this.config.OLLAMA_BASE_URL) {
            throw new Error("OLLAMA_BASE_URL is required for the Ollama chat provider.");
          }
          return new ChatOllama({
            model: options.model || "llama3.2",
            baseUrl: this.config.OLLAMA_BASE_URL,
            temperature: options.temperature,
          });
        },
        openai: () => {
          if (!this.config.OPENAI_CHAT_API_KEY) {
            throw new Error("OPENAI_CHAT_API_KEY is required for the OpenAI chat provider.");
          }
          return new ChatOpenAI({
            model: options.model || "gpt-4o",
            temperature: options.temperature,
            openAIApiKey: this.config.OPENAI_CHAT_API_KEY,
          });
        },
        groq: () => {
          if (!this.config.GROQ_API_KEY) {
            throw new Error("GROQ_API_KEY is required for the Groq chat provider.");
          }
          return new ChatGroq({
            model: options.model || "groq-default",
            temperature: options.temperature,
            apiKey: this.config.GROQ_API_KEY,
          });
        },
        anthropic: () => {
          if (!this.config.ANTHROPIC_API_KEY) {
            throw new Error("ANTHROPIC_API_KEY is required for the Anthropic chat provider.");
          }
          return new ChatAnthropic({
            model: options.model || "claude-v1",
            temperature: options.temperature,
            anthropicApiKey: this.config.ANTHROPIC_API_KEY,
          });
        },
      };

      this.chatInstance = chatProviders[options.provider]();
      this.chatName = options.provider;
    }
    return { name: this.chatName!, instance: this.chatInstance };
  }

  /**
   * Returns an embeddings instance along with the provider name.
   * Uses a mapping (use-case style) to instantiate the chosen provider.
   *
   * @param options - Options for embeddings including the provider and model.
   * @returns An object containing the provider name and the embeddings instance.
   */
  getEmbeddings(options: EmbeddingsOptions): EmbeddingsInstance {
    if (!this.embeddingsInstance) {
      const embeddingProviders: { [key in EmbeddingsOptions["provider"]]: () => OllamaEmbeddings | OpenAIEmbeddings } = {
        ollama: () =>
          new OllamaEmbeddings({
            model: options.model || "",
            baseUrl: this.config.OLLAMA_BASE_URL,
          }),
        openai: () => {
          if (!this.config.OPENAI_EMBEDDINGS_API_KEY) {
            throw new Error("OPENAI_EMBEDDINGS_API_KEY is required for the OpenAI embeddings provider.");
          }
          return new OpenAIEmbeddings({
            model: options.model || "",
            openAIApiKey: this.config.OPENAI_EMBEDDINGS_API_KEY,
          });
        },
      };

      this.embeddingsInstance = embeddingProviders[options.provider]();
      this.embeddingsName = options.provider;
    }
    return { name: this.embeddingsName!, instance: this.embeddingsInstance };
  }
}
