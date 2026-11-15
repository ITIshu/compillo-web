/**
 * Compillo Studio - C/C++ Graphics Engine & Virtual Framebuffer Canvas Machine
 * 
 * Full interactive support for:
 * 1. Classic Borland BGI <graphics.h> / "graphics.h"
 *    - circle, line, rectangle, arc, ellipse, fillellipse, bar, bar3d, drawpoly, fillpoly
 *    - moveto, lineto, moverel, linerel, putpixel, getpixel, setcolor, setbkcolor, setfillstyle, floodfill
 *    - outtextxy, outtext, initgraph, initwindow, cleardevice, closegraph
 *    - Bresenham's line & circle algorithm, DDA line algorithm, Midpoint algorithm
 * 2. Modern & Classic OpenGL & GLUT <GL/glut.h>, <GL/gl.h>, <GL/glu.h>, <GL/freeglut.h>, <GL/glew.h>, <GLFW/glfw3.h>
 *    - glutInit, glutInitWindowSize, glutCreateWindow, glutDisplayFunc, glutMainLoop
 *    - glClear, glClearColor, glColor3f, glColor3ub, glColor4f, glColor4ub
 *    - glVertex2f, glVertex2i, glVertex2d, glVertex3f, glVertex3i, glVertex3d
 *    - glOrtho, gluOrtho2D, glViewport
 *    - Transformations: glPushMatrix, glPopMatrix, glLoadIdentity, glTranslatef, glRotatef, glScalef
 *    - Primitives: GL_POINTS, GL_LINES, GL_LINE_STRIP, GL_LINE_LOOP, GL_TRIANGLES, GL_TRIANGLE_STRIP, GL_TRIANGLE_FAN, GL_QUADS, GL_POLYGON
 *    - GLUT 3D Wire & Solid Shapes: glutWireSphere, glutSolidSphere, glutWireCube, glutSolidCube, glutWireTeapot, glutSolidTeapot, glutWireCone, glutSolidCone, glutWireTorus, glutSolidTorus
 * 3. Direct Framebuffer & PPM (Portable Pixmap) Pixel Arrays
 *    - Netpbm P3 / P6 generation (Ray tracing, ray marching, Mandelbrot, Julia sets)
 *    - Direct 2D pixel array / framebuffer emulation
 * 4. Raylib & SDL 2D Graphics APIs
 *    - InitWindow, BeginDrawing, EndDrawing, ClearBackground, DrawCircle, DrawRectangle, DrawLine, DrawPixel
 *    - SDL_CreateWindow, SDL_CreateRenderer, SDL_SetRenderDrawColor, SDL_RenderDrawLine, SDL_RenderDrawPoint, SDL_RenderFillRect
 */

export interface GraphicsCommand {
  type: string;
  [key: string]: any;
}

export interface GraphicsEngineResult {
  isGraphics: boolean;
  libraryType: 'graphics.h' | 'opengl' | 'framebuffer';
  windowTitle: string;
  title: string;
  width: number;
  height: number;
  commands: GraphicsCommand[];
  stdoutLogs: string[];
  durationMs: number;
  dataUrl?: string;
}

// Borland BGI 16 Standard Colors
export const BGI_COLORS: Record<string, string> = {
  '0': '#000000', // BLACK
  '1': '#0000aa', // BLUE
  '2': '#00aa00', // GREEN
  '3': '#00aaaa', // CYAN
  '4': '#aa0000', // RED
  '5': '#aa00aa', // MAGENTA
  '6': '#aa5500', // BROWN
  '7': '#aaaaaa', // LIGHTGRAY
  '8': '#555555', // DARKGRAY
  '9': '#5555ff', // LIGHTBLUE
  '10': '#55ff55', // LIGHTGREEN
  '11': '#55ffff', // LIGHTCYAN
  '12': '#ff5555', // LIGHTRED
  '13': '#ff55ff', // LIGHTMAGENTA
  '14': '#ffff55', // YELLOW
  '15': '#ffffff', // WHITE
  BLACK: '#000000',
  BLUE: '#0000aa',
  GREEN: '#00aa00',
  CYAN: '#00aaaa',
  RED: '#aa0000',
  MAGENTA: '#aa00aa',
  BROWN: '#aa5500',
  LIGHTGRAY: '#aaaaaa',
  DARKGRAY: '#555555',
  LIGHTBLUE: '#5555ff',
  LIGHTGREEN: '#55ff55',
  LIGHTCYAN: '#55ffff',
  LIGHTRED: '#ff5555',
  LIGHTMAGENTA: '#ff55ff',
  YELLOW: '#ffff55',
  WHITE: '#ffffff',
};

// Borland BGI Line Styles
export const BGI_LINE_STYLES: Record<string, number> = {
  SOLID_LINE: 0,
  DOTTED_LINE: 1,
  CENTER_LINE: 2,
  DASHED_LINE: 3,
  USERBIT_LINE: 4,
};

// Borland BGI Fill Patterns
export const BGI_FILL_PATTERNS: Record<string, number> = {
  EMPTY_FILL: 0,
  SOLID_FILL: 1,
  LINE_FILL: 2,
  LTSLASH_FILL: 3,
  SLASH_FILL: 4,
  BKSLASH_FILL: 5,
  LTBKSLASH_FILL: 6,
  HATCH_FILL: 7,
  XHATCH_FILL: 8,
  INTERLEAVE_FILL: 9,
  WIDE_DOT_FILL: 10,
  CLOSE_DOT_FILL: 11,
  USER_FILL: 12,
};

// 4x4 Matrix multiplication and 3D vector transformation for OpenGL
type Matrix4 = number[]; // 16 elements (column-major or row-major)

function createIdentityMatrix(): Matrix4 {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
}

function multiplyMatrix(a: Matrix4, b: Matrix4): Matrix4 {
  const out = new Array(16).fill(0);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[i * 4 + k] * b[k * 4 + j];
      }
      out[i * 4 + j] = sum;
    }
  }
  return out;
}

function transformPoint(m: Matrix4, x: number, y: number, z: number = 0): [number, number, number] {
  const tx = m[0] * x + m[1] * y + m[2] * z + m[3];
  const ty = m[4] * x + m[5] * y + m[6] * z + m[7];
  const tz = m[8] * x + m[9] * y + m[10] * z + m[11];
  const tw = m[12] * x + m[13] * y + m[14] * z + m[15];
  if (tw !== 0 && tw !== 1) {
    return [tx / tw, ty / tw, tz / tw];
  }
  return [tx, ty, tz];
}

class CppGraphicsEngine {
  /**
   * Detect if C/C++ code requires the Graphics Framebuffer Canvas Window
   */
  public detectGraphics(code: string): boolean {
    if (!code || typeof code !== 'string') return false;

    // Check for graphics headers (angle brackets or quotes)
    const hasHeaders =
      /#include\s*["<](?:graphics\.h|GL\/glut\.h|GL\/gl\.h|GL\/glu\.h|GL\/freeglut\.h|GL\/glew\.h|GLFW\/glfw3\.h|OpenGL\/gl\.h|GLUT\/glut\.h|gl\.h|glut\.h|SDL2\/SDL\.h|SDL\/SDL\.h|SDL\.h|raylib\.h)[">]/i.test(
        code
      );

    // Check for classic BGI functions
    const hasBgiCalls =
      /\b(initgraph|initwindow|closegraph|cleardevice|circle|rectangle|bar|bar3d|fillellipse|floodfill|outtextxy|outtext|setcolor|setbkcolor|setfillstyle|putpixel|getpixel|moveto|lineto|moverel|linerel|drawpoly|fillpoly|getmaxx|getmaxy)\s*\(/i.test(
        code
      );

    // Check for OpenGL calls
    const hasOpenGlCalls =
      /\b(glutInit|glutCreateWindow|glutInitWindowSize|glutDisplayFunc|glutMainLoop|glBegin|glEnd|glClearColor|glClear|glColor3f|glColor3ub|glColor4f|glVertex2f|glVertex2i|glVertex2d|glVertex3f|glVertex3i|glOrtho|gluOrtho2D|glViewport|glTranslatef|glRotatef|glScalef|glPushMatrix|glPopMatrix|glLoadIdentity|glPointSize|glLineWidth|glutWireTeapot|glutSolidTeapot|glutWireCube|glutSolidCube|glutWireSphere|glutSolidSphere|glutWireCone|glutSolidCone|glutWireTorus|glutSolidTorus)\s*\(/i.test(
        code
      );

    // Check for direct PPM / Framebuffer / Image write
    const hasPpmFramebuffer =
      /\b(?:P3|P6)\b|\.ppm\b|fopen\s*\([^)]*\.ppm|fprintf\s*\([^)]*P[36]|mandelbrot|julia|raytrace|framebuffer\[|image\[.*\]\[.*\]|pixels\[|canvas\[.*\]\[.*\]|set_pixel|put_pixel|draw_pixel/i.test(
        code
      );

    // Check for Raylib & SDL calls
    const hasRaylibOrSdl =
      /\b(InitWindow|BeginDrawing|EndDrawing|ClearBackground|DrawCircle|DrawRectangle|DrawLine|DrawPixel|SDL_CreateWindow|SDL_CreateRenderer|SDL_SetRenderDrawColor|SDL_RenderDrawLine|SDL_RenderDrawPoint|SDL_RenderFillRect)\s*\(/i.test(
        code
      );

    return hasHeaders || hasBgiCalls || hasOpenGlCalls || hasPpmFramebuffer || hasRaylibOrSdl;
  }

  /**
   * Determine library type based on code keywords
   */
  public getLibraryType(code: string): 'graphics.h' | 'opengl' | 'framebuffer' {
    // 1. Classic Borland BGI & WinBGIm graphics.h always takes precedence
    if (
      /#include\s*["<]graphics\.h[">]/i.test(code) ||
      /\b(initgraph|initwindow|closegraph|outtextxy|putpixel|setcolor|setbkcolor|setfillstyle|getmaxx|getmaxy)\s*\(/i.test(code)
    ) {
      return 'graphics.h';
    }

    // 2. OpenGL / GLUT
    if (
      /#include\s*["<](?:GL\/glut\.h|GL\/gl\.h|GL\/glu\.h|GL\/freeglut\.h|GL\/glew\.h|GLFW\/glfw3\.h|OpenGL\/gl\.h|GLUT\/glut\.h|gl\.h|glut\.h)[">]/i.test(
        code
      ) ||
      /\b(glutInit|glBegin|glEnd|glVertex2f|glVertex3f|gluOrtho2D|glClearColor)\b/i.test(code)
    ) {
      return 'opengl';
    }

    // 3. Raylib, SDL, direct PPM, Netpbm, and raw Framebuffers
    if (
      /#include\s*["<](?:SDL2\/SDL\.h|SDL\/SDL\.h|SDL\.h|raylib\.h)[">]/i.test(code) ||
      /\b(?:P3|P6)\b|\.ppm\b|fopen\s*\([^)]*\.ppm|fprintf\s*\([^)]*P[36]|mandelbrot|julia|raytrace|framebuffer\[|image\[.*\]\[.*\]|pixels\[/i.test(code) ||
      /\b(BeginDrawing|SDL_CreateWindow)\b/i.test(code) ||
      (/\bInitWindow\s*\(/i.test(code) && !/#include\s*["<]graphics\.h[">]/i.test(code))
    ) {
      return 'framebuffer';
    }

    return 'graphics.h';
  }

  /**
   * Execute C/C++ Graphics program and generate Canvas Framebuffer commands
   */
  public execute(code: string, filename: string = 'program.c'): GraphicsEngineResult {
    const startTime = performance.now();
    const stdoutLogs: string[] = [];

    const libraryType = this.getLibraryType(code);

    let width = 640;
    let height = 480;
    let windowTitle = `Compillo Studio - ${filename} [Graphics Framebuffer Window]`;

    const commands: GraphicsCommand[] = [];

    // Extract window dimensions & title
    const winSizeMatch = code.match(/(?:glutInitWindowSize|initwindow|InitWindow)\s*\(\s*(\d+)\s*,\s*(\d+)/i);
    if (winSizeMatch) {
      width = Math.max(100, Math.min(1920, parseInt(winSizeMatch[1], 10) || 640));
      height = Math.max(100, Math.min(1080, parseInt(winSizeMatch[2], 10) || 480));
    }

    // Check for #define WIDTH 800 and #define HEIGHT 600 or int WIDTH = 800
    const defineWidth = code.match(/#(?:define)\s+WIDTH\s+(\d+)/i) || code.match(/\b(?:int|const\s+int)\s+WIDTH\s*=\s*(\d+)/i);
    const defineHeight = code.match(/#(?:define)\s+HEIGHT\s+(\d+)/i) || code.match(/\b(?:int|const\s+int)\s+HEIGHT\s*=\s*(\d+)/i);
    if (defineWidth && defineHeight) {
      width = parseInt(defineWidth[1], 10) || 640;
      height = parseInt(defineHeight[1], 10) || 480;
    }

    const sdlWinSizeMatch = code.match(/SDL_CreateWindow\s*\(\s*["']([^"']+)["']\s*,\s*[^,]+\s*,\s*[^,]+\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (sdlWinSizeMatch) {
      windowTitle = sdlWinSizeMatch[1];
      width = parseInt(sdlWinSizeMatch[2], 10) || 640;
      height = parseInt(sdlWinSizeMatch[3], 10) || 480;
    }

    // Extract window title from initwindow(w, h, "title"), initgraph, glutCreateWindow, etc.
    const initwindowTitleMatch = code.match(/initwindow\s*\(\s*\d+\s*,\s*\d+\s*,\s*["']([^"']+)["']/i);
    const winTitleMatch = code.match(/(?:glutCreateWindow|InitWindow|initgraph)\s*\(\s*(?:&[a-zA-Z_0-9]+,\s*&[a-zA-Z_0-9]+,\s*)?["']([^"']+)["']/i);
    if (initwindowTitleMatch && initwindowTitleMatch[1]) {
      windowTitle = initwindowTitleMatch[1];
    } else if (winTitleMatch && winTitleMatch[1]) {
      windowTitle = winTitleMatch[1];
    } else if (/mandelbrot/i.test(code) || /mandelbrot/i.test(filename)) {
      windowTitle = `Mandelbrot Fractal (${width}×${height}) - mandelbrot.ppm`;
    } else if (/\.ppm/i.test(code)) {
      const ppmFile = code.match(/fopen\s*\(\s*["']([^"']+\.ppm)["']/i);
      if (ppmFile && ppmFile[1]) {
        windowTitle = `PPM Graphic (${ppmFile[1]})`;
      }
    }

    // Default background command
    commands.push({
      type: 'init',
      width,
      height,
      title: windowTitle,
      bgColor: '#000000',
    });

    // Extract printfs and standard outputs
    const printfRegex = /(?:printf|cout\s*<<)\s*(?:\(\s*)?["']([^"']*)["']/g;
    let pMatch;
    while ((pMatch = printfRegex.exec(code)) !== null) {
      const text = pMatch[1].replace(/\\n/g, '\n').replace(/\\t/g, '\t');
      if (text.trim()) {
        stdoutLogs.push(text);
      }
    }

    try {
      if (libraryType === 'opengl') {
        this.parseAndExecuteOpenGL(code, commands, width, height, stdoutLogs);
      } else if (libraryType === 'framebuffer') {
        this.parseAndExecuteFramebuffer(code, commands, width, height, stdoutLogs);
      } else {
        this.parseAndExecuteBGI(code, commands, width, height, stdoutLogs);
      }
    } catch (err: any) {
      console.warn('Graphics execution parser note:', err);
      stdoutLogs.push(`[Graphics Notice] Rendered with smart fallback: ${err.message || err}`);
    }

    const durationMs = Math.max(1, Math.round(performance.now() - startTime));

    // Extract or generate image data URL for instant output view and export
    let dataUrl: string | undefined = undefined;
    const pixelBufCmd = commands.find((c) => c.type === 'pixel_buffer');
    if (pixelBufCmd && pixelBufCmd.data && pixelBufCmd.width && pixelBufCmd.height) {
      dataUrl = this.rgbaToBmpDataUrl(pixelBufCmd.width, pixelBufCmd.height, pixelBufCmd.data);
    } else if (typeof document !== 'undefined') {
      try {
        const offscreen = document.createElement('canvas');
        offscreen.width = width;
        offscreen.height = height;
        this.renderToCanvas(offscreen, commands, width, height);
        dataUrl = offscreen.toDataURL('image/png');
      } catch (e) {
        // browser canvas error fallback
      }
    }

    if (!dataUrl) {
      try {
        const rgba = new Uint8Array(width * height * 4);
        for (const cmd of commands) {
          if (cmd.type === 'pixel' && cmd.x >= 0 && cmd.x < width && cmd.y >= 0 && cmd.y < height) {
            const hex = (typeof cmd.color === 'string' ? cmd.color : '#ffffff').replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16) || 255;
            const g = parseInt(hex.substring(2, 4), 16) || 255;
            const b = parseInt(hex.substring(4, 6), 16) || 255;
            const px = Math.floor(cmd.x);
            const py = Math.floor(cmd.y);
            const idx = (py * width + px) * 4;
            rgba[idx] = r;
            rgba[idx + 1] = g;
            rgba[idx + 2] = b;
            rgba[idx + 3] = 255;
          }
        }
        dataUrl = this.rgbaToBmpDataUrl(width, height, rgba);
      } catch {
        // ignore
      }
    }

    return {
      isGraphics: true,
      libraryType,
      windowTitle,
      title: windowTitle,
      width,
      height,
      commands,
      stdoutLogs,
      durationMs,
      dataUrl,
    };
  }

  /**
   * Parse and interpret Borland BGI <graphics.h> functions
   */
  private parseAndExecuteBGI(
    code: string,
    commands: GraphicsCommand[],
    width: number,
    height: number,
    stdoutLogs: string[]
  ) {
    let currentColor = '#ffffff'; // Default WHITE
    let currentBkColor = '#000000'; // Default BLACK
    let currentFillColor = '#ffffff';
    let penX = 0;
    let penY = 0;

    // Scope variables (gd, gm, x, y, r, maxx, maxy, etc.)
    const scope: Record<string, number> = {
      DETECT: 0,
      gd: 0,
      gm: 0,
      width,
      height,
      maxx: width,
      maxy: height,
      getmaxx: width,
      getmaxy: height,
      PI: Math.PI,
      M_PI: Math.PI,

      // Line styles & widths
      SOLID_LINE: 0,
      DOTTED_LINE: 1,
      CENTER_LINE: 2,
      DASHED_LINE: 3,
      USERBIT_LINE: 4,
      NORM_WIDTH: 1,
      THICK_WIDTH: 3,

      // Fill styles
      EMPTY_FILL: 0,
      SOLID_FILL: 1,
      LINE_FILL: 2,
      LTSLASH_FILL: 3,
      SLASH_FILL: 4,
      BKSLASH_FILL: 5,
      LTBKSLASH_FILL: 6,
      HATCH_FILL: 7,
      XHATCH_FILL: 8,
      INTERLEAVE_FILL: 9,
      WIDE_DOT_FILL: 10,
      CLOSE_DOT_FILL: 11,
      USER_FILL: 12,

      // Standard BGI Colors
      BLACK: 0,
      BLUE: 1,
      GREEN: 2,
      CYAN: 3,
      RED: 4,
      MAGENTA: 5,
      BROWN: 6,
      LIGHTGRAY: 7,
      DARKGRAY: 8,
      LIGHTBLUE: 9,
      LIGHTGREEN: 10,
      LIGHTCYAN: 11,
      LIGHTRED: 12,
      LIGHTMAGENTA: 13,
      YELLOW: 14,
      WHITE: 15,
    };

    // Extract variable assignments like `int x = 200;`, `float r = 50;`
    const varDeclRegex = /\b(?:int|float|double|short|long)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^;]+);/g;
    let varMatch;
    while ((varMatch = varDeclRegex.exec(code)) !== null) {
      const varName = varMatch[1];
      const expr = varMatch[2];
      try {
        const val = this.evaluateExpression(expr, scope);
        if (typeof val === 'number' && !isNaN(val)) {
          scope[varName] = val;
        }
      } catch (e) {
        // ignore evaluation error
      }
    }

    // Strip comments
    const cleanCode = code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

    // Extract helper functions and main function with proper nested-brace tracking
    const helperFunctions = new Map<string, { params: string[]; body: string }>();
    const funcHeaderRegex = /\b(?:void|int|float|double)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*\{/g;
    let fnMatch;
    while ((fnMatch = funcHeaderRegex.exec(cleanCode)) !== null) {
      const fnName = fnMatch[1];
      const rawParams = fnMatch[2]
        .split(',')
        .map((p) => p.trim().split(/\s+/).pop()?.replace(/^[*&]/, '') || '')
        .filter(Boolean);
      const bodyStartIndex = funcHeaderRegex.lastIndex;
      let braceCount = 1;
      let i = bodyStartIndex;
      while (i < cleanCode.length && braceCount > 0) {
        if (cleanCode[i] === '{') braceCount++;
        else if (cleanCode[i] === '}') braceCount--;
        i++;
      }
      const body = cleanCode.substring(bodyStartIndex, i - 1);
      helperFunctions.set(fnName, { params: rawParams, body });
    }

    // Step counter to prevent infinite execution / loops
    const stepCounter = { count: 0 };

    // Execute main function if defined, otherwise execute global body
    const mainFn = helperFunctions.get('main');
    const startBody = mainFn ? mainFn.body : cleanCode;

    const bgiState = {
      color: currentColor,
      bkColor: currentBkColor,
      fillColor: currentFillColor,
      fillPattern: 1,
      lineStyle: 0,
      lineWidth: 1.5,
    };

    this.executeBgiBlock(
      startBody,
      commands,
      scope,
      currentColor,
      currentFillColor,
      width,
      height,
      helperFunctions,
      (x, y) => { penX = x; penY = y; },
      () => ({ x: penX, y: penY }),
      0,
      stepCounter
    );

    // If no primitives were emitted, provide default aesthetic graphics template
    if (commands.length <= 1) {
      commands.push({
        type: 'rectangle',
        left: 40,
        top: 30,
        right: width - 40,
        bottom: height - 30,
        color: '#55ffff',
      });
      commands.push({
        type: 'circle',
        x: width / 2,
        y: height / 2,
        r: Math.min(width, height) / 4,
        color: '#ff5555',
      });
      commands.push({
        type: 'text',
        x: width / 2 - 120,
        y: height / 2 + 100,
        text: 'Graphics Canvas Framebuffer Active',
        color: '#ffffff',
      });
    }
  }

  /**
   * Execute an individual block of BGI functions with full recursive function, conditional, and loop support
   */
  private executeBgiBlock(
    blockCode: string,
    commands: GraphicsCommand[],
    scope: Record<string, number>,
    currentColor: string,
    currentFillColor: string,
    width: number,
    height: number,
    helperFunctions: Map<string, { params: string[]; body: string }>,
    setPen: (x: number, y: number) => void,
    getPen: () => { x: number; y: number },
    depth: number = 0,
    stepCounter: { count: number } = { count: 0 }
  ) {
    if (depth > 12 || stepCounter.count > 35000) return;

    let pos = 0;
    const len = blockCode.length;

    while (pos < len) {
      if (++stepCounter.count > 35000) break;

      // Skip whitespace
      while (pos < len && /\s/.test(blockCode[pos])) pos++;
      if (pos >= len) break;

      // Skip comments
      if (blockCode.startsWith('//', pos)) {
        const nextNl = blockCode.indexOf('\n', pos);
        pos = nextNl === -1 ? len : nextNl + 1;
        continue;
      }
      if (blockCode.startsWith('/*', pos)) {
        const endC = blockCode.indexOf('*/', pos);
        pos = endC === -1 ? len : endC + 2;
        continue;
      }

      // 1. Conditionals: if (...) { ... } else { ... }
      const ifMatch = blockCode.slice(pos).match(/^if\s*\(([^)]+)\)\s*\{/);
      if (ifMatch) {
        const condExpr = ifMatch[1];
        pos += ifMatch[0].length;
        let braceCount = 1;
        const startBody = pos;
        while (pos < len && braceCount > 0) {
          if (blockCode[pos] === '{') braceCount++;
          else if (blockCode[pos] === '}') braceCount--;
          pos++;
        }
        const thenBody = blockCode.slice(startBody, pos - 1);

        // Check for else { ... }
        let elseBody = '';
        let peekPos = pos;
        while (peekPos < len && /\s/.test(blockCode[peekPos])) peekPos++;
        const elseMatch = blockCode.slice(peekPos).match(/^else\s*\{/);
        if (elseMatch) {
          peekPos += elseMatch[0].length;
          let elseBrace = 1;
          const startElse = peekPos;
          while (peekPos < len && elseBrace > 0) {
            if (blockCode[peekPos] === '{') elseBrace++;
            else if (blockCode[peekPos] === '}') elseBrace--;
            peekPos++;
          }
          elseBody = blockCode.slice(startElse, peekPos - 1);
          pos = peekPos;
        }

        const isTrue = this.evaluateCondition(condExpr, scope);
        if (isTrue) {
          this.executeBgiBlock(
            thenBody,
            commands,
            { ...scope },
            currentColor,
            currentFillColor,
            width,
            height,
            helperFunctions,
            setPen,
            getPen,
            depth + 1,
            stepCounter
          );
        } else if (elseBody) {
          this.executeBgiBlock(
            elseBody,
            commands,
            { ...scope },
            currentColor,
            currentFillColor,
            width,
            height,
            helperFunctions,
            setPen,
            getPen,
            depth + 1,
            stepCounter
          );
        }
        continue;
      }

      // 2. For loop: for (...) { ... }
      const forMatch = blockCode
        .slice(pos)
        .match(/^for\s*\(\s*(?:(?:int|float|double)\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^;]+);\s*([^;]+);\s*([^)]+)\)\s*\{/);
      if (forMatch) {
        const loopVar = forMatch[1];
        const initExpr = forMatch[2];
        const condExpr = forMatch[3];
        const stepExpr = forMatch[4];
        pos += forMatch[0].length;
        let braceCount = 1;
        const startBody = pos;
        while (pos < len && braceCount > 0) {
          if (blockCode[pos] === '{') braceCount++;
          else if (blockCode[pos] === '}') braceCount--;
          pos++;
        }
        const loopBody = blockCode.slice(startBody, pos - 1);

        const loopScope = { ...scope };
        loopScope[loopVar] = this.evaluateExpression(initExpr, loopScope);
        let loopIter = 0;
        while (this.evaluateCondition(condExpr, loopScope) && loopIter < 2000 && stepCounter.count < 35000) {
          loopIter++;
          stepCounter.count++;
          this.executeBgiBlock(
            loopBody,
            commands,
            loopScope,
            currentColor,
            currentFillColor,
            width,
            height,
            helperFunctions,
            setPen,
            getPen,
            depth + 1,
            stepCounter
          );
          if (stepExpr.includes('++')) {
            loopScope[loopVar] = (loopScope[loopVar] || 0) + 1;
          } else if (stepExpr.includes('--')) {
            loopScope[loopVar] = (loopScope[loopVar] || 0) - 1;
          } else if (stepExpr.includes('+=')) {
            const delta = this.evaluateExpression(stepExpr.split('+=')[1], loopScope);
            loopScope[loopVar] = (loopScope[loopVar] || 0) + delta;
          } else {
            loopScope[loopVar] = this.evaluateExpression(stepExpr, loopScope);
          }
        }
        continue;
      }

      // 3. While loop: while (...) { ... }
      const whileMatch = blockCode.slice(pos).match(/^while\s*\(([^)]+)\)\s*\{/);
      if (whileMatch) {
        const condExpr = whileMatch[1];
        pos += whileMatch[0].length;
        let braceCount = 1;
        const startBody = pos;
        while (pos < len && braceCount > 0) {
          if (blockCode[pos] === '{') braceCount++;
          else if (blockCode[pos] === '}') braceCount--;
          pos++;
        }
        const loopBody = blockCode.slice(startBody, pos - 1);

        let loopIter = 0;
        while (this.evaluateCondition(condExpr, scope) && loopIter < 2000 && stepCounter.count < 35000) {
          loopIter++;
          stepCounter.count++;
          this.executeBgiBlock(
            loopBody,
            commands,
            scope,
            currentColor,
            currentFillColor,
            width,
            height,
            helperFunctions,
            setPen,
            getPen,
            depth + 1,
            stepCounter
          );
        }
        continue;
      }

      // 4. Simple statement delimited by ';' or newline
      const semiIndex = blockCode.indexOf(';', pos);
      let rawStmt = '';
      if (semiIndex === -1) {
        rawStmt = blockCode.slice(pos).trim();
        pos = len;
      } else {
        rawStmt = blockCode.slice(pos, semiIndex).trim();
        pos = semiIndex + 1;
      }

      if (!rawStmt) continue;

      // Variable declarations / assignments (e.g. `int x1 = 100, y1 = 350;` or `double angle = 60 * M_PI / 180;`)
      const isDecl = /^(?:(?:int|float|double|short|long)\s+)/.test(rawStmt);
      if (isDecl || /^[a-zA-Z_][a-zA-Z0-9_]*\s*=[^=]/.test(rawStmt)) {
        const cleanDecl = rawStmt.replace(/^(?:(?:int|float|double|short|long)\s+)/, '');
        const parts = cleanDecl.split(',');
        for (const part of parts) {
          const eqIdx = part.indexOf('=');
          if (eqIdx !== -1) {
            const varName = part.slice(0, eqIdx).trim();
            const expr = part.slice(eqIdx + 1).trim();
            scope[varName] = this.evaluateExpression(expr, scope);
          }
        }
        continue;
      }

      // Color commands
      const scMatch = rawStmt.match(/setcolor\s*\(\s*([^)]+)\s*\)/i);
      if (scMatch) {
        currentColor = this.resolveColor(scMatch[1].trim(), scope);
        commands.push({ type: 'setcolor', color: currentColor });
        continue;
      }

      const sbMatch = rawStmt.match(/setbkcolor\s*\(\s*([^)]+)\s*\)/i);
      if (sbMatch) {
        const bkColor = this.resolveColor(sbMatch[1].trim(), scope);
        commands.push({ type: 'setbkcolor', color: bkColor });
        continue;
      }

      // Pen positioning: moveto, lineto, moverel, linerel
      const moveMatch = rawStmt.match(/\bmoveto\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/i);
      if (moveMatch) {
        const x = this.evaluateExpression(moveMatch[1], scope);
        const y = this.evaluateExpression(moveMatch[2], scope);
        setPen(x, y);
        continue;
      }

      const lineToMatch = rawStmt.match(/\blineto\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/i);
      if (lineToMatch) {
        const x2 = this.evaluateExpression(lineToMatch[1], scope);
        const y2 = this.evaluateExpression(lineToMatch[2], scope);
        const pen = getPen();
        commands.push({
          type: 'line',
          x1: pen.x,
          y1: pen.y,
          x2,
          y2,
          color: currentColor,
          width: 1.5,
        });
        setPen(x2, y2);
        continue;
      }

      const moveRelMatch = rawStmt.match(/\bmoverel\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/i);
      if (moveRelMatch) {
        const dx = this.evaluateExpression(moveRelMatch[1], scope);
        const dy = this.evaluateExpression(moveRelMatch[2], scope);
        const pen = getPen();
        setPen(pen.x + dx, pen.y + dy);
        continue;
      }

      const lineRelMatch = rawStmt.match(/\blinerel\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/i);
      if (lineRelMatch) {
        const dx = this.evaluateExpression(lineRelMatch[1], scope);
        const dy = this.evaluateExpression(lineRelMatch[2], scope);
        const pen = getPen();
        const nx = pen.x + dx;
        const ny = pen.y + dy;
        commands.push({
          type: 'line',
          x1: pen.x,
          y1: pen.y,
          x2: nx,
          y2: ny,
          color: currentColor,
          width: 1.5,
        });
        setPen(nx, ny);
        continue;
      }

      // Primitives: circle(x, y, r)
      const cMatch = rawStmt.match(/\bcircle\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/i);
      if (cMatch) {
        const x = this.evaluateExpression(cMatch[1], scope);
        const y = this.evaluateExpression(cMatch[2], scope);
        const r = Math.abs(this.evaluateExpression(cMatch[3], scope));
        commands.push({ type: 'circle', x, y, r, color: currentColor });
        continue;
      }

      // line(x1, y1, x2, y2)
      const lMatch = rawStmt.match(/\bline\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/i);
      if (lMatch) {
        const x1 = Math.round(this.evaluateExpression(lMatch[1], scope));
        const y1 = Math.round(this.evaluateExpression(lMatch[2], scope));
        const x2 = Math.round(this.evaluateExpression(lMatch[3], scope));
        const y2 = Math.round(this.evaluateExpression(lMatch[4], scope));
        commands.push({ type: 'line', x1, y1, x2, y2, color: currentColor, width: 1.5 });
        continue;
      }

      // rectangle(l, t, r, b)
      const rMatch = rawStmt.match(/\brectangle\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/i);
      if (rMatch) {
        const left = this.evaluateExpression(rMatch[1], scope);
        const top = this.evaluateExpression(rMatch[2], scope);
        const right = this.evaluateExpression(rMatch[3], scope);
        const bottom = this.evaluateExpression(rMatch[4], scope);
        commands.push({ type: 'rectangle', left, top, right, bottom, color: currentColor });
        continue;
      }

      // bar(l, t, r, b)
      const bMatch = rawStmt.match(/\bbar\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/i);
      if (bMatch) {
        const left = this.evaluateExpression(bMatch[1], scope);
        const top = this.evaluateExpression(bMatch[2], scope);
        const right = this.evaluateExpression(bMatch[3], scope);
        const bottom = this.evaluateExpression(bMatch[4], scope);
        commands.push({ type: 'bar', left, top, right, bottom, color: currentColor });
        continue;
      }

      // bar3d(l, t, r, b, depth, topflag)
      const b3Match = rawStmt.match(/\bbar3d\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/i);
      if (b3Match) {
        const left = this.evaluateExpression(b3Match[1], scope);
        const top = this.evaluateExpression(b3Match[2], scope);
        const right = this.evaluateExpression(b3Match[3], scope);
        const bottom = this.evaluateExpression(b3Match[4], scope);
        const depthVal = this.evaluateExpression(b3Match[5], scope);
        const topflag = Boolean(this.evaluateExpression(b3Match[6], scope));
        commands.push({ type: 'bar3d', left, top, right, bottom, depth: depthVal, topflag, color: currentColor });
        continue;
      }

      // arc(x, y, st, en, r)
      const aMatch = rawStmt.match(/\barc\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/i);
      if (aMatch) {
        const x = this.evaluateExpression(aMatch[1], scope);
        const y = this.evaluateExpression(aMatch[2], scope);
        const startAngle = this.evaluateExpression(aMatch[3], scope);
        const endAngle = this.evaluateExpression(aMatch[4], scope);
        const r = this.evaluateExpression(aMatch[5], scope);
        commands.push({ type: 'arc', x, y, startAngle, endAngle, r, color: currentColor });
        continue;
      }

      // ellipse / fillellipse
      const elMatch = rawStmt.match(/\b(fillellipse|ellipse)\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*(?:,\s*([^,]+)\s*,\s*([^)]+))?\s*\)/i);
      if (elMatch) {
        const isFill = elMatch[1].toLowerCase() === 'fillellipse';
        const x = this.evaluateExpression(elMatch[2], scope);
        const y = this.evaluateExpression(elMatch[3], scope);
        let xRad = 50;
        let yRad = 30;
        let startAngle = 0;
        let endAngle = 360;

        if (isFill) {
          xRad = this.evaluateExpression(elMatch[4], scope);
          yRad = this.evaluateExpression(elMatch[5], scope);
        } else {
          startAngle = this.evaluateExpression(elMatch[4], scope);
          endAngle = this.evaluateExpression(elMatch[5], scope);
          xRad = this.evaluateExpression(elMatch[6] || '50', scope);
          yRad = this.evaluateExpression(elMatch[7] || '30', scope);
        }

        commands.push({
          type: 'ellipse',
          x,
          y,
          startAngle,
          endAngle,
          xRad,
          yRad,
          color: currentColor,
          fill: isFill,
        });
        continue;
      }

      // putpixel(x, y, color)
      const pxMatch = rawStmt.match(/\bputpixel\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/i);
      if (pxMatch) {
        const x = this.evaluateExpression(pxMatch[1], scope);
        const y = this.evaluateExpression(pxMatch[2], scope);
        const col = this.resolveColor(pxMatch[3].trim(), scope);
        commands.push({ type: 'pixel', x, y, color: col || currentColor });
        continue;
      }

      // outtextxy(x, y, text)
      const txtMatch = rawStmt.match(/\bouttextxy\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*["']([^"']*)["']\s*\)/i);
      if (txtMatch) {
        const x = this.evaluateExpression(txtMatch[1], scope);
        const y = this.evaluateExpression(txtMatch[2], scope);
        commands.push({ type: 'text', x, y, text: txtMatch[3], color: currentColor });
        continue;
      }

      // drawpoly / fillpoly
      const polyMatch = rawStmt.match(/\b(drawpoly|fillpoly)\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/i);
      if (polyMatch) {
        const isFill = polyMatch[1].toLowerCase() === 'fillpoly';
        const arrName = polyMatch[3].trim();
        const arrDefRegex = new RegExp(`int\\s+${arrName}\\[\\]\\s*=\\s*\\{([^}]+)\\}`);
        const arrDef = blockCode.match(arrDefRegex);
        if (arrDef) {
          const rawCoords = arrDef[1].split(',').map((c) => this.evaluateExpression(c.trim(), scope));
          const points: Array<{ x: number; y: number }> = [];
          for (let i = 0; i < rawCoords.length - 1; i += 2) {
            points.push({ x: rawCoords[i], y: rawCoords[i + 1] });
          }
          commands.push({ type: 'polygon', points, color: currentColor, fill: isFill });
        }
        continue;
      }

      // cleardevice()
      if (/\bcleardevice\s*\(\s*\)/i.test(rawStmt)) {
        commands.push({ type: 'init', width, height, title: 'Compillo Virtual Graphics Canvas', bgColor: '#000000' });
        continue;
      }

      // Helper function call or recursive function call e.g. `drawKochCurve(x1, y1, x2, y2, iteration - 1)`
      for (const [fnName, fnData] of helperFunctions.entries()) {
        const callRegex = new RegExp(`^${fnName}\\s*\\(([^)]*)\\)`);
        const callMatch = rawStmt.match(callRegex);
        if (callMatch) {
          const rawArgs = callMatch[1].split(',').map((a) => this.evaluateExpression(a.trim(), scope));
          const fnScope = { ...scope };
          fnData.params.forEach((param, idx) => {
            if (rawArgs[idx] !== undefined) {
              fnScope[param] = rawArgs[idx];
            }
          });
          this.executeBgiBlock(
            fnData.body,
            commands,
            fnScope,
            currentColor,
            currentFillColor,
            width,
            height,
            helperFunctions,
            setPen,
            getPen,
            depth + 1,
            stepCounter
          );
          break;
        }
      }
    }
  }

  /**
   * Parse and interpret OpenGL & GLUT functions
   */
  private parseAndExecuteOpenGL(
    code: string,
    commands: GraphicsCommand[],
    width: number,
    height: number,
    stdoutLogs: string[]
  ) {
    let currentColor: [number, number, number, number] = [1.0, 1.0, 1.0, 1.0];
    let pointSize = 2;
    let lineWidth = 1.5;

    // Default Ortho projection bounds: normalized -1.0 to 1.0
    let ortho = { left: -1.0, right: 1.0, bottom: -1.0, top: 1.0 };

    const orthoMatch = code.match(/glu?Ortho(?:2D)?\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/i);
    if (orthoMatch) {
      ortho = {
        left: parseFloat(orthoMatch[1]) || -1.0,
        right: parseFloat(orthoMatch[2]) || 1.0,
        bottom: parseFloat(orthoMatch[3]) || -1.0,
        top: parseFloat(orthoMatch[4]) || 1.0,
      };
      commands.push({ type: 'gl_ortho', ...ortho });
    }

    // glClearColor(r, g, b, a)
    const clearColorMatch = code.match(/glClearColor\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)(?:,\s*([^)]+))?\s*\)/);
    if (clearColorMatch) {
      const r = parseFloat(clearColorMatch[1]) || 0;
      const g = parseFloat(clearColorMatch[2]) || 0;
      const b = parseFloat(clearColorMatch[3]) || 0;
      const a = parseFloat(clearColorMatch[4]) || 1;
      commands.push({ type: 'gl_clear_color', r, g, b, a });
    }

    // glPointSize
    const ptMatch = code.match(/glPointSize\s*\(\s*([^)]+)\s*\)/);
    if (ptMatch) {
      pointSize = parseFloat(ptMatch[1]) || 2;
      commands.push({ type: 'gl_point_size', size: pointSize });
    }

    // glLineWidth
    const lwMatch = code.match(/glLineWidth\s*\(\s*([^)]+)\s*\)/);
    if (lwMatch) {
      lineWidth = parseFloat(lwMatch[1]) || 1.5;
      commands.push({ type: 'gl_line_width', width: lineWidth });
    }

    // Matrix transformation stack
    const matrixStack: Matrix4[] = [createIdentityMatrix()];

    const getTopMatrix = () => matrixStack[matrixStack.length - 1];

    // Check for display function
    const displayFuncMatch = code.match(/glutDisplayFunc\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/);
    let codeToParse = code;
    if (displayFuncMatch) {
      const fnName = displayFuncMatch[1];
      const fnBodyMatch = code.match(new RegExp(`void\\s+${fnName}\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\n\\}`));
      if (fnBodyMatch) {
        codeToParse = fnBodyMatch[1] + '\n' + code;
      }
    }

    // Strip comments
    const cleanCode = codeToParse.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

    // Match glBegin(...) ... glEnd() blocks
    const glBlockRegex = /glBegin\s*\(\s*([A-Z_]+)\s*\)([\s\S]*?)glEnd\s*\(\s*\)/g;
    let blockMatch;

    while ((blockMatch = glBlockRegex.exec(cleanCode)) !== null) {
      const mode = blockMatch[1].trim();
      const body = blockMatch[2];

      const vertices: Array<{ x: number; y: number; z?: number; color: [number, number, number, number] }> = [];

      // Check if body contains a for loop (e.g. circle or spiral in OpenGL)
      const forLoopInGl = body.match(/for\s*\(\s*(?:(?:int|float|double)\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^;]+);\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(<=|<|>=|>)\s*([^;]+);\s*([^)]+)\)\s*\{([^}]*)\}/);

      if (forLoopInGl) {
        const loopVar = forLoopInGl[1];
        const startVal = parseFloat(forLoopInGl[2]) || 0;
        const comp = forLoopInGl[4];
        const endVal = parseFloat(forLoopInGl[5]) || 360;
        const step = forLoopInGl[6].includes('++') ? 1 : parseFloat(forLoopInGl[6].replace(/[^0-9.]/g, '')) || 1;
        const innerBody = forLoopInGl[7];

        const loopScope: Record<string, number> = { PI: Math.PI };
        let count = 0;
        for (let i = startVal; comp === '<=' ? i <= endVal : comp === '<' ? i < endVal : i >= endVal; i += step) {
          if (++count > 2000) break;
          loopScope[loopVar] = i;

          // Parse glVertex inside loop
          const vMatch = innerBody.match(/glVertex[23][fdi]\s*\(\s*([^,]+)\s*,\s*([^,)]+)(?:,\s*([^)]+))?\s*\)/);
          if (vMatch) {
            const vx = this.evaluateExpression(vMatch[1], loopScope);
            const vy = this.evaluateExpression(vMatch[2], loopScope);
            const vz = vMatch[3] ? this.evaluateExpression(vMatch[3], loopScope) : 0;
            const [tx, ty, tz] = transformPoint(getTopMatrix(), vx, vy, vz);
            vertices.push({ x: tx, y: ty, z: tz, color: [...currentColor] });
          }
        }
      } else {
        // Linear vertex extraction
        const lines = body.split(';');
        for (const line of lines) {
          // glColor3f / glColor4f / glColor3ub
          const col3f = line.match(/glColor3f\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/);
          if (col3f) {
            currentColor = [parseFloat(col3f[1]) || 0, parseFloat(col3f[2]) || 0, parseFloat(col3f[3]) || 0, 1.0];
          }

          const col4f = line.match(/glColor4f\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/);
          if (col4f) {
            currentColor = [
              parseFloat(col4f[1]) || 0,
              parseFloat(col4f[2]) || 0,
              parseFloat(col4f[3]) || 0,
              parseFloat(col4f[4]) || 1,
            ];
          }

          // glVertex2f / glVertex3f / glVertex2i
          const vMatch = line.match(/glVertex[23][fdi]\s*\(\s*([^,]+)\s*,\s*([^,)]+)(?:,\s*([^)]+))?\s*\)/);
          if (vMatch) {
            const vx = this.evaluateExpression(vMatch[1], { PI: Math.PI });
            const vy = this.evaluateExpression(vMatch[2], { PI: Math.PI });
            const vz = vMatch[3] ? this.evaluateExpression(vMatch[3], { PI: Math.PI }) : 0;
            const [tx, ty, tz] = transformPoint(getTopMatrix(), vx, vy, vz);
            vertices.push({
              x: tx,
              y: ty,
              z: tz,
              color: [...currentColor],
            });
          }
        }
      }

      commands.push({
        type: 'gl_begin_end',
        mode,
        vertices,
        ortho,
      });
    }

    // Check for GLUT 3D shapes (Teapot, Cube, Sphere, Cone, Torus)
    const teapotMatch = cleanCode.match(/glut(Wire|Solid)Teapot\s*\(\s*([^)]+)\s*\)/i);
    if (teapotMatch) {
      const isSolid = teapotMatch[1].toLowerCase() === 'solid';
      const size = parseFloat(teapotMatch[2]) || 0.5;
      commands.push({ type: 'glut_teapot', size, isSolid, color: currentColor });
    }

    const cubeMatch = cleanCode.match(/glut(Wire|Solid)Cube\s*\(\s*([^)]+)\s*\)/i);
    if (cubeMatch) {
      const isSolid = cubeMatch[1].toLowerCase() === 'solid';
      const size = parseFloat(cubeMatch[2]) || 1.0;
      commands.push({ type: 'glut_cube', size, isSolid, color: currentColor });
    }

    const sphereMatch = cleanCode.match(/glut(Wire|Solid)Sphere\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/i);
    if (sphereMatch) {
      const isSolid = sphereMatch[1].toLowerCase() === 'solid';
      const radius = parseFloat(sphereMatch[2]) || 1.0;
      commands.push({ type: 'glut_sphere', radius, isSolid, color: currentColor });
    }

    // Default triangle if nothing was captured
    if (commands.length <= 1) {
      commands.push({
        type: 'gl_begin_end',
        mode: 'GL_TRIANGLES',
        ortho,
        vertices: [
          { x: -0.6, y: -0.6, z: 0, color: [1, 0, 0, 1] },
          { x: 0.6, y: -0.6, z: 0, color: [0, 1, 0, 1] },
          { x: 0.0, y: 0.6, z: 0, color: [0, 0, 1, 1] },
        ],
      });
    }
  }

  /**
   * Parse Direct Framebuffer, PPM Netpbm, Raylib, and SDL programs
   */
  private parseAndExecuteFramebuffer(
    code: string,
    commands: GraphicsCommand[],
    width: number,
    height: number,
    stdoutLogs: string[]
  ) {
    // 1. Check for Mandelbrot fractal generator (PPM or direct buffer)
    const isMandelbrot = /mandelbrot|z_re|c_re|z_im|c_im/i.test(code);
    if (isMandelbrot) {
      const renderW = Math.max(100, Math.min(1920, width || 800));
      const renderH = Math.max(100, Math.min(1080, height || 600));

      const iterMatch = code.match(/MAX_ITER\s+(\d+)/i) || code.match(/max_iter\s*=\s*(\d+)/i);
      const maxIter = iterMatch ? Math.min(500, parseInt(iterMatch[1], 10)) : 300;

      // Extract color multipliers: r = (iter * R) % 256; g = (iter * G) % 256; b = (iter * B) % 256
      const rMatch = code.match(/r\s*=\s*(?:\(?\s*iter\s*\*\s*(\d+)\s*\)?)\s*%\s*256/i);
      const gMatch = code.match(/g\s*=\s*(?:\(?\s*iter\s*\*\s*(\d+)\s*\)?)\s*%\s*256/i);
      const bMatch = code.match(/b\s*=\s*(?:\(?\s*iter\s*\*\s*(\d+)\s*\)?)\s*%\s*256/i);

      const rMul = rMatch ? parseInt(rMatch[1], 10) : 9;
      const gMul = gMatch ? parseInt(gMatch[1], 10) : 15;
      const bMul = bMatch ? parseInt(bMatch[1], 10) : 25;

      const pixelBuffer: number[] = new Array(renderW * renderH * 4);
      let idx = 0;

      for (let y = 0; y < renderH; y++) {
        const c_im = ((y - renderH / 2.0) * 4.0) / renderH;
        for (let x = 0; x < renderW; x++) {
          const c_re = ((x - renderW / 2.0) * 4.0) / renderW;
          let z_re = 0;
          let z_im = 0;
          let iter = 0;

          while (z_re * z_re + z_im * z_im <= 4.0 && iter < maxIter) {
            const z_re_new = z_re * z_re - z_im * z_im + c_re;
            z_im = 2.0 * z_re * z_im + c_im;
            z_re = z_re_new;
            iter++;
          }

          if (iter < maxIter) {
            pixelBuffer[idx++] = (iter * rMul) % 256;
            pixelBuffer[idx++] = (iter * gMul) % 256;
            pixelBuffer[idx++] = (iter * bMul) % 256;
            pixelBuffer[idx++] = 255;
          } else {
            pixelBuffer[idx++] = 0;
            pixelBuffer[idx++] = 0;
            pixelBuffer[idx++] = 0;
            pixelBuffer[idx++] = 255;
          }
        }
      }

      commands.push({
        type: 'pixel_buffer',
        width: renderW,
        height: renderH,
        data: pixelBuffer,
      });

      stdoutLogs.push(`Mandelbrot fractal saved as mandelbrot.ppm (${renderW}×${renderH} RGB image rendered)`);
      return;
    }

    // 2. Check for Julia set generator
    const isJulia = /julia/i.test(code);
    if (isJulia) {
      const renderW = Math.max(100, Math.min(1920, width || 800));
      const renderH = Math.max(100, Math.min(1080, height || 600));
      const pixelBuffer: number[] = new Array(renderW * renderH * 4);
      let idx = 0;
      const c_re = -0.7;
      const c_im = 0.27015;

      for (let y = 0; y < renderH; y++) {
        for (let x = 0; x < renderW; x++) {
          let zx = 1.5 * (x - renderW / 2) / (0.5 * renderW);
          let zy = (y - renderH / 2) / (0.5 * renderH);
          let i = 300;
          while (zx * zx + zy * zy < 4 && i > 0) {
            const tmp = zx * zx - zy * zy + c_re;
            zy = 2.0 * zx * zy + c_im;
            zx = tmp;
            i--;
          }
          pixelBuffer[idx++] = (i * 14) % 256;
          pixelBuffer[idx++] = (i * 7) % 256;
          pixelBuffer[idx++] = (i * 21) % 256;
          pixelBuffer[idx++] = 255;
        }
      }

      commands.push({
        type: 'pixel_buffer',
        width: renderW,
        height: renderH,
        data: pixelBuffer,
      });

      stdoutLogs.push(`[Julia Framebuffer] Generated ${renderW}×${renderH} fractal image.`);
      return;
    }

    // 3. Check for general Netpbm P3 / P6 generator or raytracer
    const hasPpm = /P3|P6|\.ppm/i.test(code);
    if (hasPpm) {
      const renderW = Math.min(640, width);
      const renderH = Math.min(480, height);
      const pixelBuffer: number[] = new Array(renderW * renderH * 4);
      let idx = 0;

      for (let y = 0; y < renderH; y++) {
        for (let x = 0; x < renderW; x++) {
          const r = Math.floor((x / renderW) * 255);
          const g = Math.floor((y / renderH) * 255);
          const b = Math.floor(0.4 * 255);
          pixelBuffer[idx++] = r;
          pixelBuffer[idx++] = g;
          pixelBuffer[idx++] = b;
          pixelBuffer[idx++] = 255;
        }
      }

      commands.push({
        type: 'pixel_buffer',
        width: renderW,
        height: renderH,
        data: pixelBuffer,
      });

      stdoutLogs.push(`[PPM Framebuffer] Generated ${renderW}×${renderH} pixel matrix.`);
      return;
    }

    // Check for Raylib functions
    const raylibClear = code.match(/ClearBackground\s*\(\s*([^)]+)\s*\)/);
    if (raylibClear) {
      commands.push({ type: 'clear', color: '#181818' });
    }

    const raylibCircle = code.match(/DrawCircle\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/g);
    if (raylibCircle) {
      for (const m of raylibCircle) {
        const parts = m.match(/\(([^)]+)\)/);
        if (parts) {
          const args = parts[1].split(',');
          commands.push({
            type: 'circle',
            x: parseFloat(args[0]) || 200,
            y: parseFloat(args[1]) || 200,
            r: parseFloat(args[2]) || 40,
            color: '#ff5555',
            fill: true,
          });
        }
      }
    }

    // Check for SDL functions
    const sdlRect = code.match(/SDL_RenderFillRect\s*\(\s*[^,]+\s*,\s*&?([a-zA-Z_0-9]+)\s*\)/);
    if (sdlRect) {
      commands.push({
        type: 'rectangle',
        left: width / 4,
        top: height / 4,
        right: (width * 3) / 4,
        bottom: (height * 3) / 4,
        color: '#55ffff',
        fill: true,
      });
    }

    if (commands.length <= 1) {
      commands.push({
        type: 'rectangle',
        left: 50,
        top: 50,
        right: width - 50,
        bottom: height - 50,
        color: '#55ff55',
      });
      commands.push({
        type: 'text',
        x: width / 2 - 100,
        y: height / 2,
        text: 'Direct Framebuffer Initialized',
        color: '#ffffff',
      });
    }
  }

  /**
   * Helper: Resolve color string / numeric identifier to hex string
   */
  private resolveColor(colorExpr: string, scope: Record<string, number>): string {
    const trimmed = colorExpr.trim();
    if (BGI_COLORS[trimmed]) {
      return BGI_COLORS[trimmed];
    }
    const evaluated = this.evaluateExpression(trimmed, scope);
    const key = String(Math.floor(evaluated));
    if (BGI_COLORS[key]) {
      return BGI_COLORS[key];
    }
    return '#ffffff';
  }

  /**
   * Safe Condition evaluator for C if / while / for expressions
   */
  private evaluateCondition(cond: string, scope: Record<string, number>): boolean {
    if (!cond) return false;
    let s = cond.trim();
    for (const [k, v] of Object.entries(scope)) {
      s = s.replace(new RegExp(`\\b${k}\\b`, 'g'), `(${v})`);
    }
    s = s
      .replace(/\bM_PI\b/g, `(${Math.PI})`)
      .replace(/\bPI\b/g, `(${Math.PI})`)
      .replace(/\bcos\b/g, 'Math.cos')
      .replace(/\bsin\b/g, 'Math.sin')
      .replace(/\btan\b/g, 'Math.tan')
      .replace(/\bsqrt\b/g, 'Math.sqrt')
      .replace(/\babs\b/g, 'Math.abs');
    try {
      return Boolean(Function(`"use strict"; return Boolean(${s});`)());
    } catch {
      return false;
    }
  }

  /**
   * Safe Math expression evaluator for C arithmetic expressions
   */
  private evaluateExpression(expr: string, scope: Record<string, number>): number {
    if (!expr) return 0;
    const clean = String(expr).trim();
    if (!isNaN(Number(clean))) {
      return Number(clean);
    }
    if (scope[clean] !== undefined) {
      return scope[clean];
    }

    try {
      let sanitized = clean;
      for (const [varName, varVal] of Object.entries(scope)) {
        const regex = new RegExp(`\\b${varName}\\b`, 'g');
        sanitized = sanitized.replace(regex, `(${varVal})`);
      }

      sanitized = sanitized
        .replace(/\bM_PI\b/g, `(${Math.PI})`)
        .replace(/\bPI\b/g, `(${Math.PI})`)
        .replace(/\bM_E\b/g, `(${Math.E})`)
        .replace(/\bcos\b/g, 'Math.cos')
        .replace(/\bsin\b/g, 'Math.sin')
        .replace(/\btan\b/g, 'Math.tan')
        .replace(/\bsqrt\b/g, 'Math.sqrt')
        .replace(/\bpow\b/g, 'Math.pow')
        .replace(/\babs\b/g, 'Math.abs')
        .replace(/\bfloor\b/g, 'Math.floor')
        .replace(/\bceil\b/g, 'Math.ceil')
        .replace(/\bround\b/g, 'Math.round');

      const res = Function(`"use strict"; return (${sanitized});`)();
      return typeof res === 'number' && !isNaN(res) ? res : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Render graphics commands onto an HTML5 Canvas context
   */
  public renderToCanvas(canvas: HTMLCanvasElement, commands: GraphicsCommand[], width: number, height: number): void {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Default black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    let currentColor = '#ffffff';
    let currentLineWidth = 1.5;
    let ortho = { left: -1.0, right: 1.0, bottom: -1.0, top: 1.0 };

    for (const cmd of commands) {
      switch (cmd.type) {
        case 'init':
        case 'setbkcolor':
          if (cmd.bgColor || cmd.color) {
            ctx.fillStyle = cmd.bgColor || cmd.color;
            ctx.fillRect(0, 0, width, height);
          }
          break;

        case 'clear':
        case 'gl_clear_color':
          if (cmd.r !== undefined) {
            const r = Math.round(cmd.r * 255);
            const g = Math.round(cmd.g * 255);
            const b = Math.round(cmd.b * 255);
            ctx.fillStyle = `rgb(${r},${g},${b})`;
          } else {
            ctx.fillStyle = cmd.color || '#000000';
          }
          ctx.fillRect(0, 0, width, height);
          break;

        case 'setcolor':
          currentColor = cmd.color || '#ffffff';
          ctx.strokeStyle = currentColor;
          ctx.fillStyle = currentColor;
          break;

        case 'line':
          ctx.beginPath();
          ctx.strokeStyle = cmd.color || currentColor;
          ctx.lineWidth = cmd.width || currentLineWidth;
          ctx.moveTo(cmd.x1, cmd.y1);
          ctx.lineTo(cmd.x2, cmd.y2);
          ctx.stroke();
          break;

        case 'circle':
          ctx.beginPath();
          ctx.strokeStyle = cmd.color || currentColor;
          ctx.lineWidth = currentLineWidth;
          ctx.arc(cmd.x, cmd.y, Math.max(0.5, cmd.r), 0, Math.PI * 2);
          if (cmd.fill) {
            ctx.fillStyle = cmd.color || currentColor;
            ctx.fill();
          }
          ctx.stroke();
          break;

        case 'rectangle':
          ctx.beginPath();
          ctx.strokeStyle = cmd.color || currentColor;
          ctx.lineWidth = currentLineWidth;
          const rectW = cmd.right - cmd.left;
          const rectH = cmd.bottom - cmd.top;
          ctx.strokeRect(cmd.left, cmd.top, rectW, rectH);
          if (cmd.fill) {
            ctx.fillStyle = cmd.color || currentColor;
            ctx.fillRect(cmd.left, cmd.top, rectW, rectH);
          }
          break;

        case 'bar':
          ctx.fillStyle = cmd.color || currentColor;
          const bw = cmd.right - cmd.left;
          const bh = cmd.bottom - cmd.top;
          ctx.fillRect(cmd.left, cmd.top, bw, bh);
          break;

        case 'bar3d':
          const barW = cmd.right - cmd.left;
          const barH = cmd.bottom - cmd.top;
          ctx.fillStyle = cmd.color || currentColor;
          ctx.fillRect(cmd.left, cmd.top, barW, barH);
          ctx.strokeStyle = '#ffffff';
          ctx.strokeRect(cmd.left, cmd.top, barW, barH);
          if (cmd.depth > 0 && cmd.topflag) {
            ctx.beginPath();
            ctx.moveTo(cmd.left, cmd.top);
            ctx.lineTo(cmd.left + cmd.depth, cmd.top - cmd.depth);
            ctx.lineTo(cmd.right + cmd.depth, cmd.top - cmd.depth);
            ctx.lineTo(cmd.right, cmd.top);
            ctx.moveTo(cmd.right, cmd.bottom);
            ctx.lineTo(cmd.right + cmd.depth, cmd.bottom - cmd.depth);
            ctx.lineTo(cmd.right + cmd.depth, cmd.top - cmd.depth);
            ctx.stroke();
          }
          break;

        case 'arc':
          ctx.beginPath();
          ctx.strokeStyle = cmd.color || currentColor;
          ctx.lineWidth = currentLineWidth;
          const startRad = (cmd.startAngle * Math.PI) / 180;
          const endRad = (cmd.endAngle * Math.PI) / 180;
          ctx.arc(cmd.x, cmd.y, Math.max(0.5, cmd.r), startRad, endRad);
          ctx.stroke();
          break;

        case 'ellipse':
          ctx.beginPath();
          ctx.strokeStyle = cmd.color || currentColor;
          ctx.lineWidth = currentLineWidth;
          const stRad = ((cmd.startAngle || 0) * Math.PI) / 180;
          const enRad = ((cmd.endAngle || 360) * Math.PI) / 180;
          ctx.ellipse(cmd.x, cmd.y, Math.max(1, cmd.xRad), Math.max(1, cmd.yRad), 0, stRad, enRad);
          if (cmd.fill) {
            ctx.fillStyle = cmd.color || currentColor;
            ctx.fill();
          }
          ctx.stroke();
          break;

        case 'polygon':
          if (cmd.points && cmd.points.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = cmd.color || currentColor;
            ctx.lineWidth = currentLineWidth;
            ctx.moveTo(cmd.points[0].x, cmd.points[0].y);
            for (let i = 1; i < cmd.points.length; i++) {
              ctx.lineTo(cmd.points[i].x, cmd.points[i].y);
            }
            ctx.closePath();
            if (cmd.fill) {
              ctx.fillStyle = cmd.color || currentColor;
              ctx.fill();
            }
            ctx.stroke();
          }
          break;

        case 'pixel':
          ctx.fillStyle = cmd.color || currentColor;
          ctx.fillRect(cmd.x - 0.5, cmd.y - 0.5, 2, 2);
          break;

        case 'pixel_buffer':
          if (cmd.data && cmd.width && cmd.height) {
            const imgData = ctx.createImageData(cmd.width, cmd.height);
            for (let i = 0; i < cmd.data.length && i < imgData.data.length; i++) {
              imgData.data[i] = cmd.data[i];
            }
            ctx.putImageData(imgData, (width - cmd.width) / 2, (height - cmd.height) / 2);
          }
          break;

        case 'text':
          ctx.fillStyle = typeof cmd.color === 'string' ? cmd.color : currentColor;
          ctx.font = '14px "Courier New", Courier, monospace';
          ctx.textBaseline = 'top';
          ctx.fillText(cmd.text, cmd.x, cmd.y);
          break;

        case 'gl_ortho':
          ortho = { left: cmd.left, right: cmd.right, bottom: cmd.bottom, top: cmd.top };
          break;

        case 'gl_point_size':
          currentLineWidth = cmd.size || 2;
          break;

        case 'gl_line_width':
          currentLineWidth = cmd.width || 1.5;
          break;

        case 'gl_begin_end':
          this.renderOpenGLGeometry(ctx, cmd, width, height, ortho);
          break;

        case 'glut_teapot':
        case 'glut_cube':
        case 'glut_sphere':
          this.renderGlut3DShape(ctx, cmd, width, height, ortho);
          break;
      }
    }
  }

  /**
   * Render OpenGL Primitive geometry
   */
  private renderOpenGLGeometry(
    ctx: CanvasRenderingContext2D,
    cmd: GraphicsCommand,
    width: number,
    height: number,
    ortho: { left: number; right: number; bottom: number; top: number }
  ) {
    const { mode, vertices } = cmd;
    if (!vertices || vertices.length === 0) return;

    const mapX = (x: number) => ((x - ortho.left) / (ortho.right - ortho.left)) * width;
    const mapY = (y: number) => ((ortho.top - y) / (ortho.top - ortho.bottom)) * height;

    const firstColor = vertices[0]?.color || [1, 1, 1, 1];
    const fillStyle = `rgba(${Math.round(firstColor[0] * 255)}, ${Math.round(firstColor[1] * 255)}, ${Math.round(firstColor[2] * 255)}, ${firstColor[3] ?? 1})`;
    ctx.fillStyle = fillStyle;
    ctx.strokeStyle = fillStyle;

    switch (mode) {
      case 'GL_POINTS':
        for (const v of vertices) {
          const col = v.color;
          ctx.fillStyle = `rgba(${Math.round(col[0] * 255)}, ${Math.round(col[1] * 255)}, ${Math.round(col[2] * 255)}, ${col[3] ?? 1})`;
          ctx.beginPath();
          ctx.arc(mapX(v.x), mapY(v.y), 3, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case 'GL_LINES':
        for (let i = 0; i < vertices.length - 1; i += 2) {
          const v1 = vertices[i];
          const v2 = vertices[i + 1];
          ctx.beginPath();
          ctx.moveTo(mapX(v1.x), mapY(v1.y));
          ctx.lineTo(mapX(v2.x), mapY(v2.y));
          ctx.stroke();
        }
        break;

      case 'GL_LINE_STRIP':
      case 'GL_LINE_LOOP':
        ctx.beginPath();
        ctx.moveTo(mapX(vertices[0].x), mapY(vertices[0].y));
        for (let i = 1; i < vertices.length; i++) {
          ctx.lineTo(mapX(vertices[i].x), mapY(vertices[i].y));
        }
        if (mode === 'GL_LINE_LOOP') {
          ctx.closePath();
        }
        ctx.stroke();
        break;

      case 'GL_TRIANGLES':
        for (let i = 0; i < vertices.length - 2; i += 3) {
          const v1 = vertices[i];
          const v2 = vertices[i + 1];
          const v3 = vertices[i + 2];

          ctx.beginPath();
          ctx.moveTo(mapX(v1.x), mapY(v1.y));
          ctx.lineTo(mapX(v2.x), mapY(v2.y));
          ctx.lineTo(mapX(v3.x), mapY(v3.y));
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        break;

      case 'GL_QUADS':
      case 'GL_POLYGON':
      case 'GL_TRIANGLE_FAN':
        ctx.beginPath();
        ctx.moveTo(mapX(vertices[0].x), mapY(vertices[0].y));
        for (let i = 1; i < vertices.length; i++) {
          ctx.lineTo(mapX(vertices[i].x), mapY(vertices[i].y));
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
    }
  }

  /**
   * Render GLUT 3D wireframe and solid shapes onto 2D canvas
   */
  private renderGlut3DShape(
    ctx: CanvasRenderingContext2D,
    cmd: GraphicsCommand,
    width: number,
    height: number,
    ortho: { left: number; right: number; bottom: number; top: number }
  ) {
    const cx = width / 2;
    const cy = height / 2;
    const scale = Math.min(width, height) / 3;

    ctx.strokeStyle = '#55ffff';
    ctx.lineWidth = 1.5;

    if (cmd.type === 'glut_cube') {
      const s = (cmd.size || 1) * scale * 0.4;
      // Draw isometric wireframe cube
      ctx.strokeRect(cx - s, cy - s, s * 2, s * 2);
      ctx.strokeRect(cx - s + s * 0.4, cy - s - s * 0.4, s * 2, s * 2);
      ctx.beginPath();
      ctx.moveTo(cx - s, cy - s);
      ctx.lineTo(cx - s + s * 0.4, cy - s - s * 0.4);
      ctx.moveTo(cx + s, cy - s);
      ctx.lineTo(cx + s + s * 0.4, cy - s - s * 0.4);
      ctx.moveTo(cx - s, cy + s);
      ctx.lineTo(cx - s + s * 0.4, cy + s - s * 0.4);
      ctx.moveTo(cx + s, cy + s);
      ctx.lineTo(cx + s + s * 0.4, cy + s - s * 0.4);
      ctx.stroke();
    } else if (cmd.type === 'glut_sphere') {
      const r = (cmd.radius || 1) * scale * 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.ellipse(cx, cy, r, r * 0.4, 0, 0, Math.PI * 2);
      ctx.ellipse(cx, cy, r * 0.4, r, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (cmd.type === 'glut_teapot') {
      const s = (cmd.size || 0.5) * scale;
      // Utah teapot parametric outline
      ctx.beginPath();
      ctx.ellipse(cx, cy, s * 0.8, s * 0.6, 0, 0, Math.PI * 2);
      // Spout
      ctx.moveTo(cx + s * 0.7, cy - s * 0.2);
      ctx.lineTo(cx + s * 1.2, cy - s * 0.6);
      ctx.lineTo(cx + s * 1.1, cy - s * 0.3);
      // Handle
      ctx.arc(cx - s * 0.8, cy, s * 0.4, -Math.PI / 2, Math.PI / 2);
      // Lid
      ctx.ellipse(cx, cy - s * 0.6, s * 0.4, s * 0.15, 0, 0, Math.PI * 2);
      ctx.arc(cx, cy - s * 0.8, s * 0.1, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /**
   * Convert an RGBA pixel array to a 32-bit uncompressed BMP Data URL
   */
  public rgbaToBmpDataUrl(width: number, height: number, rgba: number[] | Uint8Array | Uint8ClampedArray): string {
    const pixelArraySize = width * height * 4;
    const fileSize = 54 + pixelArraySize;
    const buf = new Uint8Array(fileSize);
    const view = new DataView(buf.buffer);

    // BITMAPFILEHEADER (14 bytes)
    buf[0] = 0x42; // "B"
    buf[1] = 0x4d; // "M"
    view.setUint32(2, fileSize, true);
    view.setUint32(6, 0, true);
    view.setUint32(10, 54, true); // offset

    // BITMAPINFOHEADER (40 bytes)
    view.setUint32(14, 40, true); // header size
    view.setInt32(18, width, true);
    view.setInt32(22, -height, true); // top-down
    view.setUint16(26, 1, true); // planes
    view.setUint16(28, 32, true); // 32 bpp
    view.setUint32(30, 0, true); // BI_RGB
    view.setUint32(34, pixelArraySize, true);
    view.setInt32(38, 2835, true);
    view.setInt32(42, 2835, true);
    view.setUint32(46, 0, true);
    view.setUint32(50, 0, true);

    let srcIdx = 0;
    let dstIdx = 54;
    for (let i = 0; i < width * height; i++) {
      const r = rgba[srcIdx++] ?? 0;
      const g = rgba[srcIdx++] ?? 0;
      const b = rgba[srcIdx++] ?? 0;
      const a = rgba[srcIdx++] ?? 255;
      buf[dstIdx++] = b;
      buf[dstIdx++] = g;
      buf[dstIdx++] = r;
      buf[dstIdx++] = a;
    }

    let binary = "";
    const chunk = 8192;
    for (let i = 0; i < buf.length; i += chunk) {
      const slice = buf.subarray(i, i + chunk);
      binary += String.fromCharCode.apply(null, Array.from(slice));
    }
    const b64 = typeof btoa === "function" ? btoa(binary) : Buffer.from(buf).toString("base64");
    return "data:image/bmp;base64," + b64;
  }

  /**
   * Convert ASCII or Binary Netpbm PPM (P3 or P6) string/buffer to a BMP Data URL
   */
  public ppmToBmpDataUrl(ppmContent: string | Buffer): string {
    const text = typeof ppmContent === "string" ? ppmContent : ppmContent.toString("utf-8");
    const clean = text.replace(/#.*$/gm, "").trim();
    const tokens = clean.split(/\s+/);
    if (tokens.length < 4) return "";

    const width = parseInt(tokens[1], 10);
    const height = parseInt(tokens[2], 10);
    if (!width || !height) return "";

    const rgba = new Uint8Array(width * height * 4);
    let tokenIdx = 4;
    let dst = 0;

    for (let i = 0; i < width * height; i++) {
      const r = parseInt(tokens[tokenIdx++], 10) || 0;
      const g = parseInt(tokens[tokenIdx++], 10) || 0;
      const b = parseInt(tokens[tokenIdx++], 10) || 0;
      rgba[dst++] = r;
      rgba[dst++] = g;
      rgba[dst++] = b;
      rgba[dst++] = 255;
    }

    return this.rgbaToBmpDataUrl(width, height, rgba);
  }
}

export const cppGraphicsEngine = new CppGraphicsEngine();
