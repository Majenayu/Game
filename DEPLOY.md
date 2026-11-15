# Deploying the game server

The server is a Colyseus Node app (`server/`). The client is a static zip uploaded to CrazyGames.
The client must talk to the server over `wss://`, so the host must provide TLS (Fly.io and Railway do).

## Fly.io (regions iad, fra, sin)

```bash
fly auth login
# run from the repository root (fly.toml and server/Dockerfile live there)
fly launch --no-deploy --copy-config --name orb-arena --region iad   # accept fly.toml, skip databases

fly deploy --region iad
fly scale count 1 --region iad

# second and third region
fly regions add fra sin
fly scale count 3 --region iad,fra,sin      # one machine per region

fly status
curl https://orb-arena.fly.dev/health
```

Every region is served by the same hostname `orb-arena.fly.dev`, and Fly routes a player to the nearest
machine. Rooms are per machine (Colyseus keeps rooms in process memory), so the client's latency
pick is only needed if you deploy one app per region. Two options:

1. Single app, multi region (above). Use `VITE_SERVER_URLS=wss://orb-arena.fly.dev`. Simple.
2. One app per region, for explicit client side picking:
   ```bash
   fly deploy --app orb-arena-iad --region iad
   fly deploy --app orb-arena-fra --region fra
   fly deploy --app orb-arena-sin --region sin
   ```
   Then build the client with
   `VITE_SERVER_URLS=wss://orb-arena-iad.fly.dev,wss://orb-arena-fra.fly.dev,wss://orb-arena-sin.fly.dev`.
   The client pings `/ping` on each and joins the fastest. Invite links store the server index, so
   keep the list order stable between releases.

## Railway (alternative)

`railway.json` points at `server/Dockerfile`. Create a service from the repo, set the root directory to the
repository root, and enable a public domain. Health check path is `/health`.

## Build the client against production servers

```bash
# PowerShell
$env:VITE_SERVER_URLS="wss://orb-arena-iad.fly.dev,wss://orb-arena-fra.fly.dev,wss://orb-arena-sin.fly.dev"
npm run build:zip
```

Upload `dist/orb-arena.zip` in the CrazyGames developer portal.

## Environment variables (server)

| Name              | Default | Meaning                                 |
| ----------------- | ------- | --------------------------------------- |
| `PORT`            | 2567    | Listen port                             |
| `MAX_CONN_PER_IP` | 16      | Simultaneous connections allowed per IP |

## Local Docker check

```bash
docker build -f server/Dockerfile -t orb-arena-server .
docker run --rm -p 2567:2567 orb-arena-server
curl http://localhost:2567/health
```

Rooms live in memory. A deploy or restart drops running matches; clients show "Connection lost" and can rejoin.
