import 'dotenv/config'
import { Client, collectPaginatedAPI } from "@notionhq/client"
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { PineconeClient } from "@pinecone-database/pinecone";

const notionDatabaseID = process.argv[2] || null;
const pineconeNamespace = process.argv[3] || null;

if (notionDatabaseID === null) {
    throw new Error('Please provide a notion database ID in argument (1st one)');
}

if (pineconeNamespace === null) {
    throw new Error('Please provide a pinecone namespace in argument (2nd one)');
}

type PageItem = {
    title: string,
    url: string,
    content: string,
}

type RichText = {
    plain_text: string
}

(async function () {
    const notion = new Client({
        auth: process.env.NOTION_API_KEY || '',
    });

    const embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY || '',
        modelName: "text-embedding-ada-002"
    });

    const pineconeClient = new PineconeClient();
    await pineconeClient.init({
        apiKey: process.env.PINECONE_API_KEY || '',
        environment: process.env.PINECONE_ENVIRONMENT || '',
    });
    const pineconeIndex = pineconeClient.Index(process.env.PINECONE_INDEX_NAME || '');
    const pineconeStore = await PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex: pineconeIndex,
        namespace: pineconeNamespace
    });

    const databaseItems = await notion.databases.query({database_id: notionDatabaseID});
    const pages: PageItem[] = await Promise.all(
        databaseItems.results.map(async (databaseItem: any) => {
            return await transformResult(databaseItem);
        })
    );

    // create and split documents into chunks of max 1000 chars
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });
    const documents = await splitter.splitDocuments(pages.map((page: PageItem): Document => {
        return {
            pageContent: page.title +"\n"+ page.content,
            metadata: {
                url: page.url,
                title: page.title,
            }
        };
    }));

    // clean namespace from old embeds
    try {
        await pineconeIndex._delete({ deleteRequest: { deleteAll: true, namespace: pineconeNamespace } });
    } catch (e) {
        console.log('Failed to delete embeds from namespace '+ pineconeNamespace);
        console.log(e);
    }
    // add new embeds to namespace
    try {
        await pineconeStore.addDocuments(documents);
    } catch (e) {
        console.log('Failed to upload embeds to namespace '+ pineconeNamespace);
        console.log(e);
    }

    async function transformResult(databaseItem: any): Promise<PageItem> {
        const blocks = await collectPaginatedAPI(notion.blocks.children.list, {
            block_id: databaseItem.id,
        });

        const pageContent = blocks
            .map(block => getContentIterativeBlocks(block))
            .join('\n')
            .trim();

        return {
            title: richTextJoiner(databaseItem.properties.Page.title),
            url: databaseItem.url,
            content: pageContent
        }
    }

    function getContentIterativeBlocks(block: any) {
        if (block.children?.length > 0) {
            return getContentIterativeBlocks(block.children);
        }

        return getContent(block);
    }

    function getContent(block: any) {
        switch (block?.type) {
            case 'bulleted_list_item':
            case 'numbered_list_item':
            case 'paragraph':
            case 'callout':
            case 'heading_1':
            case 'heading_2':
            case 'heading_3':
                return richTextJoiner(block[block.type].rich_text);
        }

        return '';
    }

    function richTextJoiner(richText: any) {
        return richText?.map(({ plain_text }: RichText) => plain_text).join('') || '';
    }

})();