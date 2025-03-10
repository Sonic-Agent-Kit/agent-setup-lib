import { StateGraph, START, END } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { AgentState } from "./agent.setup";
import { tool } from "@langchain/core/tools";

export interface Member {
  name: string;
  func?: any;
  classification?: Array<string>
}

export class ChainCreator {
  private saver: any;
  private supervisorAgent: any;
  private members: Member[];

  /**
   * @param saver - The memory saver instance.
   * @param supervisorAgent - The pre-created supervisor agent.
   * @param members - An array of team member objects: { name: string; func: Function }.
   */
  constructor(saver: any, supervisorAgent: any, members: Member[]) {
    this.saver = saver;
    this.supervisorAgent = supervisorAgent;
    this.members = members;
  }

  /**
   * Creates and compiles the final chain.
   * @returns The compiled chain.
   */
  createChain() {
    // Initialize the state graph with the SolanaAgentState.
    const graph = new StateGraph(AgentState).addNode("supervisor", this.supervisorAgent);

    // Add each team member as a node.
    this.members.forEach((member) => {
      graph.addNode(member.name, member.func);
    });

    // Create an edge from each team member to the supervisor.
    this.members.forEach((member) => {
        (graph as any).addEdge(member.name, "supervisor");
    });

    // Map agent names to their respective nodes.
    const nextSteps = Object.fromEntries(this.members.map((member) => [member.name, member.name]));

    // Add conditional edges from the supervisor node.
    graph.addConditionalEdges(
      "supervisor",
      (state: typeof AgentState.State) => state.next,
      {
        ...nextSteps,
        FINISH: END,
      }
    );

    // Add an edge from the START node to the supervisor.
    graph.addEdge(START, "supervisor");

    // Compile the chain using the provided saver as the checkpointer.
    const chain = graph.compile({
      checkpointer: this.saver,
    });

    return chain;
  }
}
