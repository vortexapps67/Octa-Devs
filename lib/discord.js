/**
 * Discord Webhook Notification Service
 */

async function sendContactNotification({ name, email, project, metadata = {} }) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('DISCORD_WEBHOOK_URL is not configured');
  }

  // Brand coral color #eb4d6d = 15420781 in decimal
  const BRAND_CORAL = 0xeb4d6d;

  const payload = {
    username: 'Octa Devs Contact Bot',
    avatar_url: 'https://raw.githubusercontent.com/vortexapps67/Octa-Devs/main/octa_favicon.jpg',
    embeds: [
      {
        title: '🚀 New Project Inquiry Received!',
        description: 'A new client has submitted the contact form on **Octa Devs**.',
        color: BRAND_CORAL,
        fields: [
          {
            name: '👤 Client Name',
            value: name || 'Anonymous',
            inline: true
          },
          {
            name: '📧 Email Address',
            value: email ? `[${email}](mailto:${email})` : 'Not provided',
            inline: true
          },
          {
            name: '📋 Project Description / Message',
            value: project && project.trim() ? project : 'No message provided',
            inline: false
          }
        ],
        footer: {
          text: 'Octa Devs Studio · Direct Lead Alert',
          icon_url: 'https://raw.githubusercontent.com/vortexapps67/Octa-Devs/main/octa_favicon.jpg'
        },
        timestamp: new Date().toISOString()
      }
    ]
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Discord Webhook responded with ${response.status}: ${errorText}`);
  }

  return true;
}

module.exports = {
  sendContactNotification
};
