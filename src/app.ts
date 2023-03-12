/* eslint-disable no-console */
/* eslint-disable import/no-internal-modules */
import './utils/env';
import { App, LogLevel, ExpressReceiver } from '@slack/bolt';
import { isGenericMessageEvent } from './utils/helper';

const receiver = new ExpressReceiver({ signingSecret: process.env['SLACK_SIGNING_SECRET'] as string });

// @ts-ignore
const app = new App({
  token: process.env['SLACK_BOT_TOKEN'],
  signingSecret: process.env['SLACK_SIGNING_SECRET'],
  receiver,
  logLevel: LogLevel.DEBUG,
});

app.use(async ({ next }) => {
  await next!();
});

receiver.router.get('/ping', (_req, res) => {
  // You're working with an express req and res now.
  res.send('yay!');
});

receiver.router.get('/', (_req, res) => {
  // You're working with an express req and res now.
  res.send('yay!');
});

// Listens to incoming messages that contain "hello"
app.message('hello', async ({ message, say }) => {
  if (!isGenericMessageEvent(message)) return;

  // say() sends a message to the channel where the event was triggered
  await say({
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Hey there <@${message.user}>!`,
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Click Me',
          },
          action_id: 'button_click',
        },
      },
    ],
    text: `Hey there <@${message.type}>!`,
  });
});

app.action('button_click', async ({ body, ack, say }) => {
  // Acknowledge the action
  await ack();
  await say(`<@${body.user.id}> clicked the button`);
});

(async () => {
  // Start your app
  const port = Number(process.env['PORT']) || 8080
  await app.start(port);

  console.log(`⚡️ Bolt app is running on port ${port}!`);
})();
