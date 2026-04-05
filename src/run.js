import Anthropic from '@anthropic-ai/sdk';

const {
  ANTHROPIC_API_KEY,
  TASK_TITLE   = 'hi',
  TASK_MESSAGE = 'hi',
  TASK_MODEL   = 'claude-haiku-4-5-20251001',
  WEBHOOK_URL,
} = process.env;

if (!ANTHROPIC_API_KEY) {
  console.error('❌  ANTHROPIC_API_KEY secret is not set.');
  console.error('    Go to: Settings → Secrets and variables → Actions → New repository secret');
  process.exit(1);
}

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

async function run() {
  const firedAt = new Date().toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    dateStyle: 'full',
    timeStyle: 'long',
  });

  console.log(`\n⏰  Scheduled trigger`);
  console.log(`    Title   : ${TASK_TITLE}`);
  console.log(`    Message : ${TASK_MESSAGE}`);
  console.log(`    Model   : ${TASK_MODEL}`);
  console.log(`    Fired   : ${firedAt}\n`);

  const message = await client.messages.create({
    model: TASK_MODEL,
    max_tokens: 1024,
    system: `You are a helpful assistant. The user has a daily scheduled message titled "${TASK_TITLE}".`,
    messages: [{ role: 'user', content: TASK_MESSAGE }],
  });

  const reply = message.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');

  console.log(`✅  Response from ${TASK_MODEL}:`);
  console.log('─'.repeat(60));
  console.log(reply);
  console.log('─'.repeat(60));
  console.log(`\n    Input tokens  : ${message.usage.input_tokens}`);
  console.log(`    Output tokens : ${message.usage.output_tokens}`);
  console.log(`    Stop reason   : ${message.stop_reason}`);

  // Optional: POST result to a webhook (Slack, Discord, ntfy.sh, etc.)
  if (WEBHOOK_URL) {
    const body = JSON.stringify({
      title: TASK_TITLE,
      message: TASK_MESSAGE,
      reply,
      model: TASK_MODEL,
      firedAt,
    });
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    console.log(`\n📬  Webhook delivered: ${res.status} ${res.statusText}`);
  }
}

run().catch(err => {
  console.error('\n❌  Run failed:', err.message);
  process.exit(1);
});
