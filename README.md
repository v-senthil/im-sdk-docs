# Zoho IM SDK Documentation

This is the official documentation for the Zoho Instant Messaging (IM) SDK, built with [Docusaurus 3](https://docusaurus.io/).

## Prerequisites

- Node.js 20 or higher
- npm or yarn

## Installation

```bash
npm install
```

## Local Development

```bash
npm run serve
```

This command starts a local development server. Most changes are reflected live without having to restart the server.

## Build

```bash
npm run build
```

This command generates static content into the `build` directory and can be served using any static hosting service.

## Project Structure

```
im-sdk-docs/
├── docs/                    # Documentation markdown/MDX files
│   ├── onboarding-into-zoho-im/
│   ├── getting-started/
│   ├── authentication/
│   ├── real-time-notifications/
│   ├── channels/
│   ├── sessions/
│   ├── messages/
│   ├── template-messages/
│   ├── layout-messages/
│   ├── broadcasts/
│   └── ... (and more)
├── src/
│   ├── components/          # React components
│   ├── css/                 # Custom CSS
│   └── pages/               # Custom pages
├── static/
│   └── img/                 # Static images
├── docusaurus.config.ts     # Site configuration
└── sidebars.ts              # Sidebar configuration
```

## Documentation Categories

The documentation is organized into the following categories:

1. **Onboarding into Zoho IM** - Getting started with the platform
2. **Getting Started** - Quick start guides
3. **Authentication** - OAuth and API authentication
4. **Real-Time Notifications** - Webhooks and events
5. **EFC** - Embedded functionality
6. **Organizations** - Managing IM organizations
7. **Integration Services** - Platform integrations
8. **Channels** - Messaging channels (WhatsApp, Telegram, etc.)
9. **Sessions** - Chat sessions management
10. **Messages** - Sending and receiving messages
11. **Layout Messages** - Rich message layouts
12. **Template Messages** - Pre-approved message templates
13. **Bots** - Bot integrations
14. **Subscriptions** - Webhook subscriptions
15. **Metrics** - Usage analytics
16. **Broadcasts** - Bulk messaging
17. **WhatsApp Custom APIs** - WhatsApp-specific APIs
18. **Telegram Integration** - Telegram-specific APIs
19. **LINE Custom APIs** - LINE-specific APIs
20. **WhatsApp Integration SDK** - WhatsApp SDK
21. **IM Mobile SDK** - Mobile SDK integration
22. **Guided Conversation** - Conversation flows
23. **Calls** - Voice/Video calls
24. **WeCom Integration** - WeChat Work integration

## Converting Documentation

If you need to regenerate the documentation from the source HTML files:

```bash
npm run convert
```

This requires the source HTML files to be present in `../extracted/sdk-reference/`.

## Deployment

Build the project and deploy the `build` folder to any static hosting service like:

- Vercel
- Netlify
- GitHub Pages
- AWS S3

## License

Copyright © Zoho Corporation. All rights reserved.
