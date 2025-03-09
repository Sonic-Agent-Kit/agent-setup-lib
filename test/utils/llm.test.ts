import { expect } from 'chai';
import { Llm } from '../../src/utils/llm';
import { ChatOllama } from '@langchain/ollama';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';

describe('Llm', () => {
  const config = {
    OLLAMA_BASE_URL: 'http://localhost:11434',
    OPENAI_CHAT_API_KEY: 'test-openai-key',
    OPENAI_EMBEDDINGS_API_KEY: 'test-openai-embed-key',
    ANTHROPIC_API_KEY: 'test-anthropic-key',
  };

  it('should initialize with the provided config', () => {
    const llm = new Llm(config);
    expect(llm).to.exist;
  });

  it('should return the correct chat LLM instance for Ollama', () => {
    const llm = new Llm(config);
    const result = llm.getChatLlm({ provider: 'ollama', model: 'llama3' });
    
    expect(result.name).to.equal('ollama');
    expect(result.instance).to.be.instanceOf(ChatOllama);
  });

  it('should return the correct chat LLM instance for OpenAI', () => {
    const llm = new Llm(config);
    const result = llm.getChatLlm({ provider: 'openai', model: 'gpt-4' });
    
    expect(result.name).to.equal('openai');
    expect(result.instance).to.be.instanceOf(ChatOpenAI);
  });

  it('should return the correct chat LLM instance for Anthropic', () => {
    const llm = new Llm(config);
    const result = llm.getChatLlm({ provider: 'anthropic', model: 'claude-3' });
    
    expect(result.name).to.equal('anthropic');
    expect(result.instance).to.be.instanceOf(ChatAnthropic);
  });

  it('should get embeddings for OpenAI', () => {
    const llm = new Llm(config);
    const result = llm.getEmbeddings({ provider: 'openai' });
    
    expect(result.name).to.equal('openai');
    expect(result.instance).to.exist;
  });

  it('should throw an error for missing API keys', () => {
    const incompleteConfig = { OLLAMA_BASE_URL: 'http://localhost:11434' };
    const llm = new Llm(incompleteConfig);
    
    expect(() => llm.getChatLlm({ provider: 'openai' })).to.throw(Error);
  });

  it('should cache instances once created', () => {
    const llm = new Llm(config);
    const firstInstance = llm.getChatLlm({ provider: 'ollama' });
    const secondInstance = llm.getChatLlm({ provider: 'ollama' });
    
    expect(firstInstance.instance).to.equal(secondInstance.instance);
  });
}); 