import 'dotenv/config'
import { PineconeClient } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

const query = process.argv[3] || null;
const pineconeNamespace = process.argv[2] || null;

if (pineconeNamespace === null) {
    throw new Error('Please provide a pinecone namespace in argument (1st one)');
}

if (query === null) {
    throw new Error('Please provide a query in argument (2nd one)');
}

(async function() {
    const pinecone = new PineconeClient();
    await pinecone.init({
        environment: process.env.PINECONE_ENVIRONMENT || '',
        apiKey: process.env.PINECONE_API_KEY || '',
    });

    const embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY || '',
        modelName: "text-embedding-ada-002"
    });

    const vector = await embeddings.embedQuery(query);

    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME || '');
    const queryRequest = {
        vector: vector,
        topK: 5,
        includeValues: false,
        includeMetadata: true,
        namespace: pineconeNamespace,
    };
    const queryResponse = await index.query({ queryRequest });

    console.log(queryResponse.matches?.map(function (e) {
        return { score: e.score, name: e.metadata}
    }));
})()
