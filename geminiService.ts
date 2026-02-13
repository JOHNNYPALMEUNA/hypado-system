
import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { Project, MemorialDescritivo, EnvironmentWithDetails } from "./types";

// Initialize the API with the key from Vite environment variables
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// Estado para evitar spam de requisições se a cota estiver estourada
let quotaExceededUntil = 0;

/**
 * Helper para executar chamadas com Retry e Backoff Exponencial
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 1, delay = 5000): Promise<T> {
  const now = Date.now();
  if (now < quotaExceededUntil) {
    throw new Error("429: Limite de cota atingido. Aguarde a restauração automática em breve.");
  }

  try {
    return await fn();
  } catch (error: any) {
    const errorMsg = error?.message || "";
    // Detecta erros de cota (429 ou RESOURCE_EXHAUSTED)
    const isQuotaError = errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('quota');

    if (isQuotaError) {
      // Bloqueia novas tentativas por 60 segundos para respeitar o limite do Google
      quotaExceededUntil = Date.now() + 60000;

      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return withRetry(fn, retries - 1, delay * 2);
      }
    }
    throw error;
  }
}

export async function analyzeProductionBottlenecks(projects: Project[]) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    Analise os dados de produção da marcenaria:
    ${JSON.stringify(projects.map(p => ({ id: p.id, status: p.currentStatus, valor: p.value, entrega: p.promisedDate })), null, 2)}
    
    Identifique gargalos e dê 3 conselhos práticos para acelerar as obras em Português.
  `;

  try {
    const result = await withRetry(() => model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7
      }
    }));

    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Erro Gemini:", error);
    if (error?.message?.includes('429')) {
      return "⚠️ O limite de cota gratuita do Google foi atingido. A inteligência de dados retornará em instantes.";
    }
    return "Não foi possível gerar a análise de inteligência no momento.";
  }
}

export async function analyzeReceipt(base64Image: string, context?: string) {
  // Use gemini-2.0-flash which is multimodal and fast
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  let prompt = `
    Analise esta imagem de Nota Fiscal ou Recibo.
    Extraia os itens, quantidades e valores unitários.
    Retorne APENAS um JSON no seguinte formato:
    {
      "items": [
        { "name": "Nome do item na nota", "quantity": 0, "unitPrice": 0.00, "totalPrice": 0.00 }
      ],
      "totalValue": 0.00,
      "description": "Resumo da nota (Fornecedor e data)"
    }
  `;

  if (context) {
    prompt += `
      ATENÇÃO: Tente corresponder os itens da nota com esta lista de itens esperados do pedido:
      ${context}
      
      Se encontrar um item correspondente, use o nome exato da lista de espera no JSON de retorno para facilitar o vínculo.
    `;
  }

  const imagePart: Part = {
    inlineData: {
      data: base64Image,
      mimeType: "image/jpeg",
    },
  };

  try {
    const result = await withRetry(() => model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          imagePart,
          { text: prompt }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    }));

    const response = await result.response;
    const text = response.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Erro Visão Gemini:", error);
    return null;
  }
}

export async function analyzeBlueprint(base64Image: string, instructions?: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  let prompt = `
    Analise esta imagem de planta baixa ou desenho técnico de marcenaria.
    Identifique os móveis e estime os materiais necessários (MDF, Ferragens) para a fabricação.
    
    INSTRUÇÕES EXTRAS DO USUÁRIO: ${instructions || "Nenhuma"}

    Retorne APENAS um JSON no seguinte formato:
    {
      "furniture": [
        { "name": "Nome do Móvel", "description": "Descrição breve" }
      ],
      "materials": [
        { "name": "Nome do Material (ex: MDF Branco, Corrediça)", "quantity": 0, "unit": "Chapa/Un/Par", "unitPrice": 0.00 }
      ],
      "technicalNuances": "Observações técnicas relevantes (ex: pontos de atenção, recortes)"
    }
  `;

  const imagePart: Part = {
    inlineData: {
      data: base64Image,
      mimeType: "image/jpeg",
    },
  };

  try {
    const result = await withRetry(() => model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          imagePart,
          { text: prompt }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    }));

    const response = await result.response;
    const text = response.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Erro Blueprint Gemini:", error);
    throw error;
  }
}



// Interface auxiliar para os dados do contrato
export interface ContractData {
  clientName: string;
  clientCpf: string;
  clientAddress: string;
  clientContact: string;
  value: number;
  contractDate: string;
  promisedDate: string;
  environments: { name: string; description: string }[];
}

export const parseContractData = async (pdfText: string): Promise<ContractData | null> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      Analise o texto extraído de um contrato de móveis planejados e extraia os dados para preencher um formulário de OS.
      
      TEXTO DO CONTRATO:
      ${pdfText}

      INSTRUÇÕES:
      1. Extraia dados do cliente: Nome, CPF, Endereço Completo, Contato (Email/Telefone).
      2. Extraia o valor total do contrato (numérico).
      3. Extraia a lista de ambientes e suas descrições técnicas (Anexo 01).
      4. Extraia datas/prazos se houver (Data de Assinatura, Prazo de Entrega, Prazo de Montagem).
      
      SAÍDA ESPERADA (JSON):
      {
        "clientName": "Nome do Cliente",
        "clientCpf": "CPF",
        "clientAddress": "Endereço Completo",
        "clientContact": "Email/Telefone",
        "value": 0.00,
        "contractDate": "YYYY-MM-DD",
        "promisedDate": "YYYY-MM-DD",
        "environments": [
          {
            "name": "Nome do Ambiente (ex: Cozinha)",
            "colors": { "box": "Cor da Caixaria", "front": "Cor das Frentes" },
            "modules": [
              { 
                "name": "Nome do Módulo (ex: Balcão 2 Portas)",
                "description": "Descrição detalhada",
                "dimensions": "Largura x Altura x Profundidade (se houver)",
                "details": "Atributos variantes separados por vírgula (ex: Porta de Espelho, 4 Gavetas, Amortecedor)" 
              }
            ]
          }
        ]
      }
      
      IMPORTANT:
      - Retorne APENAS o JSON válido.
      - Para 'modules', liste item a item conforme descrito no contrato.
      - Em 'details', capture especificidades como "Porta de Espelho", "Vidro", "Perfil Gola", "Led", etc.
      - Se houver cores definidas (ex: "MDF Branco", "Madeirado"), preencha 'colors'.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(text);
  } catch (error) {
    console.error('Error parsing contract:', error);
    throw new Error('Falha ao processar dados do contrato com IA.');
  }
};

// function formatDatehelper
function formatDate(date: Date) {
  return date.toLocaleDateString('pt-BR');
}

export async function generateContract(clientName: string, cpfCnpj: string, projectValue: number, deliveryDate: string, itemsDescription: string) {
  const models = ["gemini-1.5-flash", "gemini-2.0-flash"];

  const prompt = `
    PREENCHA O MODELO DE CONTRATO ABAIXO COM OS DADOS FORNECIDOS.
    Mantenha a formatação Markdown.
    
    DADOS:
    - CONTRATANTE: ${clientName} (CPF/CNPJ: ${cpfCnpj})
    - VALOR TOTAL: R$ ${projectValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
    - DESCRIÇÃO DOS MÓVEIS: ${itemsDescription}
    - DATA DE ENTREGA PREVISTA: ${deliveryDate}
    - DATA DE HOJE: ${formatDate(new Date())}

    MODELO DE CONTRATO (USE ESTE TEXTO BASE):
    
    # CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MARCENARIA

    Pelo presente instrumento particular, de um lado **HYPADO PLANEJADOS**, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 00.000.000/0001-00, doravante denominada **CONTRATADA**, e de outro lado **{{CLIENT_NAME}}**, inscrito(a) no CPF/CNPJ sob o nº {{CPF_CNPJ}}, doravante denominado(a) **CONTRATANTE**, ajustam entre si o seguinte:

    ## 1. DO OBJETO
    1.1. O presente contrato tem por objeto a fabricação e instalação de móveis planejados, conforme projeto aprovado e memorial descritivo anexo, abrangendo:
    {{ITEMS_DESCRIPTION}}

    ## 2. DO VALOR E FORMA DE PAGAMENTO
    2.1. Pelos serviços contratados, o(a) CONTRATANTE pagará à CONTRATADA a importância total de **{{VALUE}}**.
    2.2. Forma de pagamento: [Preencher manualmente condições de parcelamento/sinal].

    ## 3. DOS PRAZOS
    3.1. A entrega e instalação dos móveis estão previstas para **{{DELIVERY_DATE}}**, contando-se o prazo a partir da aprovação final do projeto executivo e confirmação das medidas no local (medição fina).
    3.2. O prazo poderá ser prorrogado em caso de força maior, alterações no projeto solicitadas pelo cliente ou impedimento de acesso ao local.

    ## 4. DA GARANTIA E ASSISTÊNCIA TÉCNICA
    4.1. A CONTRATADA oferece garantia de **5 (cinco) anos** contra defeitos de fabricação e montagem, contados a partir da data de finalização da instalação.
    4.2. A garantia não cobre danos causados por mau uso, umidade excessiva (infiltrações), produtos de limpeza inadequados, ou alterações feitas por terceiros.
    4.3. Ferragens e acessórios possuem a garantia de seus respectivos fabricantes.

    ## 5. DAS DISPOSIÇÕES GERAIS
    5.1. O local de instalação deverá estar livre, limpo e com as instalações elétricas e hidráulicas concluídas antes do início da montagem.
    5.2. As partes elegem o foro da comarca local para dirimir quaisquer dúvidas oriundas deste contrato.

    Local e Data: ______________________, {{CURRENT_DATE}}

    __________________________________________
    **HYPADO PLANEJADOS**

    __________________________________________
    **{{CLIENT_NAME}}**
  `;

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error: any) {
      console.error(`Erro Contrato Gemini (${modelName}):`, error);
      if (modelName === models[models.length - 1]) return "Erro ao gerar contrato. Tente novamente mais tarde.";
      if (error.message?.includes("429")) await new Promise(r => setTimeout(r, 2000));
    }
  }
  return "Erro desconhecido ao gerar contrato.";
}


