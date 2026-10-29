# LiquidDrop

LiquidDrop is a browser-based file manager built with HTML, CSS, JavaScript modules, and Supabase. It is designed for signed-in users to upload files and view their saved files again later.

## Features

- Sign up and log in with Supabase Auth
- Drag-and-drop file upload
- Store file objects in Supabase Storage
- Save file metadata in the database
- View a user's files after refreshing the page
- Responsive interface with a blue/purple visual theme

## Technology

- HTML5
- CSS3
- Vanilla JavaScript (ES modules)
- Supabase Auth
- Supabase Database
- Supabase Storage
- Vercel deployment

## Live demo

https://liquiddrop.vercel.app/

## Run locally

1. Clone this repository: https://github.com/Hafiz-arman-sheikh/LiquidDrop
2. Open the project folder in your editor.
3. Review `supabase-config.js` and configure your own Supabase project URL and publishable/anon key.
4. Run the site through a local development server so JavaScript modules work correctly.
5. Configure the required database table, Storage bucket, and Row Level Security policies in Supabase before uploading files.

## Security

Use a publishable/anon key only in browser code. Never expose a Supabase service-role key. Configure Storage and database policies so each signed-in user can access only their own files. Test the policies with separate user accounts before storing private data.

## Developer

[Hafiz Arman Sheikh](https://github.com/Hafiz-arman-sheikh)
