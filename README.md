##  Getting Started

This is a project, which is used to help in managing linkedin posts.
Tell what is the post is about, then generate a draft in seconds, then directly post it to LinkedIn.

##  Tech stack
**Frontend** (Current version)

- Next.js (App Router)
- Tailwind CSS
- TypeScript

**Backend** (Current version)

- Groq API
- gpt-oss-20b (AI model via Groq)

And Next.js route.ts handles the backend for now

##  How to run
1. Create a `.env` file. Inside it, put `GROQ_API_KEY=your_key`. (You can get a free API key from https://groq.com/)

2. Open the terminal. Navigate to the project directory.

3. Run the command: `npm run dev`

4. After running the command, the terminal points the URL, which is `http://localhost:3000`. `Ctrl+click` to access it on the browser.

*Note: It will show two errors for now, as one of them is problem reading M_ID and other is a mismatch in client and html properties. Ignore them for now*

![Screenshot](/public/screenshot_demo.png)

5. Then enter a post you want to post, or paste any LinkedIn post URL / Activity ID to grab and remix an existing post, then it will generate a draft.

## Future Scope

1. To be able to log into your LinkedIn via linkedin OAuth. - **COMPLETED ON SEPT 11, 2026**

2. To be able to grab the posts from the LinkedIn url/id, like any other social media. - **COMPLETED ON SEPT 11, 2026**

3. To be able to Attach files to post in the linked in post. Like, video, images, etc. - **COMPLETED ON OCT 9, 2026**

4. Create a Actual Humanizer logic for the posts to not get flagged as AI. *Note: Do not completely rely on Generated AI content, please double check while posting anything Generated Content* - **COMPLETED ON OCT 24, 2026**

5. Add three different variants of the humanizer - **COMPLETED ON OCT 24, 2026**

6. Directly post and tracking Analytics from the tool. - **PARTIAL (Oct 24, 2026): posting + local post history; like/comment stats depend on LinkedIn granting API access**

7. Add schedule timer to post (Optional not confirmed)

8. Create a rate limiting because the API key is on free tier or maybe paid tier, managing it with rate limiting as per the user's wish. - **COMPLETED ON OCT 24, 2026**

9. Creating an actual release `exe` version of this application to natively run in the desktop instead of running the terminal commands for non tech people. - **STARTED (Oct 24, 2026): Windows installer builds with `npm run desktop`; see Desktop app below**


## Work Done

1. Successfully implemented LinkedIn OAuth login — **COMPLETED ON SEPT 11, 2026**

2. Successfully implemented LinkedIn post grabber by URL or ID with auto-parsing, OpenGraph/oEmbed extraction, preview, and AI remixing — **COMPLETED ON SEPT 11, 2026**

3. Successfully implemented direct posting to LinkedIn with attachments (up to 9 images or 1 video) via a "Post to LinkedIn" button — **COMPLETED ON OCT 9, 2026**

*Note: Posting needs the "Share on LinkedIn" product (`w_member_social`) enabled on your LinkedIn app. Log in again after updating so the session carries the access token.*

## Desktop app (Windows)

**[Download the latest installer](https://github.com/g-s-jithesh/manage-linkedin/releases/latest)** (`Manage-LinkedIn-Setup-0.1.0.exe`). Windows SmartScreen may warn because it's unsigned: More info > Run anyway.

To build it yourself: `npm run desktop` builds `dist/Manage LinkedIn Setup 0.1.0.exe` (Electron wrapping the Next.js standalone server). On first launch it creates `%APPDATA%\manage-linkedin\.env` and opens it: fill in `GROQ_API_KEY` and the `LINKEDIN_*` values, then restart. Port 3000 must be free (it matches the LinkedIn redirect URI). Unsigned, with a placeholder icon.
