# sonic-agent-kit/agent-setup-lib

A flexible framework for orchestrating multiple specialized AI agents to collaborate on tasks. This system leverages LangChain and LangGraph to create a directed graph of agent interactions, with a supervisor agent coordinating the workflow.

## Installation

```bash
# Install dependencies
yarn add
# Build the project
yarn build

## Configuration

```
OLLAMA_BASE_URL=http://localhost:11434
OPENAI_CHAT_API_KEY=your-openai-key
OPENAI_EMBEDDINGS_API_KEY=your-openai-embeddings-key
ANTHROPIC_API_KEY=your-anthropic-key
MONGODB_URI=mongodb://localhost:27017
```

## Key Components

### AgentSetup

The `AgentSetup` class handles the initialization and configuration of agents in the system.
```typescript
const agentSetup = new AgentSetup(initialState, llm);
```

#### Methods

- **constructor(state, llm, saver?)**: Initializes the agent setup with initial state, language model, and optional saver.

- **agentStateModifier(systemPrompt, tools, teamMembers)**: Returns a function that enhances agent's state with system instructions, tools, and team information.
  ```typescript
  const stateModifier = agentSetup.agentStateModifier(
    "Research quantum computing", 
    [searchTool], 
    ["researcher", "writer"]
  );
  ```
  
- **agentStateModifierV2(systemPrompt, tools)**: A variant of the state modifier without team members.
  ```typescript
  const singleAgentModifier = agentSetup.agentStateModifierV2(
    "Write a summary of quantum computing", 
    [writingTool]
  );
  ```

- **runAgentNode({state, agent, name})**: Executes an agent and formats its output as a human message with the agent's name.
  ```typescript
  const result = await agentSetup.runAgentNode({
    state: currentState,
    agent: researchAgent,
    name: "researcher"
  });
  ```

- **createTeamSupervisor(members, system_prompt?)**: Creates a supervisor agent that decides which team member should handle the next task.
  ```typescript
  const supervisorAgent = await agentSetup.createTeamSupervisor(teamMembers);
  ```

- **createAgent({tools, llm, system_prompt, name?, team_members?})**: Factory method that creates either a single agent or a team agent based on whether team_members is provided.
  ```typescript
  const agent = agentSetup.createAgent({
    tools: [searchTool],
    llm: openAiLlm,
    system_prompt: "Research quantum physics",
    name: "researcher",
    team_members: ["researcher", "writer"] // Optional
  });
  ```

  ```typescript
  const teamWorkflow = agentSetup.createTeamWorkflow({
    teams: [researchTeam, writingTeam],
    llm: openAiLlm,
    output_mode: "last_message",
  });
  ```

### ChainCreator

The `ChainCreator` class creates and manages the workflow of agent interactions.

```typescript
const chainCreator = new ChainCreator(saver, supervisorAgent, teamMembers);
```

#### Methods

- **createChain()**: Builds and compiles a graph of agent interactions with proper routing logic.
  ```typescript
  const chain = chainCreator.createChain();
  ```

### MongoHandler

The `MongoHandler` class provides memory and state persistence using MongoDB.

```typescript
const mongoHandler = new MongoHandler(embeddings, mongoUri, vectorStoreOptions);
```

#### Methods

- **initClient()**: Initializes a MongoDB client connection.

- **initSaver(dbName, collectionName)**: Creates a MongoDB-based state saver for checkpointing.
  ```typescript
  const saver = await mongoHandler.initSaver("multiAgentDB", "checkpoints");
  ```

- **getEmbeddingsCollection()**: Gets or creates a collection for storing embeddings.

### Llm

The `Llm` class provides standardized access to different LLM providers.

```typescript
const llm = new Llm(config);
```

#### Methods

- **getChatLlm({provider, model})**: Returns a configured chat LLM instance for the specified provider.
  ```typescript
  const ollama = llm.getChatLlm({ provider: 'ollama', model: 'llama3' });
  ```

- **getEmbeddings({provider})**: Returns an embeddings provider instance.
  ```typescript
  const embeddings = llm.getEmbeddings({ provider: 'openai' });
  ```

## Usage Example

```typescript
// Configuration for LLM providers
const llmConfig = {
  OLLAMA_BASE_URL: "http://localhost:11434",
  OPENAI_CHAT_API_KEY: "your-openai-api-key",
  OPENAI_EMBEDDINGS_API_KEY: "your-openai-embeddings-key",
  ANTHROPIC_API_KEY: "your-anthropic-api-key",
  GROQ_API_KEY: "your-groq-api-key",
};

async function demo() {
  try {
    // 1. Initialize the LLM instance
    const llm = new Llm(llmConfig);
    const chatLlm = llm.getChatLlm({
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0.7,
    });
    const embeddings = llm.getEmbeddings({
      provider: "openai",
      model: "text-embedding-ada-002",
    });

    // 2. Setup the MongoDB memory handler
    const mongoHandler = new MongoHandler(
      embeddings.instance,
      "mongodb://localhost:27017",
      {
        dbName: "multiAgentDB",
        collectionName: "vectorStore",
        indexName: "defaultIndex",
        textKey: "pageContent",
        embeddingKey: "embedding",
      }
    );

    // 3. Initialize the checkpointer
    const saver = await mongoHandler.initSaver("multiAgentDB", "checkpoints");

    // 4. Initialize AgentSetup with the agent state and the chat LLM instance
    const agentSetup = new AgentSetup(chatLlm.instance, saver);

    // 5. Create specialized agents
    const webSearchAgent = agentSetup.createAgent({
      team_members: ["Web_Search", "Web_Scrape"],
      tools: [tavilyTool],
      llm: chatLlm.instance,
      name: "Web_Search",
      system_prompt: "You are a web search agent, you have access to the tavily tool to search the web for information"
    });
    
    const webScrapeAgent = agentSetup.createAgent({
      team_members: ["Web_Scrape", "Web_Search"],
      tools: [webLoader],
      llm: chatLlm.instance,
      name: "Web_Scrape",
      system_prompt: "You are a web scrape agent, you have access to the webLoader tool to load web URLs for information"
    });

    // 7. Create workflow with both agents
    const workflow = agentSetup.createWorkflow({
      agents: [webSearchAgent, webScrapeAgent],
      llm: chatLlm.instance,
      team_name: "Research_Team",
      output_mode: "last_message",
    });

    // 8. Execute the workflow with streaming
    const finalState = await workflow.stream({
      messages: [new HumanMessage("search the web for information on Donald Trump and summarize the the content of the first link")],
    }, {
      recursionLimit: 100,
      configurable: { thread_id: "17" }
    });
    
    // 9. Process streaming results
    for await (const output of finalState) {
      if (!output?.__end__) {
        console.log(output);
        console.log("----");
      }
    }
  } catch (error) {
    console.error("Error in demo:", error);
  }
}
```

## Advanced Usage: Creating Multi-Team Workflows

You can create more complex workflows by composing multiple teams:

## License

MIT