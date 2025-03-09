import { expect } from 'chai';
import { HumanMessage } from '@langchain/core/messages';

// Mock the ChainCreator class
class ChainCreator {
  saver: any;
  supervisorAgent: any;
  members: any[];
  
  constructor(saver: any, supervisorAgent: any, members: any[]) {
    this.saver = saver;
    this.supervisorAgent = supervisorAgent;
    this.members = members;
  }
  
  createChain() {
    // Return a mock chain
    return {
      invoke: async () => ({}),
    };
  }
}

describe('ChainCreator mock test', () => {
  const mockSaver = {};
  const mockSupervisorAgent = { invoke: async () => ({ next: 'FINISH' }) };
  const mockMembers = [
    {
      name: 'researcher',
      func: async () => ({ messages: [new HumanMessage('Research completed')] }),
      classification: ['Search the web', 'Research information']
    }
  ];

  it('should initialize with the correct properties', () => {
    const chainCreator = new ChainCreator(mockSaver, mockSupervisorAgent, mockMembers);
    
    expect(chainCreator.saver).to.equal(mockSaver);
    expect(chainCreator.supervisorAgent).to.equal(mockSupervisorAgent);
    expect(chainCreator.members).to.deep.equal(mockMembers);
  });
  
  it('should create a chain with invoke method', () => {
    const chainCreator = new ChainCreator(mockSaver, mockSupervisorAgent, mockMembers);
    const chain = chainCreator.createChain();
    
    expect(chain).to.exist;
    expect(typeof chain.invoke).to.equal('function');
  });
}); 