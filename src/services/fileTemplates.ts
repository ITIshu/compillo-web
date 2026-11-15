export interface FileTypePreset {
  id: string;
  name: string;
  extension: string;
  defaultFilename: string;
  language: string;
  description: string;
  category: 'Languages' | 'Web' | 'Data & Docs';
  badgeColor: string;
  getStarterContent: (filename: string) => string;
}

export const FILE_TYPE_PRESETS: FileTypePreset[] = [
  {
    id: 'python',
    name: 'Python',
    extension: 'py',
    defaultFilename: 'main.py',
    language: 'python',
    description: 'Python script, data science, or automation',
    category: 'Languages',
    badgeColor: '#3776AB',
    getStarterContent: (filename: string) => `"""
${filename}
Compillo Studio - Interactive Python Program
"""

def main():
    print("========================================")
    print("   Compillo Interactive Python Runner   ")
    print("========================================")
    
    # Interactive input demonstration
    name = input("Enter your name: ")
    print(f"Hello, {name}! Welcome to Compillo Studio.")
    
    try:
        age_str = input("How old are you? ")
        age = int(age_str)
        print(f"In 5 years, you will be {age + 5} years old!")
    except ValueError:
        print("Invalid age entered, continuing anyway.")
        
    print("\nCalculation demo:")
    squares = [x ** 2 for x in range(1, 6)]
    print(f"Squares from 1 to 5: {squares}")
    print("\nProgram finished successfully.")

if __name__ == "__main__":
    main()
`,
  },
  {
    id: 'cpp',
    name: 'C++',
    extension: 'cpp',
    defaultFilename: 'main.cpp',
    language: 'cpp',
    description: 'Modern C++ source file with standard library',
    category: 'Languages',
    badgeColor: '#00599C',
    getStarterContent: (filename: string) => `// ${filename}
// Compillo Studio - C++ Source
#include <iostream>
#include <vector>
#include <string>

int main() {
    std::cout << "Hello from C++ in Compillo!" << std::endl;
    
    std::vector<std::string> features = {"Performance", "Standard Library", "Modern Syntax"};
    for (const auto& item : features) {
        std::cout << " - " << item << std::endl;
    }
    
    return 0;
}
`,
  },
  {
    id: 'c',
    name: 'C',
    extension: 'c',
    defaultFilename: 'main.c',
    language: 'cpp',
    description: 'Standard C programming source code',
    category: 'Languages',
    badgeColor: '#5C6BC0',
    getStarterContent: (filename: string) => `/*
 * ${filename}
 * Compillo Studio - C Source Code
 */
#include <stdio.h>

int main(void) {
    printf("Hello from C in Compillo!\\n");
    return 0;
}
`,
  },
  {
    id: 'c-graphics',
    name: 'C Graphics (graphics.h / BGI)',
    extension: 'c',
    defaultFilename: 'graphics_program.c',
    language: 'cpp',
    description: 'C graphics program with Borland BGI <graphics.h> for university labs',
    category: 'Languages',
    badgeColor: '#10B981',
    getStarterContent: (filename: string) => `/**
 * ${filename}
 * Compillo Studio - C Graphics Framebuffer Program
 * Powered by built-in <graphics.h> Virtual Machine
 */
#include <graphics.h>
#include <stdio.h>

int main() {
    int gd = DETECT, gm;
    initgraph(&gd, &gm, "${filename}");

    printf("Starting C graphics execution...\\n");

    // Background and frame
    setbkcolor(BLACK);
    setcolor(YELLOW);
    rectangle(50, 40, 590, 380);

    // Orbital concentric circles
    setcolor(CYAN);
    for (int r = 20; r <= 100; r += 20) {
        circle(320, 210, r);
    }

    // Core nucleus
    setcolor(RED);
    circle(320, 210, 10);

    // Decorative diagonals
    setcolor(LIGHTBLUE);
    line(50, 40, 100, 90);
    line(590, 40, 540, 90);
    line(50, 380, 100, 330);
    line(590, 380, 540, 330);

    // Text output
    setcolor(WHITE);
    outtextxy(160, 340, "Compillo Studio - C Graphics Engine");

    closegraph();
    return 0;
}
`,
  },
  {
    id: 'opengl',
    name: 'OpenGL & GLUT (C++)',
    extension: 'cpp',
    defaultFilename: 'opengl_triangle.cpp',
    language: 'cpp',
    description: 'Modern OpenGL and GLUT graphics program with live canvas window',
    category: 'Languages',
    badgeColor: '#8B5CF6',
    getStarterContent: (filename: string) => `/**
 * ${filename}
 * Compillo Studio - OpenGL & GLUT Graphics Program
 */
#include <GL/glut.h>
#include <iostream>

void display() {
    glClear(GL_COLOR_BUFFER_BIT);

    // Draw multi-colored gradient triangle
    glBegin(GL_TRIANGLES);
        glColor3f(1.0f, 0.0f, 0.0f); // Red
        glVertex2f(-0.6f, -0.6f);

        glColor3f(0.0f, 1.0f, 0.0f); // Green
        glVertex2f(0.6f, -0.6f);

        glColor3f(0.0f, 0.0f, 1.0f); // Blue
        glVertex2f(0.0f, 0.6f);
    glEnd();

    glFlush();
}

int main(int argc, char** argv) {
    std::cout << "Initializing OpenGL GLUT Window..." << std::endl;
    glutInit(&argc, argv);
    glutInitWindowSize(600, 450);
    glutCreateWindow("Compillo OpenGL Window");
    glutDisplayFunc(display);
    glutMainLoop();
    return 0;
}
`,
  },
  {
    id: 'java',
    name: 'Java',
    extension: 'java',
    defaultFilename: 'Main.java',
    language: 'java',
    description: 'Java class with main entry point',
    category: 'Languages',
    badgeColor: '#E76F00',
    getStarterContent: (filename: string) => {
      // derive class name from filename without extension
      const baseName = filename.replace(/\.java$/i, '').replace(/[^a-zA-Z0-9_]/g, '') || 'Main';
      const className = baseName.charAt(0).toUpperCase() + baseName.slice(1);
      return `/**
 * ${filename}
 * Compillo Studio - Java Application
 */

public class ${className} {

    public static void main(String[] args) {
        System.out.println("Hello from Compillo Java Runtime!");
        
        int sum = 0;
        for (int i = 1; i <= 10; i++) {
            sum += i;
        }
        System.out.println("Sum of numbers 1 to 10: " + sum);
    }
}
`;
    },
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    extension: 'ts',
    defaultFilename: 'index.ts',
    language: 'typescript',
    description: 'Typed JavaScript with interfaces and types',
    category: 'Languages',
    badgeColor: '#3178C6',
    getStarterContent: (filename: string) => `/**
 * ${filename}
 * Compillo Studio - TypeScript Module
 */

export interface UserProfile {
  id: string;
  name: string;
  role: 'admin' | 'developer' | 'viewer';
  created: Date;
}

export function createSession(user: UserProfile): string {
  console.log(\`Session initialized for \${user.name} [\${user.role}]\`);
  return \`token_\${Date.now()}_\${user.id}\`;
}

const demoUser: UserProfile = {
  id: 'usr-101',
  name: 'Alex Developer',
  role: 'developer',
  created: new Date(),
};

console.log(createSession(demoUser));
`,
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    extension: 'js',
    defaultFilename: 'app.js',
    language: 'javascript',
    description: 'Standard modern ECMAScript / Node.js',
    category: 'Languages',
    badgeColor: '#F7DF1E',
    getStarterContent: (filename: string) => `/**
 * ${filename}
 * Compillo Studio - Modern JavaScript
 */

function runApplication() {
  const systemInfo = {
    platform: 'Compillo Web IDE',
    timestamp: new Date().toISOString(),
  };

  console.log('Compillo JS initialized:', systemInfo);
  return systemInfo;
}

runApplication();
`,
  },
  {
    id: 'rust',
    name: 'Rust',
    extension: 'rs',
    defaultFilename: 'main.rs',
    language: 'rust',
    description: 'Memory-safe systems programming in Rust',
    category: 'Languages',
    badgeColor: '#CE412B',
    getStarterContent: (filename: string) => `// ${filename} - Compillo Studio Rust Source
fn main() {
    println!("Hello from Compillo Rust!");

    let items = vec![10, 20, 30, 40, 50];
    let total: i32 = items.iter().sum();

    println!("Total sum: {}", total);
}
`,
  },
  {
    id: 'go',
    name: 'Go',
    extension: 'go',
    defaultFilename: 'main.go',
    language: 'go',
    description: 'Fast, concurrent systems programming with Go',
    category: 'Languages',
    badgeColor: '#00ADD8',
    getStarterContent: (filename: string) => `// ${filename} - Compillo Studio Go Source
package main

import (
	"fmt"
	"time"
)

func main() {
	fmt.Printf("Compillo Go Runtime started at %v\\n", time.Now().Format(time.RFC3339))
}
`,
  },
  {
    id: 'html',
    name: 'HTML5',
    extension: 'html',
    defaultFilename: 'index.html',
    language: 'html',
    description: 'Modern HTML5 web document template',
    category: 'Web',
    badgeColor: '#E34F26',
    getStarterContent: (filename: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compillo Web App</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 2rem;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #1e293b;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      max-width: 500px;
      text-align: center;
    }
    h1 { color: #38bdf8; margin-top: 0; }
    button {
      background: #2563eb;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1rem;
    }
    button:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Welcome to Compillo</h1>
    <p>This HTML page can be viewed directly in Compillo Live Preview.</p>
    <button onclick="alert('Hello from Compillo!')">Click Me</button>
  </div>
</body>
</html>
`,
  },
  {
    id: 'css',
    name: 'CSS',
    extension: 'css',
    defaultFilename: 'styles.css',
    language: 'css',
    description: 'Cascading Style Sheet with modern CSS variables',
    category: 'Web',
    badgeColor: '#1572B6',
    getStarterContent: () => `/* Compillo Studio Modern Stylesheet */
:root {
  --font-primary: 'Inter', system-ui, sans-serif;
  --bg-dark: #0f172a;
  --bg-card: #1e293b;
  --text-main: #f8fafc;
  --accent-color: #38bdf8;
  --border-subtle: #334155;
}

* {
  box-sizing: border-box;
}

body {
  font-family: var(--font-primary);
  background-color: var(--bg-dark);
  color: var(--text-main);
  margin: 0;
  line-height: 1.6;
}
`,
  },
  {
    id: 'json',
    name: 'JSON',
    extension: 'json',
    defaultFilename: 'data.json',
    language: 'json',
    description: 'Structured data, schema, or configuration file',
    category: 'Data & Docs',
    badgeColor: '#000000',
    getStarterContent: (filename: string) => `{
  "name": "compillo-project",
  "version": "1.0.0",
  "description": "Created with Compillo Studio",
  "environment": "development",
  "settings": {
    "theme": "nova-studio",
    "fontSize": 14,
    "tabSize": 2
  },
  "file": "${filename}"
}
`,
  },
  {
    id: 'sql',
    name: 'SQL',
    extension: 'sql',
    defaultFilename: 'queries.sql',
    language: 'sql',
    description: 'SQL queries, schema migrations, and table definitions',
    category: 'Data & Docs',
    badgeColor: '#CC292B',
    getStarterContent: () => `-- Compillo Studio - SQL Script
-- Create sample schema and records

CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    language VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO projects (name, language) VALUES
('Compillo Core', 'TypeScript'),
('AI Engine', 'Python'),
('Enterprise Backend', 'Java');

-- Query all active projects
SELECT id, name, language, created_at
FROM projects
ORDER BY created_at DESC;
`,
  },
  {
    id: 'markdown',
    name: 'Markdown',
    extension: 'md',
    defaultFilename: 'README.md',
    language: 'markdown',
    description: 'Documentation, notes, or technical specification',
    category: 'Data & Docs',
    badgeColor: '#083fa1',
    getStarterContent: (filename: string) => `# ${filename.replace(/\.md$/i, '')}

Welcome to your new document in **Compillo Studio**.

## Features
- Full syntax highlighting
- Live Markdown split-pane preview
- Integrated terminal and workspace tools

## Getting Started
Edit this document or explore other project files using the Explorer sidebar.
`,
  },
  {
    id: 'shell',
    name: 'Shell / Bash',
    extension: 'sh',
    defaultFilename: 'build.sh',
    language: 'shell',
    description: 'Bash automation script with error trapping',
    category: 'Languages',
    badgeColor: '#4EAA25',
    getStarterContent: (filename: string) => `#!/usr/bin/env bash
# ${filename} - Compillo Studio Automation Script
set -euo pipefail

echo "========================================"
echo "Compillo Build Script Started"
echo "Host: $(uname -s) | Shell: \${SHELL}"
echo "Date: $(date)"
echo "========================================"

echo "✓ Tasks completed successfully."
`,
  },
  {
    id: 'plaintext',
    name: 'Plain Text',
    extension: 'txt',
    defaultFilename: 'notes.txt',
    language: 'plaintext',
    description: 'Generic unformatted text document',
    category: 'Data & Docs',
    badgeColor: '#6c757d',
    getStarterContent: (filename: string) => `Compillo Notes: ${filename}
Created: ${new Date().toLocaleDateString()}
----------------------------------------

- 
`,
  },
];

export function findPresetByExtension(ext: string): FileTypePreset | undefined {
  const cleanExt = ext.replace(/^\./, '').toLowerCase();
  return FILE_TYPE_PRESETS.find((p) => p.extension.toLowerCase() === cleanExt);
}
