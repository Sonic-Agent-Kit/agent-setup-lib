// demo.ts
import {Llm} from "../src/utils/llm";
import { MongoHandler } from "../src/utils/memory";
import { AgentSetup } from "../src/agent.setup";
import { HumanMessage } from "@langchain/core/messages";
import { webLoader, tavilyTool, write } from "./tools/tools";

// Replace these configuration values with your actual keys and endpoints.
const llmConfig = {
  OLLAMA_BASE_URL: "http://localhost:11434",
  OPENAI_CHAT_API_KEY: "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",
  OPENAI_EMBEDDINGS_API_KEY: "your-openai-api-key",
  ANTHROPIC_API_KEY: "your-anthropic-api-key",
};

async function demo() {
  try {
    // 1. Initialize the LLM instance.
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
    console.log("LLM and embeddings instances created.");


    // 2. Setup the MongoDB memory handler.
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
    console.log("MongoDB memory handler initialized.");

    // 3. Initialize the checkpointer.
    const saver = await mongoHandler.initSaver("multiAgentDB", "checkpoints");
    console.log("Checkpointer initialized.");


    // 4. Initialize AgentSetup with the agent state and the chat LLM instance.
    const agentSetup = new AgentSetup( chatLlm.instance, saver);
    console.log("Agent setup created.");


    // 5. Create the agents
    const webSearchAgent = agentSetup.createAgent({
      team_members: ["web_search", "web_scrape"],
      tools: [tavilyTool],
      llm: chatLlm.instance,
      name: "web_search",
      system_prompt: "You are a web search agent, you have access to the tavily tool to search the web for information"
    })

    const webScrapeAgent = agentSetup.createAgent({
      team_members: ["web_scrape", "web_search"],
      tools: [webLoader],
      llm: chatLlm.instance,
      name: "web_scrape",
      system_prompt: "You are a web scrape agent, you have access to the webLoader tool to load content from web Urls for information"
    })

    // 6. Create the workflow
    const workflow = await agentSetup.createWorkflow({
      agents: [webSearchAgent, webScrapeAgent],
      llm: chatLlm.instance,
      team_name: "Research_Team",
      //supervisor_prompt: `You are a supervisor for a research team, you are responsible for overseeing and routing work to different agents based on the task at hand the agents include ${webSearchAgent.name} and ${webScrapeAgent.name}`,
      output_mode: "full_history",
    })
    console.log("Workflow created successfully:");

    const result = await workflow.invoke(
      {
        messages: [new HumanMessage("serach the web for imformation on sonic blockchain and visit one of the urls, include the url you visited in your responce so i can see for myself")],
      },
      {
        recursionLimit: 100,
        configurable: { thread_id: "588" }
      }
    )
    console.log(result.messages[result.messages.length - 1].content)
    // const finalState = await workflow.stream({
    //     messages: [new HumanMessage("use the web search agent to search the web for imformation on donald trump, and visit any relivant url")],
    //   }, {
    //     recursionLimit: 100,
    //     configurable: { thread_id: "500" }
    //   });
    //   for await (const output of finalState) {
    //     if (!output?.__end__) {
    //         console.log(output);
    //         console.log("----");
    //     }
    //   }
  } catch (error) {
    console.error("Error in demo:", error);
  }
}

// Run the demo.
demo();
