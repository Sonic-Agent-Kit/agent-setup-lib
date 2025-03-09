import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

export const tavilyTool = new TavilySearchResults({apiKey: "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"});

export const webLoader = tool(async (input) => {
  const loader = new CheerioWebBaseLoader(input.url);
  const docs = await loader.load();
  const formattedDocs = docs.map(
    (doc) =>
      `<Document name="${doc.metadata?.title}">\n${doc.pageContent}\n</Document>`,
  );
  return formattedDocs.join("\n\n");
  },
  {
    name: "webpage_loader",
    description: "Scrape the contents of a webpage.",
    schema: z.object({
      url: z.string(),
    }),
  }
)




export const write = tool(async ({ file_name, content, working_directory }) => {
  if (
    !(await fs
      .stat(working_directory)
      .then(() => true)
      .catch(() => false))
  ) {
      await fs.mkdir(working_directory, { recursive: true });
  }
  const filePath = path.join(working_directory, file_name);
  await fs.writeFile(filePath, content);
  },
{
  name: "write",
  description: "Write a file to the working directory.",
  schema: z.object({
    file_name: z.string(),
    content: z.string(),
    working_directory: z.string(),
  }),
}
)