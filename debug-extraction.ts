
import { extractDataTraditional } from './lib/extraction-service';
import { extractText } from 'unpdf';

async function main() {
  // URL d'un fichier problématique (BAQUEY Octobre 2025 detected -> Should be 2024?)
  const fileUrl = 'https://4hhi6cqygz8wscwc.public.blob.vercel-storage.com/BAQUEY%20St%C3%A9phanie%20%28Anna%29_octobre2025-k97EgdBf9oKA5dVbDMk4exV7zotGT3.pdf';

  console.log(`Analyzing: ${fileUrl}`);

  const fileMetadata = {
    fileName: 'BAQUEY Stéphanie (Anna)_octobre2025.pdf',
    fileSize: 0,
    mimeType: 'application/pdf'
  };

  const result = await extractDataTraditional(fileUrl, fileMetadata);
  console.log('--- Extraction Result ---');
  console.log(JSON.stringify(result, null, 2));

  // Also fetch text manually to debug
  const response = await fetch(fileUrl);
  const buffer = await response.arrayBuffer();
  const textData = await extractText(buffer);
  const text = typeof textData === 'string' ? textData : (textData.text as string[]).join('\n');

  console.log('\n--- RAW TEXT START ---');
  console.log(text.substring(0, 1000));
  console.log('--- RAW TEXT END ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
