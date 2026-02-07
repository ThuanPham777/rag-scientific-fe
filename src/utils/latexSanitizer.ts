// src/utils/latexSanitizer.ts
// Utility to sanitize and fix malformed LaTeX in AI-generated content

/**
 * Sanitize LaTeX content to prevent rendering failures
 * Handles common AI-generated LaTeX issues:
 * - Unbalanced $ and $$ delimiters
 * - Mixed delimiter styles
 * - Invalid escape sequences
 * - Common syntax errors
 */
export function sanitizeLatex(content: string): string {
  if (!content) return content;

  let result = content;

  // Step 1: Normalize line endings
  result = result.replace(/\r\n/g, '\n');

  // Step 2: Fix common LaTeX command mistakes
  result = fixCommonLatexMistakes(result);

  // Step 3: Balance delimiters
  result = balanceDelimiters(result);

  // Step 4: Escape problematic characters in non-math contexts
  result = escapeProblematicCharacters(result);

  return result;
}

/**
 * Fix common LaTeX command mistakes
 */
function fixCommonLatexMistakes(content: string): string {
  let result = content;

  // Fix missing backslashes for common commands (only in math context)
  // These patterns look for common math functions without backslash
  const mathCommands = [
    'sin',
    'cos',
    'tan',
    'log',
    'ln',
    'exp',
    'sqrt',
    'sum',
    'prod',
    'int',
    'lim',
    'max',
    'min',
    'sup',
    'inf',
    'arg',
    'det',
    'dim',
    'gcd',
    'hom',
    'ker',
    'deg',
    'Pr',
    'cot',
    'sec',
    'csc',
    'arcsin',
    'arccos',
    'arctan',
    'sinh',
    'cosh',
    'tanh',
    'alpha',
    'beta',
    'gamma',
    'delta',
    'epsilon',
    'zeta',
    'eta',
    'theta',
    'iota',
    'kappa',
    'lambda',
    'mu',
    'nu',
    'xi',
    'pi',
    'rho',
    'sigma',
    'tau',
    'upsilon',
    'phi',
    'chi',
    'psi',
    'omega',
    'Gamma',
    'Delta',
    'Theta',
    'Lambda',
    'Xi',
    'Pi',
    'Sigma',
    'Upsilon',
    'Phi',
    'Psi',
    'Omega',
    'infty',
    'partial',
    'nabla',
    'times',
    'cdot',
    'div',
    'pm',
    'mp',
    'leq',
    'geq',
    'neq',
    'approx',
    'equiv',
    'subset',
    'supset',
    'in',
    'notin',
    'cup',
    'cap',
    'forall',
    'exists',
    'neg',
    'land',
    'lor',
    'Rightarrow',
    'Leftarrow',
    'rightarrow',
    'leftarrow',
    'leftrightarrow',
    'Leftrightarrow',
  ];

  // Only fix inside math delimiters
  result = processInsideMath(result, (mathContent) => {
    let fixed = mathContent;
    for (const cmd of mathCommands) {
      // Match word that isn't already preceded by backslash
      const regex = new RegExp(`(?<!\\\\)\\b(${cmd})\\b`, 'g');
      fixed = fixed.replace(regex, '\\$1');
    }
    return fixed;
  });

  // Fix double backslashes that shouldn't be there (except for newlines)
  result = result.replace(/\\\\([a-zA-Z])/g, '\\$1');

  // Fix common typos
  result = result.replace(
    /\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g,
    '\\frac{$1}{$2}',
  );

  return result;
}

/**
 * Process content inside math delimiters only
 */
function processInsideMath(
  content: string,
  processor: (math: string) => string,
): string {
  let result = '';
  let i = 0;

  while (i < content.length) {
    // Check for $$ (block math)
    if (content[i] === '$' && content[i + 1] === '$') {
      const start = i + 2;
      let end = content.indexOf('$$', start);
      if (end === -1) {
        // Unclosed - just copy rest
        result += content.slice(i);
        break;
      }
      const mathContent = content.slice(start, end);
      result += '$$' + processor(mathContent) + '$$';
      i = end + 2;
      continue;
    }

    // Check for single $ (inline math)
    if (content[i] === '$') {
      const start = i + 1;
      let end = findClosingDollar(content, start);
      if (end === -1) {
        // Unclosed - just copy rest
        result += content.slice(i);
        break;
      }
      const mathContent = content.slice(start, end);
      result += '$' + processor(mathContent) + '$';
      i = end + 1;
      continue;
    }

    // Check for \[ (block math)
    if (content[i] === '\\' && content[i + 1] === '[') {
      const start = i + 2;
      let end = content.indexOf('\\]', start);
      if (end === -1) {
        result += content.slice(i);
        break;
      }
      const mathContent = content.slice(start, end);
      result += '\\[' + processor(mathContent) + '\\]';
      i = end + 2;
      continue;
    }

    // Check for \( (inline math)
    if (content[i] === '\\' && content[i + 1] === '(') {
      const start = i + 2;
      let end = content.indexOf('\\)', start);
      if (end === -1) {
        result += content.slice(i);
        break;
      }
      const mathContent = content.slice(start, end);
      result += '\\(' + processor(mathContent) + '\\)';
      i = end + 2;
      continue;
    }

    result += content[i];
    i++;
  }

  return result;
}

/**
 * Find closing $ for inline math, avoiding escaped \$
 */
function findClosingDollar(content: string, start: number): number {
  for (let i = start; i < content.length; i++) {
    if (content[i] === '$' && content[i - 1] !== '\\') {
      // Make sure it's not $$
      if (content[i + 1] !== '$') {
        return i;
      }
    }
  }
  return -1;
}

/**
 * Balance math delimiters
 */
function balanceDelimiters(content: string): string {
  let result = content;

  // Handle $$ blocks first
  result = balanceBlockMath(result);

  // Then handle $ inline
  result = balanceInlineMath(result);

  // Handle \[ \] blocks
  result = balanceBracketMath(result, '\\[', '\\]');

  // Handle \( \) inline
  result = balanceBracketMath(result, '\\(', '\\)');

  return result;
}

/**
 * Balance $$ block math delimiters
 */
function balanceBlockMath(content: string): string {
  const parts = content.split('$$');

  if (parts.length === 1) return content;

  // If odd number of parts, we have balanced $$
  // If even number of parts, last one is unclosed
  if (parts.length % 2 === 0) {
    // Unclosed $$ - close it at end of line or content
    const lastPart = parts[parts.length - 1];
    const newlineIndex = lastPart.indexOf('\n\n');
    if (newlineIndex !== -1) {
      parts[parts.length - 1] =
        lastPart.slice(0, newlineIndex) + '$$' + lastPart.slice(newlineIndex);
    } else {
      parts[parts.length - 1] = lastPart + '$$';
    }
  }

  return parts.join('$$');
}

/**
 * Balance $ inline math delimiters
 */
function balanceInlineMath(content: string): string {
  // First, replace $$ temporarily to avoid confusion
  const placeholder = '\u0000BLOCK_MATH\u0000';
  const blockMathRegex = /\$\$[\s\S]*?\$\$/g;
  const blockMatches: string[] = [];

  let temp = content.replace(blockMathRegex, (match) => {
    blockMatches.push(match);
    return placeholder;
  });

  // Now handle single $
  let result = '';
  let inMath = false;
  let mathStart = -1;
  let i = 0;

  while (i < temp.length) {
    if (temp[i] === '$' && temp[i - 1] !== '\\') {
      if (temp.slice(i, i + placeholder.length) === placeholder) {
        // This is a placeholder, skip
        result += placeholder;
        i += placeholder.length;
        continue;
      }

      if (!inMath) {
        inMath = true;
        mathStart = i;
        result += '$';
      } else {
        inMath = false;
        result += '$';
      }
      i++;
    } else if (inMath && temp[i] === '\n' && temp[i + 1] === '\n') {
      // Double newline inside inline math - close it
      result += '$';
      inMath = false;
      result += temp[i];
      i++;
    } else {
      result += temp[i];
      i++;
    }
  }

  // If still in math at end, close it
  if (inMath) {
    result += '$';
  }

  // Restore block math
  let blockIndex = 0;
  result = result.replace(
    new RegExp(placeholder.replace(/\u0000/g, '\\u0000'), 'g'),
    () => {
      return blockMatches[blockIndex++] || '';
    },
  );

  return result;
}

/**
 * Balance bracket-style math delimiters \[ \] or \( \)
 */
function balanceBracketMath(
  content: string,
  open: string,
  close: string,
): string {
  let result = '';
  let i = 0;
  let inMath = false;

  while (i < content.length) {
    // Check for open delimiter
    if (content.slice(i, i + open.length) === open) {
      if (inMath) {
        // Already in math, close previous first
        result += close;
      }
      inMath = true;
      result += open;
      i += open.length;
      continue;
    }

    // Check for close delimiter
    if (content.slice(i, i + close.length) === close) {
      if (inMath) {
        inMath = false;
      }
      result += close;
      i += close.length;
      continue;
    }

    // Handle unclosed math at paragraph boundaries
    if (inMath && content[i] === '\n' && content[i + 1] === '\n') {
      result += close;
      inMath = false;
    }

    result += content[i];
    i++;
  }

  // Close any unclosed math
  if (inMath) {
    result += close;
  }

  return result;
}

/**
 * Escape problematic characters that aren't in math mode
 */
function escapeProblematicCharacters(content: string): string {
  // No escaping needed for markdown - KaTeX will handle math content
  return content;
}

/**
 * Validate if a LaTeX expression is likely valid
 * Used for pre-flight checks
 */
export function isLikelyValidLatex(latex: string): boolean {
  if (!latex) return true;

  // Check for severely unbalanced braces
  let braceCount = 0;
  for (const char of latex) {
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (braceCount < 0) return false;
  }
  if (braceCount !== 0) return false;

  // Check for common invalid patterns
  const invalidPatterns = [
    /\\\s+[a-zA-Z]/, // Backslash followed by space then letter
    /\{[^}]*$/, // Unclosed brace at end
    /^[^{]*\}/, // Unmatched close brace at start
  ];

  for (const pattern of invalidPatterns) {
    if (pattern.test(latex)) return false;
  }

  return true;
}

/**
 * Extract math blocks from content for separate validation
 */
export function extractMathBlocks(content: string): Array<{
  type: 'inline' | 'block';
  content: string;
  start: number;
  end: number;
}> {
  const blocks: Array<{
    type: 'inline' | 'block';
    content: string;
    start: number;
    end: number;
  }> = [];

  // Find $$ blocks
  const blockRegex = /\$\$([\s\S]*?)\$\$/g;
  let match;
  while ((match = blockRegex.exec(content)) !== null) {
    blocks.push({
      type: 'block',
      content: match[1],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  // Find $ inline (avoiding $$ which we already captured)
  const inlineRegex = /(?<!\$)\$(?!\$)(.*?)(?<!\$)\$(?!\$)/g;
  while ((match = inlineRegex.exec(content)) !== null) {
    // Check this isn't inside a block
    const isInsideBlock = blocks.some(
      (b) => match!.index >= b.start && match!.index < b.end,
    );
    if (!isInsideBlock) {
      blocks.push({
        type: 'inline',
        content: match[1],
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  return blocks.sort((a, b) => a.start - b.start);
}
