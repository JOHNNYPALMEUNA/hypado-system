import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';

// Configure the worker source
GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await getDocument({ data: arrayBuffer }).promise;

        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
            fullText += `--- PÁGINA ${i} ---\n${pageText}\n\n`;
        }

        return fullText;
    } catch (error) {
        console.error('Error reading PDF:', error);
        throw new Error('Falha ao ler o arquivo PDF. Tente novamente.');
    }
};
