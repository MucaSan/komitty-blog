# Deployment

Config used to host the Komitty blog on a VPS (Arch Linux + systemd + nginx + Docker).

## Layout

```
deploy/
├── nginx/komitty.conf                 # reverse proxy: / → frontend, /v1/ → backend
└── systemd/
    ├── komitty-backend.service        # Go gRPC + grpc-gateway on :8080
    └── komitty-frontend.service       # Next.js `next start` on :3000
```

## One-time server setup

```bash
# packages
pacman -Syu --noconfirm
pacman -S --noconfirm openssh git docker docker-compose nginx certbot certbot-nginx go nodejs npm
systemctl enable --now sshd docker
```

Then copy the app to `/opt/komitty-blog`, run the database (Docker Compose) and
Atlas migrations, build the backend/frontend, and install the systemd units:

```bash
sudo cp deploy/systemd/*.service /etc/systemd/system/
sudo mkdir -p /etc/nginx/conf.d
sudo cp deploy/nginx/komitty.conf /etc/nginx/conf.d/
sudo systemctl daemon-reload
sudo systemctl enable --now komitty-backend komitty-frontend nginx
```

## HTTPS

Once DNS points `komitty.com` at the server:

```bash
sudo certbot --nginx -d komitty.com -d www.komitty.com
```
