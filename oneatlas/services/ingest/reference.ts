/**
 * Curated reference metadata: labs and providers.
 * Hand-maintained (source MANUAL, sourceUrl = the organisation's own site). Only widely-known,
 * stable facts are recorded; anything uncertain is left null rather than guessed.
 */
import type { ProviderType } from "@/generated/prisma/enums";
import { prettyId, slugify } from "./slug";

export interface LabMeta {
  slug: string; name: string; description: string; websiteUrl: string; docsUrl?: string;
  headquarters?: string; foundedYear?: number;
}

export const LABS: Record<string, LabMeta> = {
  openai: { slug: "openai", name: "OpenAI", description: "AI research and deployment company behind the GPT model family and ChatGPT.", websiteUrl: "https://openai.com", docsUrl: "https://platform.openai.com/docs", headquarters: "San Francisco, USA", foundedYear: 2015 },
  anthropic: { slug: "anthropic", name: "Anthropic", description: "AI safety company that develops the Claude family of models.", websiteUrl: "https://www.anthropic.com", docsUrl: "https://docs.anthropic.com", headquarters: "San Francisco, USA", foundedYear: 2021 },
  google: { slug: "google", name: "Google", description: "Google and Google DeepMind build the Gemini family of models and the open Gemma models.", websiteUrl: "https://deepmind.google", docsUrl: "https://ai.google.dev", headquarters: "Mountain View, USA" },
  meta: { slug: "meta", name: "Meta", description: "Meta AI develops the Llama family of models, released with downloadable weights.", websiteUrl: "https://ai.meta.com", headquarters: "Menlo Park, USA" },
  deepseek: { slug: "deepseek", name: "DeepSeek", description: "Chinese AI lab known for the DeepSeek-V and DeepSeek-R model series.", websiteUrl: "https://www.deepseek.com", docsUrl: "https://api-docs.deepseek.com", headquarters: "Hangzhou, China", foundedYear: 2023 },
  mistral: { slug: "mistral", name: "Mistral AI", description: "Paris-based company building open-weight and commercial language models.", websiteUrl: "https://mistral.ai", docsUrl: "https://docs.mistral.ai", headquarters: "Paris, France", foundedYear: 2023 },
  xai: { slug: "xai", name: "xAI", description: "Develops the Grok family of models.", websiteUrl: "https://x.ai", docsUrl: "https://docs.x.ai", foundedYear: 2023 },
  cohere: { slug: "cohere", name: "Cohere", description: "Enterprise-focused AI company behind the Command, Embed and Rerank models.", websiteUrl: "https://cohere.com", docsUrl: "https://docs.cohere.com", headquarters: "Toronto, Canada", foundedYear: 2019 },
  alibaba: { slug: "alibaba", name: "Alibaba", description: "Develops the Qwen model family, served through Alibaba Cloud Model Studio.", websiteUrl: "https://www.alibabacloud.com", headquarters: "Hangzhou, China" },
  "moonshot-ai": { slug: "moonshot-ai", name: "Moonshot AI", description: "Beijing-based lab behind the Kimi models.", websiteUrl: "https://www.moonshot.ai", headquarters: "Beijing, China", foundedYear: 2023 },
  minimax: { slug: "minimax", name: "MiniMax", description: "Shanghai-based AI company building the MiniMax model series.", websiteUrl: "https://www.minimax.io", headquarters: "Shanghai, China" },
  "zhipu-ai": { slug: "zhipu-ai", name: "Zhipu AI", description: "Beijing-based lab behind the GLM models; operates the Z.ai platform.", websiteUrl: "https://z.ai", headquarters: "Beijing, China", foundedYear: 2019 },
  bytedance: { slug: "bytedance", name: "ByteDance", description: "Develops the Doubao / Seed model families, served through Volcengine.", websiteUrl: "https://www.volcengine.com", headquarters: "Beijing, China" },
  amazon: { slug: "amazon", name: "Amazon", description: "Builds the Amazon Nova family of models, available on Amazon Bedrock.", websiteUrl: "https://aws.amazon.com/ai/generative-ai/nova", headquarters: "Seattle, USA" },
  "ai21-labs": { slug: "ai21-labs", name: "AI21 Labs", description: "Israel-based lab behind the Jamba model family.", websiteUrl: "https://www.ai21.com", headquarters: "Tel Aviv, Israel" },
  tencent: { slug: "tencent", name: "Tencent", description: "Develops the Hunyuan / Hy model family.", websiteUrl: "https://hunyuan.tencent.com", headquarters: "Shenzhen, China" },
  inception: { slug: "inception", name: "Inception", description: "Builds the Mercury family of diffusion-based language models.", websiteUrl: "https://www.inceptionlabs.ai" },
  xiaomi: { slug: "xiaomi", name: "Xiaomi", description: "Develops the MiMo family of models.", websiteUrl: "https://www.mi.com", headquarters: "Beijing, China" },
};

/** litellm_provider ids whose entries DEFINE a lab's own models (priority = listing order). */
export const ANCHORS: Record<string, string> = {
  openai: "openai", anthropic: "anthropic", gemini: "google", "vertex_ai-language-models": "google",
  mistral: "mistral", deepseek: "deepseek", xai: "xai", cohere_chat: "cohere", cohere: "cohere",
  dashscope: "alibaba", meta_llama: "meta", meta: "meta", moonshot: "moonshot-ai", minimax: "minimax",
  zai: "zhipu-ai", volcengine: "bytedance", amazon_nova: "amazon", ai21: "ai21-labs", tencent: "tencent",
  inception: "inception", xiaomi_mimo: "xiaomi",
};

export interface ProviderMeta {
  slug: string; name: string; type: ProviderType; websiteUrl?: string; docsUrl?: string; description?: string;
}
const P = (slug: string, name: string, type: ProviderType, websiteUrl?: string, docsUrl?: string, description?: string): ProviderMeta =>
  ({ slug, name, type, websiteUrl, docsUrl, description });

/** Several litellm_provider ids can be one real provider (bedrock, bedrock_converse → Amazon Bedrock). */
export const PROVIDER_META: Record<string, ProviderMeta> = {
  openai: P("openai", "OpenAI", "FIRST_PARTY", "https://openai.com", "https://platform.openai.com/docs", "OpenAI's own API platform."),
  anthropic: P("anthropic", "Anthropic", "FIRST_PARTY", "https://www.anthropic.com", "https://docs.anthropic.com", "Anthropic's own API for the Claude models."),
  gemini: P("google-ai-studio", "Google AI Studio", "FIRST_PARTY", "https://ai.google.dev", "https://ai.google.dev/gemini-api/docs", "Gemini API from Google."),
  "vertex_ai-language-models": P("google-vertex-ai", "Google Vertex AI", "CLOUD_PLATFORM", "https://cloud.google.com/vertex-ai", "https://cloud.google.com/vertex-ai/docs", "Google Cloud's managed AI platform."),
  bedrock: P("amazon-bedrock", "Amazon Bedrock", "CLOUD_PLATFORM", "https://aws.amazon.com/bedrock", "https://docs.aws.amazon.com/bedrock", "AWS managed service for foundation models."),
  azure: P("azure-openai", "Azure OpenAI", "CLOUD_PLATFORM", "https://azure.microsoft.com/products/ai-services/openai-service", "https://learn.microsoft.com/azure/ai-services/openai", "OpenAI models on Microsoft Azure."),
  azure_ai: P("azure-ai-foundry", "Azure AI Foundry", "CLOUD_PLATFORM", "https://ai.azure.com", "https://learn.microsoft.com/azure/ai-foundry", "Microsoft's catalog of third-party and open models."),
  mistral: P("mistral-ai", "Mistral AI", "FIRST_PARTY", "https://mistral.ai", "https://docs.mistral.ai"),
  deepseek: P("deepseek", "DeepSeek", "FIRST_PARTY", "https://www.deepseek.com", "https://api-docs.deepseek.com"),
  xai: P("xai", "xAI", "FIRST_PARTY", "https://x.ai", "https://docs.x.ai"),
  cohere_chat: P("cohere", "Cohere", "FIRST_PARTY", "https://cohere.com", "https://docs.cohere.com"),
  dashscope: P("alibaba-cloud", "Alibaba Cloud Model Studio", "FIRST_PARTY", "https://www.alibabacloud.com", "https://www.alibabacloud.com/help/en/model-studio"),
  meta_llama: P("meta-llama-api", "Meta Llama API", "FIRST_PARTY", "https://llama.developer.meta.com"),
  moonshot: P("moonshot-ai", "Moonshot AI", "FIRST_PARTY", "https://platform.moonshot.ai"),
  minimax: P("minimax", "MiniMax", "FIRST_PARTY", "https://www.minimax.io"),
  zai: P("z-ai", "Z.ai", "FIRST_PARTY", "https://z.ai"),
  volcengine: P("volcengine", "Volcengine", "FIRST_PARTY", "https://www.volcengine.com"),
  amazon_nova: P("amazon-nova", "Amazon Nova", "FIRST_PARTY", "https://aws.amazon.com/ai/generative-ai/nova"),
  ai21: P("ai21", "AI21 Labs", "FIRST_PARTY", "https://www.ai21.com"),
  tencent: P("tencent", "Tencent", "FIRST_PARTY", "https://hunyuan.tencent.com"),
  inception: P("inception", "Inception", "FIRST_PARTY", "https://www.inceptionlabs.ai"),
  xiaomi_mimo: P("xiaomi-mimo", "Xiaomi MiMo", "FIRST_PARTY", "https://www.mi.com"),
  fireworks_ai: P("fireworks-ai", "Fireworks AI", "INFERENCE_HOST", "https://fireworks.ai", "https://docs.fireworks.ai"),
  together_ai: P("together-ai", "Together AI", "INFERENCE_HOST", "https://www.together.ai", "https://docs.together.ai"),
  deepinfra: P("deepinfra", "DeepInfra", "INFERENCE_HOST", "https://deepinfra.com", "https://deepinfra.com/docs"),
  novita: P("novita-ai", "Novita AI", "INFERENCE_HOST", "https://novita.ai"),
  nebius: P("nebius", "Nebius", "INFERENCE_HOST", "https://nebius.com"),
  baseten: P("baseten", "Baseten", "INFERENCE_HOST", "https://www.baseten.co"),
  groq: P("groq", "Groq", "INFERENCE_HOST", "https://groq.com", "https://console.groq.com/docs"),
  cerebras: P("cerebras", "Cerebras", "INFERENCE_HOST", "https://www.cerebras.ai"),
  sambanova: P("sambanova", "SambaNova", "INFERENCE_HOST", "https://sambanova.ai"),
  hyperbolic: P("hyperbolic", "Hyperbolic", "INFERENCE_HOST", "https://hyperbolic.xyz"),
  lambda_ai: P("lambda", "Lambda", "INFERENCE_HOST", "https://lambda.ai"),
  nvidia_nim: P("nvidia-nim", "NVIDIA NIM", "INFERENCE_HOST", "https://build.nvidia.com"),
  replicate: P("replicate", "Replicate", "INFERENCE_HOST", "https://replicate.com"),
  perplexity: P("perplexity", "Perplexity", "INFERENCE_HOST", "https://www.perplexity.ai"),
  cloudflare: P("cloudflare-workers-ai", "Cloudflare Workers AI", "INFERENCE_HOST", "https://developers.cloudflare.com/workers-ai"),
  databricks: P("databricks", "Databricks", "CLOUD_PLATFORM", "https://www.databricks.com"),
  snowflake: P("snowflake-cortex", "Snowflake Cortex", "CLOUD_PLATFORM", "https://www.snowflake.com"),
  oci: P("oci-generative-ai", "Oracle OCI Generative AI", "CLOUD_PLATFORM", "https://www.oracle.com/artificial-intelligence/generative-ai"),
  watsonx: P("ibm-watsonx", "IBM watsonx.ai", "CLOUD_PLATFORM", "https://www.ibm.com/watsonx"),
  openrouter: P("openrouter", "OpenRouter", "GATEWAY", "https://openrouter.ai", "https://openrouter.ai/docs"),
  vercel_ai_gateway: P("vercel-ai-gateway", "Vercel AI Gateway", "GATEWAY", "https://vercel.com/ai-gateway"),
  github_copilot: P("github-copilot", "GitHub Copilot", "GATEWAY", "https://github.com/features/copilot"),
  aihubmix: P("aihubmix", "AIHubMix", "GATEWAY", "https://aihubmix.com"),
};
/** Alias ids that map onto another entry in PROVIDER_META. */
const PROVIDER_ALIAS: Record<string, string> = {
  bedrock_converse: "bedrock", bedrock_mantle: "bedrock",
  "vertex_ai": "vertex_ai-language-models",
  cohere: "cohere_chat", qwen_ai_platform: "dashscope", qwencloud: "dashscope", meta: "meta_llama",
  "vertex_ai-anthropic_models": "vertex_ai-language-models", "vertex_ai-mistral_models": "vertex_ai-language-models",
  "vertex_ai-llama_models": "vertex_ai-language-models", "vertex_ai-deepseek_models": "vertex_ai-language-models",
  "vertex_ai-qwen_models": "vertex_ai-language-models", "vertex_ai-moonshot_models": "vertex_ai-language-models",
  "vertex_ai-minimax_models": "vertex_ai-language-models", "vertex_ai-zai_models": "vertex_ai-language-models",
  "vertex_ai-ai21_models": "vertex_ai-language-models", "vertex_ai-openai_models": "vertex_ai-language-models",
  text_completion_openai: "openai", chatgpt: "openai", "text-completion-inception": "inception",
};

export function resolveProvider(litellmId: string): ProviderMeta {
  const id = PROVIDER_ALIAS[litellmId] ?? litellmId;
  return PROVIDER_META[id] ?? P(slugify(litellmId), prettyId(litellmId), "INFERENCE_HOST");
}

/**
 * Evidence for the open-weights flag. Only hosts that serve open-model catalogues count: DeepInfra and
 * Replicate are deliberately excluded because they also proxy proprietary models (Claude, Gemini, GPT-4o…).
 * A model is flagged open-weight only when at least OPEN_HOST_MIN of these hosts list it (see litellm.ts).
 * This is an inference, not a licence check; it is documented in the README and shown as "(inferred)" in the UI.
 */
export const OPEN_WEIGHT_HOSTS = new Set([
  "fireworks-ai", "together-ai", "novita-ai", "nebius", "baseten", "groq", "cerebras",
  "sambanova", "hyperbolic", "lambda", "nvidia-nim", "cloudflare-workers-ai",
]);
export const OPEN_HOST_MIN = 2;
/** Labs whose flagship models are closed-weight: only these model families may be open. */
export const CLOSED_LABS: Record<string, RegExp> = { openai: /^gpt-oss/, anthropic: /^$/ };
