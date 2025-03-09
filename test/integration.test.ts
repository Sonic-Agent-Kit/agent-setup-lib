import { expect } from 'chai';
import { AgentSetup, AgentState } from '../src/agent.setup';
import { ChainCreator, Member } from '../src/agent.service';
import { HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

describe('Integration tests', () => {
  // Create a mock tool
  const mockSearchTool = tool(async (input) => {
    return `Search results for: ${input.query}`;
  }, {
    name: 'search',
    description: 'Search for information',
    schema: z.object({
      query: z.string(),
    }),
  });

  // Mock LLM instance
  const mockLlm = {
    bindTools: () => ({
      pipe: () => ({
        pipe: (callback: any) => callback({
          args: {
            next: 'Web_Search',
            instructions: 'Search for information about AI'
          }
        }),
      }),
    }),
  };

  it('should create a full agent workflow', async () => {
    // Initial state
    const initialState = {
      messages: [new HumanMessage('Tell me about AI')],
      team_members: [],
      next: 'supervisor',
      instructions: 'Select the correct team member',
      stateOption: '',
    };

    // Setup agents
    const agentSetup = new AgentSetup(initialState, mockLlm);
    
    // Create a mock agent node function
    const mockAgentNodeFunc = async (state: typeof AgentState.State) => {
      return {
        messages: [new HumanMessage('I found information about AI')],
      };
    };

    // Define team members
    const teamMembers: Member[] = [{
      name: 'Web_Search',
      func: mockAgentNodeFunc,
      classification: ['Search the web', 'Find information']
    }];

    // Create supervisor
    const supervisorAgent = await agentSetup.createTeamSupervisor(teamMembers);
    
    // Mock saver
    const mockSaver = { get: async () => null, put: async () => {} };
    
    // Create chain
    const chainCreator = new ChainCreator(mockSaver, supervisorAgent, teamMembers);
    const chain = chainCreator.createChain();
    
    expect(chain).to.exist;
    expect(typeof chain.invoke).to.equal('function');

    // Note: We can't fully test the execution without mocking many dependencies
    // This is primarily a structure test to ensure the graph is created properly
  });
}); 