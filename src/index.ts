import { Hono } from 'hono'
import MachineAPI from './fly'

const app = new Hono()

app.get('/', async(c) => {
  console.log('Requesting machine...')
  const startTime = Date.now()
  const api = new MachineAPI();
  await api.createApp();
  const result = await api.launchMachine();
  console.log(`Machine ${result.id} launched!`);
  const ip = await api.allocateIpAddress();
  console.log(`IP address ${ip.data.allocateIpAddress.app.sharedIpAddress} allocated!`);
  console.log(`Waiting for machine ${result.id} to start...`);
  const started = await api.waitForMachine();
  console.log(`Machine ${result.id} started!`);
  console.log(`https://${api.name}.fly.dev/`);
  const endTime = Date.now()
  console.log(`Total time: ${endTime - startTime}ms`)
  return c.json(result)
})

export default app
