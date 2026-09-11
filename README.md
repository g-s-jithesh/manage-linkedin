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

5. Then enter a post you want to post, then it will generate a draft.

## Future Scope

1. To be able to log into your LinkedIn via linkedin OAuth. - **COMPLETED ON SEPT 11, 2026**

2. To be able to grab the posts from the LinkedIn url/id, like any other social media.

3. To be able to Attach files to post in the linked in post. Like, video, images, etc.

4. Create a Actual Humanizer logic for the posts to not get flagged as AI. *Note: Do not completely rely on Generated AI content, please double check while posting anything Generated Content*

5. Add three different variants of the humanizer

6. Directly post and tracking Analytics from the tool.

7. Add schedule timer to post (Optional not confirmed)

8. Create a rate limiting because the API key is on free tier or maybe paid tier, managing it with rate limiting as per the user's wish.

9. Creating an actual release `exe` version of this application to natively run in the desktop instead of running the terminal commands for non tech people.


## Work Done

1. Successfully implemented LinkedIn OAuth login — **COMPLETED ON SEPT 11, 2026**



