import { z } from "zod";
import { HumanMessage, BaseMessage, SystemMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { JsonOutputToolsParser, ParsedToolCall } from "langchain/output_parsers";
import { Runnable, RunnableConfig } from "@langchain/core/runnables";
import { StructuredToolInterface } from "@langchain/core/tools";
import { MessagesAnnotation } from "@langchain/langgraph";
import { superviso_prompt } from "./prompts/supervisor";
import { ChainCreator, Member } from "./agent.service";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatLlmInstance } from "./utils/llm";


// Define the state schema
export const AgentState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
      reducer: (x, y) => x.concat(y),
    }),
    team_members: Annotation<string[]>({
      reducer: (x, y) => x.concat(y),
    }),
    next: Annotation<string>({
      reducer: (x, y) => y ?? x,
      default: () => "supervisor",
    }),
    instructions: Annotation<string>({
      reducer: (x, y) => y ?? x,
      default: () => "Select the correct team member for the task",
    }),
    stateOption: Annotation<string>({
        reducer: (x, y) => y ?? x,
      }),
});

const initialState = {
  messages: [
    new HumanMessage({
      content: "Hello, starting multi-agent workflow.",
    }),
  ],
  team_members: [],
  next: "supervisor",
  instructions: "Select the correct team member for the task",
  stateOption: "",
};


export class AgentSetup {
  public state: typeof AgentState.State;
  public llm: any;
  public saver: any;

  /**
   * 
   * @param state 
   * @param llm 
   * @param saver 
   */
  constructor(llm: any, saver?: any) {
    this.state = initialState;
    this.llm = llm;
    this.saver = saver;
  }

  /**
   * Returns a string that modifies the agent's state based on the conversation history.
   *
   * @param systemPrompt - The system prompt.
   * @param tools - The list of available tools.
   * @param teamMembers - The list of team member names.
   * @returns A string that is the modified state.
   */
  public agentStateModifier(
    systemPrompt: string,
    tools: StructuredToolInterface[],
    teamMembers: string[]
  ) {
    const toolNames = tools.map((t) => t.name).join(", ");
    const systemMsgStart = new SystemMessage(
      systemPrompt +
        "\nWork autonomously according to your specialty, using the tools available to you." +
        " Do not ask for clarification." +
        " Your other team members (and other teams) will collaborate with you with their own specialties." +
        ` You are chosen for a reason! You are one of the following team members: ${teamMembers.join(
          ", "
        )}.`
    );

    const systemMsgEnd = new SystemMessage(
      `Supervisor instructions: ${systemPrompt}\n` +
        `Remember, you individually can only use these tools: ${toolNames}` +
        "\n\nEnd if you have already completed the requested task. Communicate the work completed."
    );

    const stateModifier = (state: typeof MessagesAnnotation.State): string => {
        const messages = state.messages.map(
          (msg, index) => `"Message ${index + 1}": ${msg.content}`
        );
    
        return [
          `"System Message Start": ${systemMsgStart.content}`,
          ...messages,
          `"System Message End": ${systemMsgEnd.content}`,
        ].join("\n");
      };

    return stateModifier
  }

   /**
   * Returns a string that modifies the agent's state based on the conversation history.
   *
   * @param systemPrompt - The system prompt.
   * @param tools - The list of available tools.
   * @returns A string that is the modified state.
   */
   public agentStateModifierV2(
    systemPrompt: string,
    tools: StructuredToolInterface[],
  ) {
    const toolNames = tools.map((t) => t.name).join(", ");
    const systemMsgStart = new SystemMessage(
      systemPrompt +
        "\nWork autonomously according to your specialty, using the tools available to you." +
        " Do not ask for clarification." +
        ` You are chosen for a reason!.`
    );

    const systemMsgEnd = new SystemMessage(
      `instructions: ${systemPrompt}\n` +
        `Remember, you individually can only use these tools: ${toolNames}` +
        "\n\nEnd if you have already completed the requested task. Communicate the work completed."
    );

    const stateModifier = (state: typeof MessagesAnnotation.State): string => {
        const messages = state.messages.map(
          (msg, index) => `"Message ${index + 1}": ${msg.content}`
        );
    
        return [
          `"System Message Start": ${systemMsgStart.content}`,
          ...messages,
          `"System Message End": ${systemMsgEnd.content}`,
        ].join("\n");
      };

    return stateModifier
  }

  /**
   * Invokes an agent node and returns a new HumanMessage based on the agent's last message.
   *
   * @param params - An object containing the agent (Runnable) and the name.
   * @returns An object with a `messages` property containing the HumanMessage.
   */
  public async runAgentNode(params: {
    state: any;
    agent: Runnable;
    name: string;
  }): Promise<{ messages: HumanMessage[] }> {
    const { state, agent, name } = params;
    const result = await agent.invoke({
        messages: state.messages,
    });
    const lastMessage = result.messages[result.messages.length - 1];
    return {
        messages: [new HumanMessage({ content: lastMessage.content, name })],
    };
  }

  /**
   * Creates a team supervisor runnable that selects the next role.
   *
   * @param members - The list of team member names and their classification if any.
   * @returns A Promise resolving to a Runnable that selects the next role.
   */
  public async createTeamSupervisor(
    members: Member[],
    system_prompt?:string
  ): Promise<Runnable> {
    const membersName = members.map(x => x.name)
    
    const options = ["FINISH", ...membersName];
    const routeTool = {
      name: "route",
      description: "Select the next role.",
      schema: z.object({
        reasoning: z.string(),
        next: z.enum(["FINISH", ...membersName]),
        instructions: z
          .string()
          .describe(
            "The specific instructions of the sub-task the next role should accomplish."
          ),
      }),
    };

    const _systemPrompt = await superviso_prompt(members, system_prompt);

    let prompt = ChatPromptTemplate.fromMessages([
      ["system", _systemPrompt],
      new MessagesPlaceholder("messages"),
      [
        "system",
        `Given the conversation above, who should act next? Or should we FINISH? Select one of: ${options}`,
      ],
    ]);

    prompt = await prompt.partial({
      team_members: membersName.join(", "),
    });

    const supervisor = prompt
    .pipe(
      this.llm.bindTools([routeTool], {
        tool_choice: "route",
      }),
    )
    .pipe(new JsonOutputToolsParser() as unknown as Runnable<unknown, ParsedToolCall[], RunnableConfig<Record<string, any>>>)
    // select the first one
    .pipe((x) => ({
      next: x[0].args.next,
      instructions: x[0].args.instructions,
    }));
  return supervisor;
  }

  /**
   * Creates a single agent runnable.
   *
   * @param params - An object containing the tools, LLM, and system prompt.
   * @returns A Promise resolving to a Runnable that represents the single agent.
   */
  private createSingleAgent(params: {tools: StructuredToolInterface[], llm: any, system_prompt: string , name?: string}) {
    const stateModifier = this.agentStateModifierV2(params.system_prompt, params.tools)
    const agent = createReactAgent({
      llm: this.llm,
      tools: params.tools,
      name: params.name ?? "Agent",
      checkpointer: this.saver ? this.saver : undefined,
      messageModifier: stateModifier(this.state)
    });
    return agent;
  }

  /**
   * Creates a team agent runnable.
   *
   * @param params - An object containing the members, tools, LLM, and system prompt.
   * @returns A Promise resolving to a Runnable that represents the team agent.
   */
  private createTeamAgent(params: {members: string[], tools: StructuredToolInterface[], llm: any, system_prompt: string, name?: string}) {
    const stateModifier = this.agentStateModifier(params.system_prompt, params.tools, params.members)
    const agent = createReactAgent({
      llm: this.llm,
      name: params.name ?? "Agent",
      tools: params.tools,
      messageModifier: stateModifier(this.state)
    });
    return agent;
  }

  public createAgent(params: {
    tools: StructuredToolInterface[],
    llm: any,
    system_prompt: string,
    name?: string,
    team_members?: string[],
  }): ReturnType<typeof createReactAgent> {
    if (params.team_members) {
      return this.createTeamAgent({
        members: params.team_members,
        tools: params.tools,
        llm: params.llm,
        system_prompt: params.system_prompt,
        name: params.name ?? "Agent",
      });
    } else {
      return this.createSingleAgent({
        tools: params.tools,
        llm: params.llm,
        system_prompt: params.system_prompt,
        name: params.name ?? "Agent",
      });
    }
  }

  async createWorkflow(params: {
    agents: Array<ReturnType<typeof createReactAgent>>,
    llm: any,
    team_name: string,
    supervisor_prompt?: string,
    output_mode?: string,
  }) {
    const members:Member[] = params.agents.map((x) => {
      const member:Member = {name: x.name ?? "Agent", classification: [], func: async (state: typeof AgentState.State) => {
        return await this.runAgentNode({state: state, agent: x, name: x.name ?? "Agent"})
      }}
      return member
    })
    const supervisor = await this.createTeamSupervisor(members, params.supervisor_prompt ? params.supervisor_prompt : undefined )
    const chain = new ChainCreator(this.saver, supervisor, members)
    return chain.createChain()
  }
}
