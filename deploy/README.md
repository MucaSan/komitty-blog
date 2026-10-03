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

## Frontend deploys (keep the previous chunks)

`next build` rewrites the content-hashed files under `frontend/.next/static` and
removes everything it no longer references. A browser that is still on the
previous build — an open tab, a document served while the build was running, an
in-flight prefetch — then asks for chunk files that no longer exist, and Next
gives up with:

```
Application error: a client-side exception has occurred while loading blog.komitty.com
(see the browser console for more information)
```

`frontend/app/error.tsx` / `frontend/app/global-error.tsx` detect that failure
and reload the page so it picks up the new build, while the steps below keep the
previous generation available so most readers never see it at all:

```bash
# on the server, in /opt/komitty-blog/frontend
cp -r .next/static .next-static.prev       # 1. keep what the running build serves
npm install && npm run build               # 2. build the new version
cp -rn .next-static.prev/. .next/static/   # 3. content-hashed names, so an additive copy is safe
sudo systemctl restart komitty-frontend    # 4. restart right away: the window where the old
                                           #    build serves new chunks is the dangerous one
rm -rf .next-static.prev                   # 5. nothing else needs the copy now
```

Step 1 must run **before** the build (the build is what deletes the old files),
and the restart in step 4 should follow the build as closely as possible. Note
that `next start` builds its list of servable static files when it boots: a
generation copied in *after* a restart is not served (its files are on disk, but
the request still 404s), so do every copy before step 4 — or restart once more
after copying.

