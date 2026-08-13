# AI Providers

Connect your preferred AI services to ModernNovel and choose the default model used by the writing assistant.

## Overview

ModernNovel's AI Providers system allows you to:

- **Connect multiple AI services** - Use OpenRouter, Kimi, DeepSeek, Qwen, MiniMax, OpenAI, Anthropic, Gemini, and more
- **Secure credential management** - API keys are encrypted and safely stored
- **One-click OAuth connections** - Connect OpenRouter with PKCE
- **Web-based configuration** - Set model IDs and compatible API endpoints without editing environment files

## Getting Started

### Connecting Your First Provider

1. **Navigate to Settings** → **AI Providers**
2. **Choose a Provider** from the available options
3. Enter the recommended model or another model ID supported by your account
4. **Connect via OAuth** for OpenRouter or **enter an API key manually**

### OpenRouter (Recommended)

OpenRouter provides access to 200+ AI models from various providers through a single API. It's perfect for:

- **Cost optimization** - Compare prices across providers
- **Model variety** - Access models from OpenAI, Anthropic, Meta, and more
- **Fallback support** - Automatic failover if your primary model is unavailable

#### Connecting OpenRouter

1. Click **"Connect OpenRouter"** in the AI Providers section
2. You'll be redirected to OpenRouter's secure login page
3. **Authorize ModernNovel** to access your account
4. **Return to ModernNovel** - your connection is now active!

The OAuth connection is secured using PKCE (Proof Key for Code Exchange), ensuring your credentials are never exposed.

## Managing Providers

### Provider Settings

When connecting a provider, configure its API key, default model, and (for OpenAI-compatible providers) API base URL. To replace a saved configuration, disconnect it and reconnect it with the new values.

### Security Features

- **Encrypted Storage** - API keys are encrypted at rest
- **User-scoped Access** - Keys are only accessible by you
- **Secure Deletion** - Keys are permanently removed when disconnected
- **Session Management** - OAuth tokens are refreshed automatically

## Provider Comparison

| Provider | Default model | Default endpoint |
| --- | --- | --- |
| OpenRouter | `openrouter/auto` | Managed by OpenRouter |
| Kimi | `kimi-k3` | `https://api.moonshot.cn/v1` |
| DeepSeek | `deepseek-v4-pro` | `https://api.deepseek.com` |
| Qwen | `qwen3.8-max` | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| MiniMax | `MiniMax-M3` | `https://api.minimaxi.com/v1` |
| OpenAI | `gpt-5.6` | `https://api.openai.com/v1` |
| Anthropic | `claude-sonnet-5` | Native Anthropic Messages API |
| Gemini | `gemini-3.6-flash` | Google OpenAI-compatible endpoint |
| Ollama | `qwen3` | `http://localhost:11434` |

## AI Model Selection

The connection dialog suggests current model IDs but also accepts custom IDs supported by your provider account. A model explicitly supplied by an AI request overrides the saved default model.

For Kimi and MiniMax, mainland China and international API keys normally use different endpoints and are not interchangeable. Qwen enterprise or regional accounts may require a dedicated Workspace endpoint. ModernNovel accepts either a base URL or a complete `/chat/completions` URL.

### Choosing the Right Model

Consider these factors when selecting models:

- **Task Type** - Creative writing, analysis, code generation
- **Context Length** - How much text you need to process
- **Speed vs Quality** - Fast responses vs highest quality
- **Cost** - Balance performance with budget
- **Privacy** - Some models offer enhanced privacy features

## Usage Scenarios

### Creative Writing

Start with OpenRouter's automatic routing, a provider's current general-purpose model, or a locally installed Qwen model through Ollama. Compare output quality and cost using your own manuscript samples before committing to one model.

### Privacy-Focused Writing

**Recommended Setup:**
- **Primary**: Ollama with local models
- **Cloud Fallback**: OpenRouter with privacy-focused models
- **Backup**: Anthropic Claude (enhanced privacy)

## Troubleshooting

### Common Issues

#### Connection Failed
- **Check API Key** - Ensure your key is valid and active
- **Network Issues** - Verify internet connection
- **Service Status** - Check provider's status page

#### Usage Limits Exceeded
- **Check Quotas** - Review your provider's usage limits
- **Upgrade Plan** - Consider upgrading your provider account
- **Switch Providers** - Use alternative providers temporarily

#### Model Not Available
- **Provider Status** - Model may be temporarily unavailable
- **Model Deprecation** - Provider may have retired the model
- **Access Permissions** - Some models require special access

### Getting Help

If you encounter issues:

1. **Check Provider Documentation** - Each provider has specific requirements
2. **Review Error Messages** - OpenWrite provides detailed error information
3. **Contact Support** - Reach out through our support channels
4. **Community Forum** - Ask questions in our community discussions

## Best Practices

### Security

- **Rotate API Keys** regularly for manually-entered keys
- **Use OAuth** when available for enhanced security
- **Monitor Usage** to detect unauthorized access
- **Revoke Access** if you suspect compromise

### Cost Management

- **Set Usage Limits** to prevent unexpected charges
- **Compare Prices** across providers for cost optimization
- **Monitor Trends** to predict monthly costs
- **Use Cheaper Models** for less critical tasks

### Performance

- **Test Different Models** to find the best fit for your use case
- **Configure Fallbacks** to ensure uninterrupted service
- **Cache Responses** when appropriate to reduce API calls
- **Batch Requests** when possible to improve efficiency

## Future Features

We're continuously improving the AI Providers system:

### Coming Soon

- **Cost Analytics** - Detailed spending reports and predictions
- **Model Recommendations** - AI-powered model selection
- **Team Sharing** - Share provider access within organizations
- **Custom Endpoints** - Connect to self-hosted AI models
- **Usage Alerts** - Notifications when approaching limits

### Requested Features

- **Automatic Failover** - Seamless switching when providers are down
- **Response Caching** - Reduce costs by caching similar requests
- **A/B Testing** - Compare outputs from different models
- **Bulk Operations** - Manage multiple providers simultaneously

---

*AI Providers make it easy to harness the power of multiple AI services while keeping your credentials secure and usage under control.*