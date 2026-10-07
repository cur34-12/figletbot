# FigletBot

FigletBot is a small Discord bot that lets members of a server change another member's server nickname with a slash command.

Example:

```text
/nickname user:@someone name:Whatever
```

The bot uses Discord's normal bot API and the `Manage Nicknames` permission.

Discord does not allow a bot to directly rename the server owner. The included `ownerRename.js` helper can instead DM the owner the requested nickname so they can apply it themselves with Discord's built in `/nick` command.

## Requirements

- A Discord bot application
- Node.js and npm
- curl
- tar
- Linux with systemd if you want to run it as a service

## Discord setup

Create a bot in the Discord Developer Portal and invite it with these scopes:

- `bot`
- `applications.commands`

Give the bot these permissions:

- View Channels
- Send Messages
- Manage Nicknames

Put the FigletBot role above every member role that it needs to rename.

The server owner cannot be renamed directly by a bot regardless of the bot's role position.

## Install

Download the latest version from the public repository:

```bash
mkdir -p ~/figletbot

curl -fsSL https://github.com/cur34-12/figletbot/archive/refs/heads/main.tar.gz \
  | tar -xz --strip-components=1 -C ~/figletbot

cd ~/figletbot
npm install --omit=dev
```

Create the environment file:

```bash
nano ~/figletbot/.env
```

Add:

```text
DISCORD_TOKEN=YOUR_BOT_TOKEN_HERE
```

Then lock it down:

```bash
chmod 600 ~/figletbot/.env
```

Do not commit the `.env` file.

Test the bot manually:

```bash
cd ~/figletbot
node index.js
```

## systemd service

Find the exact Node.js path first:

```bash
which node
```

If Node was installed with NVM, use the full path returned by that command.

Example:

```ini
[Unit]
Description=FigletBot Discord Bot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/figletbot
ExecStart=/home/ubuntu/.nvm/versions/node/v25.6.1/bin/node /home/ubuntu/figletbot/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Save that as:

```text
/etc/systemd/system/figletbot.service
```

Then run:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now figletbot
sudo systemctl status figletbot --no-pager
```

## Updating

The repository includes `update.sh`.

It downloads the latest `main` branch directly from GitHub over HTTPS, copies the current repository files into the FigletBot directory, installs dependencies, restarts the service, then shows its status.

Your local `.env` file is not in the repository and is left in place.

Make the updater executable once:

```bash
chmod +x ~/figletbot/update.sh
```

Then update FigletBot at any time with:

```bash
~/figletbot/update.sh
```

You can also run it directly through Bash:

```bash
bash ~/figletbot/update.sh
```

By default the updater expects:

```text
Application directory: ~/figletbot
systemd service:       figletbot
```

Both can be overridden:

```bash
FIGLETBOT_DIR=/opt/figletbot FIGLETBOT_SERVICE=figletbot bash update.sh
```

## Service commands

Status:

```bash
sudo systemctl status figletbot --no-pager
```

Follow logs:

```bash
sudo journalctl -u figletbot -f
```

Restart:

```bash
sudo systemctl restart figletbot
```

## Repository files

- `index.js` contains the bot and `/nickname` command.
- `ownerRename.js` contains the server owner fallback handling.
- `update.sh` downloads and deploys the latest public repository version.
- `package.json` defines the Node.js dependencies.
- `.env` contains the local Discord bot token and must not be committed.
