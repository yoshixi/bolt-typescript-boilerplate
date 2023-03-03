import { App, Receiver, ReceiverEvent, NextFn } from '@slack/bolt';
import request from 'supertest';
import sinon from 'sinon';

import { isGenericMessageEvent } from './utils/helper';
import './utils/env';
import { LogLevel } from '@slack/logger';

interface SlackEvent {
  type: string;
  [key: string]: any;
}

const createEvent = (eventType: string, eventData: Record<string, any>): SlackEvent => {
  return {
    type: eventType,
    ...eventData,
  };
};

// Fakes
class FakeReceiver implements Receiver {
  private bolt: App | undefined;

  public init = (bolt: App) => {
    this.bolt = bolt;
  };

  public start = sinon.fake(
    (...params: any[]): Promise<unknown> => {
      return Promise.resolve([...params]);
    },
  );

  public stop = sinon.fake(
    (...params: any[]): Promise<unknown> => {
      return Promise.resolve([...params]);
    },
  );

  public async sendEvent(event: ReceiverEvent): Promise<void> {
    return this.bolt?.processEvent(event);
  }
}


describe('Slack bot', () => {
  let app: App;
  // let dummyAuthorizationResult = { botToken: '', botId: '' };
  // let fakeErrorHandler: SinonSpy;
  // fakeErrorHandler = sinon.fake();
  const noopAuthorize = () => Promise.resolve({});
  const noopMiddleware = async ({ next }: { next: NextFn }) => {
    await next();
  };
  const fakeMiddleware = sinon.fake(noopMiddleware);

  beforeAll(async () => {
    // app = new App({
    //   receiver: new FakeReceiver(),
    //   logLevel: LogLevel.ERROR,
    //   authorize: sinon.fake.resolves(dummyAuthorizationResult),
    // });
    const fakeReceiver =  new FakeReceiver()

    app = new App({ receiver: fakeReceiver, authorize: noopAuthorize, logLevel: LogLevel.ERROR });
    app.use(fakeMiddleware);


    app.message('hello', async ({ message, say }) => {
      if (!isGenericMessageEvent(message)) return;

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
      await ack();
      await say(`<@${body.user.id}> clicked the button`);
    });
  });

  it('responds to a message with a button', async () => {
    const payload = createEvent('message', {
      text: 'hello',
      user: 'U123456',
    });

    const response = await request(app).post('/slack/events').send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
    });
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toHaveProperty('blocks');
    expect(response.body.message.blocks[0].accessory).toHaveProperty(
      'type',
      'button'
    );
    expect(response.body.message.blocks[0].accessory.text).toHaveProperty(
      'text',
      'Click Me'
    );
  });

  it('responds to a button click', async () => {
    const payload = createEvent('action', {
      actions: [
        {
          action_id: 'button_click',
          type: 'button',
          value: 'click',
        },
      ],
      user: {
        id: 'U123456',
        username: 'test_user',
      },
    });

    const response = await request(app).post('/slack/events').send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
    });
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toHaveProperty(
      'text',
      '<@U123456> clicked the button'
    );
  });
});