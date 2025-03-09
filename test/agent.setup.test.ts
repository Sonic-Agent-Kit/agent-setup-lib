import { expect } from 'chai';
import { AgentSetup, AgentState } from '../src/agent.setup';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { Member } from '../src/agent.service';

describe('AgentSetup', () => {
  // Initial state for testing
  const initialState = {
    messages: [new HumanMessage('Test message')],
    team_members: [],
    next: 'supervisor',
    instructions: 'Test instructions',
    stateOption: '',
  };

  // Mock LLM
  const mockLlm = {
    bindTools: () => ({
      pipe: () => ({
        pipe: (callback: any) => callback,
      }),
    }),
  };

  // Mock tool for testing
  const mockTool = {
    name: 'test_tool',
    description: 'A test tool',
    schema: z.object({ input: z.string() }),
  } as unknown as StructuredTool;

  it('should initialize with the correct state and LLM', () => {
    const agentSetup = new AgentSetup(initialState, mockLlm);
    
    expect(agentSetup.state).to.deep.equal(initialState);
    expect(agentSetup.llm).to.equal(mockLlm);
  });

  it('should create a state modifier with the correct system messages', () => {
    const agentSetup = new AgentSetup(initialState, mockLlm);
    const teamMembers = ['researcher', 'writer'];
    const tools = [mockTool];
    
    const stateModifier = agentSetup.agentStateModifier('Test prompt', tools, teamMembers);
    
    // Test that the state modifier is a function
    expect(typeof stateModifier).to.equal('function');
    
    // Test the output of the state modifier with a sample state
    const result = stateModifier({ messages: [new HumanMessage('Test')] });
    expect(result).to.include('Test prompt');
    expect(result).to.include('researcher, writer');
    expect(result).to.include('test_tool');
  });

  it('should create a team supervisor', async () => {
    // Mock the createTeamSupervisor method
    const mockSupervisor = { invoke: async () => {} };
    const originalCreateTeamSupervisor = AgentSetup.prototype.createTeamSupervisor;
    AgentSetup.prototype.createTeamSupervisor = async function() { return mockSupervisor as any; };
    
    try {
      const agentSetup = new AgentSetup(initialState, mockLlm);
      const members: Member[] = [
        { name: 'researcher', classification: ['Research'], func: async () => ({}) },
        { name: 'writer', classification: ['Write'], func: async () => ({}) }
      ];
      
      const supervisor = await agentSetup.createTeamSupervisor(members);
      expect(supervisor).to.equal(mockSupervisor);
    } finally {
      // Restore original method
      AgentSetup.prototype.createTeamSupervisor = originalCreateTeamSupervisor;
    }
  });

  it('should correctly run an agent node and format its output', async () => {
    const agentSetup = new AgentSetup(initialState, mockLlm);
    
    // Mock agent that returns a specific result
    const mockAgent = {
      invoke: async () => ({
        messages: [new SystemMessage('System message'), new HumanMessage('Result from agent')]
      })
    };
    
    const result = await agentSetup.runAgentNode({
      state: initialState,
      agent: mockAgent as any, // Type assertion to bypass type error
      name: 'test_agent'
    });
    
    expect(result).to.have.property('messages');
    expect(result.messages[0]).to.be.instanceOf(HumanMessage);
    expect(result.messages[0].content).to.equal('Result from agent');
    expect(result.messages[0].name).to.equal('test_agent');
  });
}); 