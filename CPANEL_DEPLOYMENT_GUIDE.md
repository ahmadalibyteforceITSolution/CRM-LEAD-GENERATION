# Complete cPanel & Vercel Deployment Guide

This guide explains step-by-step how to deploy the CRM (Frontend + Backend + MongoDB Database) on **cPanel** (`https://crm.spacezandplaces.com/`) and on **Vercel**.

---

## ⚠️ STEP 1 (CRITICAL): Whitelist IP in MongoDB Atlas

> **IMPORTANT**: Both Vercel and cPanel will be blocked by MongoDB Atlas with `"Database connection unavailable"` if this step is skipped!

1. Log into your **[MongoDB Atlas Dashboard](https://cloud.mongodb.com/)**.
2. In the left-hand navigation, click **Network Access** (under the **Security** section).
3. Click the green **"+ ADD IP ADDRESS"** button.
4. Click **"ALLOW ACCESS FROM ANYWHERE"** (this automatically sets the IP to `0.0.0.0/0`).
5. Click **Confirm**.
6. Wait ~1 minute until the status shows **Active**.

---

## STEP 2: Configure Subdomain in cPanel (`crm.spacezandplaces.com`)

1. Log into your **cPanel**.
2. In the **Domains** section, click **Domains** (or **Subdomains**).
3. Click **Create A New Domain**:
   - **Domain**: `crm.spacezandplaces.com`
   - **Document Root**: `crm.spacezandplaces.com`
4. Click **Submit**.
5. In cPanel **Zone Editor**, ensure there is an **A record** for `crm.spacezandplaces.com` pointing to your server IP `162.0.229.63`.

---

## STEP 3: Setup Node.js App in cPanel

1. In cPanel, find and click **Setup Node.js App** (under Software).
2. Click the blue **Create Application** button.
3. Configure the following fields:
   - **Node.js version**: Select `20.x` (or `18.x`)
   - **Application mode**: `Production`
   - **Application root**: `crm.spacezandplaces.com`
   - **Application URL**: `crm.spacezandplaces.com`
   - **Application startup file**: `server.js`
4. Under **Environment Variables**, click **Add Variable**:
   - **Name**: `MONGODB_URI`
   - **Value**: `mongodb://ahmedalihafeez25_db_user:%40Sublime12345@ac-b095rvn-shard-00-00.oe0inne.mongodb.net:27017,ac-b095rvn-shard-00-01.oe0inne.mongodb.net:27017,ac-b095rvn-shard-00-02.oe0inne.mongodb.net:27017/crm?ssl=true&replicaSet=atlas-arfzx2-shard-0&authSource=admin&retryWrites=true&w=majority`
   - Click **Done**.
5. Click **Create** at the top right.

---

## STEP 4: Upload Application Files

You can upload using either of these two methods:

### Method A: Upload ZIP (Fastest & Easiest)
1. In cPanel, open **File Manager** and navigate into the `crm.spacezandplaces.com` folder.
2. Click **Upload** and upload `cpanel-deploy.zip` (located in your CRM project folder).
3. Right-click `cpanel-deploy.zip` in File Manager and click **Extract**.
4. Make sure `.env`, `server.js`, `package.json`, `dist/`, and `api/` are extracted directly in the root of that folder.

### Method B: Git Version Control
1. In cPanel, open **Git Version Control**.
2. Click **Create**.
3. Clone URL: `https://github.com/ahmadalibyteforceITSolution/CRM-LEAD-GENERATION.git`
4. Repository Path: `crm.spacezandplaces.com`
5. Click **Create**.

---

## STEP 5: Install Dependencies & Start

1. Go back to **Setup Node.js App** in cPanel.
2. Click the edit (pencil) icon next to `crm.spacezandplaces.com`.
3. Click the **Run NPM Install** button.
4. Click **Restart Application**.

Visit `https://crm.spacezandplaces.com/` - Your full CRM is live with immediate MongoDB Atlas persistence!
