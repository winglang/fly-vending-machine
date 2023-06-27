class MachineAPI {
  private static FLY_API_TOKEN = "<your-token-here>";
  private static FLY_API_HOSTNAME = "https://api.machines.dev";
  private static HEADERS = {
    "Authorization": `Bearer ${this.FLY_API_TOKEN}`,
    "Content-Type": "application/json"
  };
  private namespace = 'wing-playground';
  public name: string;
  private machineName: string;
  private machineId?: string;
  private instanceId?: string;

  private buildName(name: string): string {
    return `${this.namespace}-${name}`
  }

  constructor() {
    this.name = this.buildName(Math.random().toString(36).substring(7));
    this.machineName = `${this.name}-machine`;
  }

  public async createApp(): Promise<void> {
    const appConfig = {
      app_name: this.name,
      org_slug: "personal",
      network: `${this.name}-network`
    };

    const response = await fetch(`${MachineAPI.FLY_API_HOSTNAME}/v1/apps`, {
      method: "POST",
      headers: MachineAPI.HEADERS,
      body: JSON.stringify(appConfig)
    });

    // check for errors
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  public async launchMachine(): Promise<any> {
    const machineConfig = {
      name: this.machineName,
      config: {
        image: "flyio/fastify-functions",
        env: {
          APP_ENV: "production"
        },
        services: [
          {
            ports: [
              {
                port: 443,
                handlers: ["tls", "http"]
              },
              {
                port: 80,
                handlers: ["http"]
              }
            ],
            protocol: "tcp",
            internal_port: 8080
          }
        ],
        checks: {
          httpget: {
            type: "http",
            port: 8080,
            method: "GET",
            path: "/",
            interval: "15s",
            timeout: "10s"
          }
        }
      }
    };

    const response = await fetch(`${MachineAPI.FLY_API_HOSTNAME}/v1/apps/${this.name}/machines`, {
      method: "POST",
      headers: MachineAPI.HEADERS,
      body: JSON.stringify(machineConfig)
    });

    const data = await response.json() as any;

    this.instanceId = data.instance_id;
    this.machineId = data.id;
    return data;
  }

 public async allocateIpAddress(
  ): Promise<any> {
    const AllocateIpAddress = `
      mutation AllocateIpAddress($input: AllocateIPAddressInput!) {
        allocateIpAddress(input: $input) {
          app {
            sharedIpAddress
          }
        }
      }
    `;

    const variables = {
      input: {
        appId: this.name,
        type: 'shared_v4',
        region: '',
      },
    };

    const response = await fetch('https://api.fly.io/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MachineAPI.FLY_API_TOKEN}`, // Adjust this if you're using a different way to authenticate
      },
      body: JSON.stringify({
        query: AllocateIpAddress,
        variables,
      }),
    });

    // check for HTTP errors
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse the response as JSON
    const data = await response.json();
    return data;
  }

  public async waitForMachine(state = 'started', timeout = 60): Promise<any> {
    const url = `${MachineAPI.FLY_API_HOSTNAME}/v1/apps/${this.name}/machines/${this.machineId}/wait?instance_id=${this.instanceId}&state=${state}&timeout=${timeout}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: MachineAPI.HEADERS,
    });

    // check for HTTP errors
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse the response as JSON
    const data = await response.json();
    return data;
  }
}

export default MachineAPI;
