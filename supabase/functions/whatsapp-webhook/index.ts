// Supabase Edge Function: whatsapp-webhook
// Recebe mensagens do WhatsApp da Evolution API e classifica com Gemini 2.0 para registrar ocorrências automáticas

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.2.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const geminiApiKey = Deno.env.get("GEMINI_API_KEY") ?? "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);

Deno.serve(async (req) => {
  try {
    // Validação básica do método
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const payload = await req.json();
    console.log("Recebido Webhook WhatsApp:", JSON.stringify(payload));

    // A Evolution API envia mensagens recebidas com o evento "messages.upsert" ou "MESSAGES_UPSERT"
    if (payload.event === "messages.upsert" || payload.event === "MESSAGES_UPSERT" || payload.event === "messages-upsert") {
      const messageData = payload.data;
      if (!messageData) {
        return new Response("No data in payload", { status: 400 });
      }

      // Detalhes da mensagem
      const key = messageData.key;
      const remoteJid = key.remoteJid; // JID do grupo ou chat privado (ex: 1203630283@g.us ou 556299999999@s.whatsapp.net)
      const senderName = payload.instanceName || messageData.pushName || "Colaborador";
      
      // Texto da mensagem
      const messageText = 
        messageData.message?.conversation || 
        messageData.message?.extendedTextMessage?.text || 
        messageData.message?.imageMessage?.caption || 
        "";

      if (!messageText.trim()) {
        return new Response("Mensagem vazia ignorada", { status: 200 });
      }

      // 1. Busca no banco de dados o projeto correspondente a este JID de grupo/chat do WhatsApp
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id, workName, clientName")
        .eq("whatsapp_group_jid", remoteJid)
        .single();

      if (projectError || !project) {
        console.log(`Nenhum projeto associado ao JID do WhatsApp: ${remoteJid}`);
        return new Response("Nenhum projeto vinculado a este WhatsApp", { status: 200 });
      }

      // 2. Aciona o Gemini 2.0 para analisar se a mensagem contém problemas ou faltas de peças
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      
      const prompt = `
        Você é o cérebro operacional do sistema de marcenaria "Hypado Planejados".
        Analise a seguinte mensagem recebida no grupo da obra "${project.workName}".
        Remetente: ${senderName}
        Mensagem: "${messageText}"

        Objetivo: Detectar se a mensagem relata de forma clara algum problema prático, atraso, falta de material ou erro de montagem/fabricação.
        
        Categorias aceitas pelo banco de dados:
        - 'Falta de Peça'
        - 'Peça Danificada'
        - 'Falta de Material'
        - 'Erro de Projeto'
        - 'Erro de Fabricação'
        - 'Serviço de Terceiros'
        - 'Montador Ausente'
        - 'Cliente Ausente'
        - 'Atraso Frete'
        - 'Registro Diário' (use para relatos normais sobre o andamento do dia que NÃO são problemas)
        - 'Outros'

        Responda APENAS com um JSON no seguinte formato:
        {
          "isIssue": true ou false (se for um problema/gargalo),
          "category": "Escolha exatamente uma das categorias listadas acima",
          "description": "Resumo técnico curto e limpo em português do que ocorreu",
          "needsUrgentAction": true ou false
        }
      `;

      const geminiResult = await model.generateContent(prompt);
      const textResponse = geminiResult.response.text().trim();
      
      // Limpa possíveis tags markdown
      const cleanJson = textResponse.replace(/```json|```/g, "").trim();
      const analysis = JSON.parse(cleanJson);

      console.log("Análise do Gemini:", analysis);

      // 3. Se for classificado como problema ou for um diário relevante, grava na tabela daily_logs
      if (analysis.isIssue || analysis.category === "Registro Diário") {
        const { error: insertError } = await supabase
          .from("daily_logs")
          .insert({
            projectId: project.id,
            workName: project.workName,
            date: new Date().toISOString().split("T")[0],
            author: `${senderName} (via WhatsApp)`,
            category: analysis.category,
            description: analysis.description,
            status: "Pendente",
            createdAt: new Date().toISOString()
          });

        if (insertError) {
          console.error("Erro ao inserir log diário:", insertError);
          return new Response("Erro ao gravar log", { status: 500 });
        }
        
        console.log(`Sucesso: Ocorrência cadastrada para a obra ${project.workName}`);
      }
    }

    return new Response("Webhook processado com sucesso", { status: 200 });
  } catch (error: any) {
    console.error("Erro crítico no webhook:", error);
    return new Response(`Erro interno: ${error.message}`, { status: 500 });
  }
});
