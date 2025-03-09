import { expect } from 'chai';
import { HumanMessage } from '@langchain/core/messages';

describe('ChainCreator', () => {
  let ChainCreator: any;
  let Member: any;

  beforeAll(async () => {
    // Dynamically import the module
    const module = await import('../src/agent.service.js');
    ChainCreator = module.ChainCreator;
    // Remove Member since it doesn't exist in the module
  });

  // Mock dependencies
  const mockSaver = {};
  const mockSupervisorAgent = { invoke: async () => ({ next: 'FINISH' }) };
  const mockMembers = [
    {
      name: 'researcher',
      func: async () => ({ messages: [new HumanMessage('Research completed')] }),
      classification: ['Search the web', 'Research information']
    },
    {
      name: 'writer',
      func: async () => ({ messages: [new HumanMessage('Writing completed')] }),
      classification: ['Write content', 'Summarize information']
    }
  ];

  it('should initialize with the correct properties', async () => {
    const chainCreator = new ChainCreator(mockSaver, mockSupervisorAgent, mockMembers);
    
    // Using any to access private properties for testing
    expect(chainCreator.saver).to.equal(mockSaver);
    expect(chainCreator.supervisorAgent).to.equal(mockSupervisorAgent);
    expect(chainCreator.members).to.deep.equal(mockMembers);
  });

  it('should have a createChain method', async () => {
    const chainCreator = new ChainCreator(mockSaver, mockSupervisorAgent, mockMembers);
    expect(typeof chainCreator.createChain).to.equal('function');
  });
}); 