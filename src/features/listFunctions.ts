export interface TSFunctionInfo {
  name: string;
  code: string;
  start: number;
  end: number;

  docStart: number;
  docEnd: number;
  docLines: number;
}

export function extractTSFunctions(content: string): TSFunctionInfo[] {
  const lines = content.split("\n");
  const functions: TSFunctionInfo[] = [];

  // Nhận dạng function header
  const fnHeaderRegex =
    /^\s*(export\s+)?(async\s+)?function\s+(\w+)\s*\(/;

  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(fnHeaderRegex);
    if (!match) {
      i++;
      continue;
    }

    const name = match[3];
    const fnStart = i;

    // =====================================
    // Tìm docstring kiểu /** ... */ phía trên
    // =====================================
    let docStart = -1;
    let docEnd = -1;
    let docLines = 0;

    let k = i - 1;
    if (k >= 0 && lines[k].trim().startsWith("/**")) {
      docStart = k;
      while (k < i && !lines[k].includes("*/")) {
        k++;
      }
      docEnd = k;
      docLines = docEnd - docStart + 1;
    }

    // =====================================
    // Gom phần header params nhiều dòng
    // Dừng khi gặp dòng có dấu { (mở thân hàm)
    // =====================================
    let j = i;
    let foundBrace = false;

    while (j < lines.length && !lines[j].includes("{")) {
      j++;
    }
    // dòng chứa { được tính như bắt đầu logic
    if (j < lines.length && lines[j].includes("{")) {
      foundBrace = true;
    }

    // =====================================
    // Nếu không tìm thấy { → không phải function đầy đủ
    // =====================================
    if (!foundBrace) {
      i++;
      continue;
    }

    // Bắt đầu đếm {}
    let braceCount =
      (lines[j].match(/{/g) || []).length -
      (lines[j].match(/}/g) || []).length;

    let k2 = j + 1;
    while (k2 < lines.length && braceCount > 0) {
      const ln = lines[k2];
      braceCount += (ln.match(/{/g) || []).length;
      braceCount -= (ln.match(/}/g) || []).length;
      k2++;
    }

    const fnEnd = k2 - 1;
    const code = lines.slice(fnStart, fnEnd + 1).join("\n");

    functions.push({
      name,
      code,
      start: fnStart,
      end: fnEnd,
      docStart,
      docEnd,
      docLines,
    });

    i = fnEnd + 1;
  }

  return functions;
}
