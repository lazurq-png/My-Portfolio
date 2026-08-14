# ADR-001: Use Cloudflare to host portfolio.

## Context

For the portfolio to be reachable by other people on the internet, we need to connect a domain name to it.
By for example deploying it to a website that focuses on providing a hosting service.

## Decision

Barry decided we use cloudflare as a hosting service over git/others for various reasons:

## Alternatives

Vercel

## Pros/Cons

1. Security is built into cloudflares domains.
2. Since they are basically copying our repo on-to their website, there is almost 0 chance that we have any fallback.
3. It is also free.
