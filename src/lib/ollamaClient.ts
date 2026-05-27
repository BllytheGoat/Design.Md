// Local Ollama execution assistant running directly from the developer's browser to connect seamlessly with localhost endpoints.
// This design bypasses Cloud Run backend isolation.

export async function executeClientSideOllamaDesign(
  payload: {
    systemPromptA: string;
    userPromptA: string;
    systemPromptB: string;
    userPromptB: string;
    targetUrl: string;
    pageTitle: string;
    pageDescription: string;
    contextDevBrandData: any;
  },
  selectedModel: string,
  apiBaseUrl: string,
  userApiKey: string
) {
  const finalBaseUrl = apiBaseUrl?.trim() || "http://localhost:11434";
  let endpointUrl = finalBaseUrl;
  const isNativeApiChat = endpointUrl.endsWith("/api/chat");
  const isNativeApiGenerate = endpointUrl.endsWith("/api/generate");

  if (!isNativeApiChat && !isNativeApiGenerate && !endpointUrl.includes("/chat/completions") && !endpointUrl.includes("/api/")) {
    endpointUrl = `${endpointUrl.replace(/\/+$/, "")}/v1/chat/completions`;
  }

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json"
  };
  const finalKey = userApiKey?.trim() || "";
  if (finalKey) {
    requestHeaders["Authorization"] = `Bearer ${finalKey}`;
  }

  const modelName = selectedModel === "default" || !selectedModel ? "llama3" : selectedModel;
  console.log(`[Ollama Client] Direct browser query to: ${endpointUrl} via model: ${modelName}`);

  const makePayload = (systemPrompt: string, userPrompt: string, useFormat: boolean) => {
    if (isNativeApiChat) {
      const pl: any = {
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        stream: false
      };
      if (useFormat) pl.format = "json";
      return pl;
    } else if (isNativeApiGenerate) {
      const pl: any = {
        model: modelName,
        prompt: `${systemPrompt}\n\nUser Question:\n${userPrompt}`,
        stream: false
      };
      if (useFormat) pl.format = "json";
      return pl;
    } else {
      const pl: any = {
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      };
      if (useFormat) pl.response_format = { type: "json_object" };
      return pl;
    }
  };

  const extractAssistantContent = (rawJson: any) => {
    if (isNativeApiChat) return rawJson.message?.content || "";
    if (isNativeApiGenerate) return rawJson.response || "";
    return rawJson.choices?.[0]?.message?.content || "";
  };

  const cleanJsonResponse = (text: string) => {
    let clean = text.trim();
    if (clean.startsWith("```json")) {
      clean = clean.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
    } else if (clean.startsWith("```")) {
      clean = clean.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    return clean;
  };

  const fetchTask = async (systemPrompt: string, userPrompt: string, taskLabel: string): Promise<any> => {
    let response;
    try {
      response = await fetch(endpointUrl, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(makePayload(systemPrompt, userPrompt, true))
      });
    } catch (err: any) {
      throw new Error(`Failed to establish connection with local Ollama service at ${endpointUrl}. Please ensure your local Ollama server is running, and CORS origin policy is open (run with OLLAMA_ORIGINS="*" set in your environment variables). Details: ${err.message}`);
    }

    if (!response.ok) {
      if (response.status === 400 || response.status === 404 || response.status === 422) {
        console.warn(`[Ollama Client] Structured output format rejected (${response.status}). Retrying without schema formatting...`);
        try {
          const retryResponse = await fetch(endpointUrl, {
            method: "POST",
            headers: requestHeaders,
            body: JSON.stringify(makePayload(systemPrompt, userPrompt, false))
          });
          if (retryResponse.ok) {
            const raw = await retryResponse.json();
            const content = extractAssistantContent(raw);
            if (content) return JSON.parse(cleanJsonResponse(content));
          }
        } catch (innerErr) {
          console.error("Local Ollama fallback stream retrieval failed:", innerErr);
        }
      }
      const rawText = await response.text();
      throw new Error(`Ollama API error [HTTP ${response.status}]: ${rawText.substring(0, 300)}`);
    }

    const raw = await response.json();
    const content = extractAssistantContent(raw);
    if (!content) {
      throw new Error(`Empty execution text received from your local model during ${taskLabel}.`);
    }
    return JSON.parse(cleanJsonResponse(content));
  };

  console.log("Analyzing design patterns locally on user hardware via parallel browser worker tasks...");
  const [taskAResult, taskBResult] = await Promise.all([
    fetchTask(payload.systemPromptA, payload.userPromptA, "Task A (Core Schema System)"),
    fetchTask(payload.systemPromptB, payload.userPromptB, "Task B (UI Design Elements)")
  ]);

  return {
    appName: taskAResult.appName || `${payload.targetUrl.replace(/^https?:\/\/(www\.)?/i, "").split("/")[0]} Brand`,
    description: taskAResult.description || "Synthesised from local device execution results.",
    markdownContent: taskAResult.markdownContent || "",
    colors: taskAResult.colors || [],
    typography: taskAResult.typography || [],
    components: taskBResult.components || [],
    isLiveAnalysis: true,
    contextDevBrandData: payload.contextDevBrandData || undefined
  };
}

export async function executeClientSideOllamaRefine(
  payload: { systemPrompt: string; userPrompt: string },
  selectedModel: string,
  apiBaseUrl: string,
  userApiKey: string
) {
  const finalBaseUrl = apiBaseUrl?.trim() || "http://localhost:11434";
  let endpointUrl = finalBaseUrl;
  const isNativeApiChat = endpointUrl.endsWith("/api/chat");
  const isNativeApiGenerate = endpointUrl.endsWith("/api/generate");

  if (!isNativeApiChat && !isNativeApiGenerate && !endpointUrl.includes("/chat/completions") && !endpointUrl.includes("/api/")) {
    endpointUrl = `${endpointUrl.replace(/\/+$/, "")}/v1/chat/completions`;
  }

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json"
  };
  const finalKey = userApiKey?.trim() || "";
  if (finalKey) {
    requestHeaders["Authorization"] = `Bearer ${finalKey}`;
  }

  const modelName = selectedModel === "default" || !selectedModel ? "llama3" : selectedModel;
  console.log(`[Ollama Refine Client] Direct browser query to: ${endpointUrl} via model: ${modelName}`);

  const makePayload = (systemPrompt: string, userPrompt: string, useFormat: boolean) => {
    if (isNativeApiChat) {
      const pl: any = {
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        stream: false
      };
      if (useFormat) pl.format = "json";
      return pl;
    } else if (isNativeApiGenerate) {
      const pl: any = {
        model: modelName,
        prompt: `${systemPrompt}\n\nUser Question:\n${userPrompt}`,
        stream: false
      };
      if (useFormat) pl.format = "json";
      return pl;
    } else {
      const pl: any = {
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      };
      if (useFormat) pl.response_format = { type: "json_object" };
      return pl;
    }
  };

  const extractAssistantContent = (rawJson: any) => {
    if (isNativeApiChat) return rawJson.message?.content || "";
    if (isNativeApiGenerate) return rawJson.response || "";
    return rawJson.choices?.[0]?.message?.content || "";
  };

  const cleanJsonResponse = (text: string) => {
    let clean = text.trim();
    if (clean.startsWith("```json")) {
      clean = clean.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
    } else if (clean.startsWith("```")) {
      clean = clean.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    return clean;
  };

  let response;
  try {
    response = await fetch(endpointUrl, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(makePayload(payload.systemPrompt, payload.userPrompt, true))
    });
  } catch (err: any) {
    throw new Error(`Failed to establish connection with local Ollama service at ${endpointUrl}. Please ensure your local Ollama server is running, and CORS origin policy is open (run with OLLAMA_ORIGINS="*" set in your environment variables). Details: ${err.message}`);
  }

  if (!response.ok) {
    if (response.status === 400 || response.status === 404 || response.status === 422) {
      console.warn(`[Ollama Refine Client] Structured output format rejected (${response.status}). Retrying without schema formatting...`);
      try {
        const retryResponse = await fetch(endpointUrl, {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify(makePayload(payload.systemPrompt, payload.userPrompt, false))
        });
        if (retryResponse.ok) {
          const raw = await retryResponse.json();
          const content = extractAssistantContent(raw);
          if (content) return JSON.parse(cleanJsonResponse(content));
        }
      } catch (innerErr) {
        console.error("Local Ollama fallback stream retrieval failed:", innerErr);
      }
    }
    const rawText = await response.text();
    throw new Error(`Ollama API error [HTTP ${response.status}]: ${rawText.substring(0, 300)}`);
  }

  const raw = await response.json();
  const content = extractAssistantContent(raw);
  if (!content) {
    throw new Error("Empty execution text received from your local model during component refinement.");
  }
  return JSON.parse(cleanJsonResponse(content));
}
