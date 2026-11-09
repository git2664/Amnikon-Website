# AMNIKON website frontend

This repository contains the repaired static website and its frontend-only publishing pipeline.
The existing IIS `/api` backend and its SMTP credentials remain on the server.

Push a reviewed change to `main` to validate the frontend and publish a deployment release.
The IIS server checks for successful main releases every two minutes, verifies their
contents and deploys only public frontend files. Failed website checks restore the previous frontend.

See [the deployment guide](deployment/GITHUB-ACTIONS.md) for setup and status checks.
Production: https://amnikontechnologies.com

Do not commit backend settings, SMTP keys, applicant uploads or private queues.
