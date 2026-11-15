# PyCalc Studio — Python + HTML/Tailwind/JS Calculator

A full-stack precision calculator with a safe Python AST math engine and responsive Tailwind CSS interface.

## Run Through Compillo Terminal
1. Click **Terminal** in the bottom panel.
2. Start the Python server in the background on port `5050`:
   ```bash
   python3 server.py &
   ```
   *(Optional custom port: `python3 server.py 8080 &`)*
3. Open it inside Compillo Live Preview:
   ```bash
   ports open 5050
   ```

## API Endpoints
- `GET /api/health` — Server status, port, and Python version
- `POST /api/calculate` — Safely evaluate `{ expression, angleMode }` using Python's AST
- `GET /api/history` — Fetch calculation tape stored on the Python server
- `DELETE /api/history` — Clear calculation tape
