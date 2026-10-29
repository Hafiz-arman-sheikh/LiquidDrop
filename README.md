# LiquidDrop

A simple file manager project built with HTML, CSS and JavaScript. The app uses Supabase Authentication and Storage for user accounts and file uploads.

## Features
- Sign up and log in
- Drag-and-drop file upload
- Store files in Supabase Storage
- Keep file records linked to the signed-in user
- Responsive interface

## Technologies
HTML, CSS, JavaScript (ES modules), Supabase Auth, Supabase Storage, PostgreSQL.

## Setup
1. Create a Supabase project.
2. Run the SQL in `setup.sql`.
3. Add the project URL and publishable/anon key to `supabase-config.js`.
4. Serve the files with a local development server; ES modules may not work when opening `index.html` directly.

Never put a Supabase service-role key in browser code.

## Live demo
https://liquiddrop.vercel.app/
