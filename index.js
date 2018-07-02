function defKeywordParser(expr, undef) {
  return expr
  .replace(/\b(\w+)\b/gi, function(match) {
    return `(typeof ${match.trim()} ${undef ? "=" : "!" }= 'undefined')`;
  });
}

const keywordsSet = [{
  name: "IF",
  regexp: new RegExp('\\/\\/(\\s*)#if(\\s+)(.*$)', 'gmi'),
  compile: (expr) => {
    return `if (${expr}) {`;
  }
  //TODO , validate: (...args) => boolean
}, {
  name: "IFDEF",
  regexp: new RegExp('\\/\\/(\\s*)#ifdef(\\s+)(.*$)', 'gmi'),
  compile: (expr) => `if (${defKeywordParser(expr)}) {`
}, {
  name: "IFNOTDEF",
  regexp: new RegExp('\\/\\/(\\s*)#ifnotdef(\\s+)(.*$)', 'gmi'),
  compile: (expr) => `if (${defKeywordParser(expr, true)}) {`
}, {
  name: "ELSE",
  regexp: new RegExp('\\/\\/(\\s*)#else(\\s+)', 'gmi'), // or '\\/\\/(\\s*)#else(\\s+)'
  compile: (expr) => `} else {`
}, {
  name: "ELSEIF",
  regexp: new RegExp('\\/\\/(\\s*)#elseif(\\s+)(.*$)', 'gmi'),
  compile: (expr) => `} else if (${expr}) {`
}, {
  name: "ELSEIFDEF",
  regexp: new RegExp('\\/\\/(\\s*)#elseifdef(\\s+)(.*$)', 'gmi'),
  compile: (expr) => `} else if (${defKeywordParser(expr)}) {`
}, {
  name: "ELSEIFNOTDEF",
  regexp: new RegExp('\\/\\/(\\s*)#elseifnotdef(\\s+)(.*$)', 'gmi'),
  compile: (expr) => `} else if (${defKeywordParser(expr, true)}) {`
}, {
  name: "ENDIF",
  regexp: new RegExp('\\/\\/(\\s*)#endif(\\s+)', 'gmi'), // or '\\/\\/(\\s*)#endif(\\s+)'
  compile: (expr) => `}`
}, {
  name: "ECHO",
  regexp: new RegExp('\\/\\/(\\s*)#echo(\\s+)(.*$)', 'gmi'),
  compile: parseInjectedCode
}];


function spliceString(text, idx, rem, str) {
  return text.slice(0, idx) + str + text.slice(idx + Math.abs(rem));
};

function escapeRawCode(rawCode) {
  for (var i = rawCode.length - 1; i >= 0; i--) {
    if (rawCode.charAt(i) == "\\") {
      rawCode = spliceString(rawCode, i + 1, 0, "\\");
    }
  }
  return rawCode
  //.replace(/\\/gm, "\\\\")
  .replace(/"/gm, '\\"')
  .replace(/`/gm, "\\`")
  .replace(/\${/gm, '\\${');
}
function unescapeRowCode(rawCode) {
  return rawCode
  .replace(/\\"/gm, '"')
  //.replace(/\\\${/gm, '${')
  ;
}
function unesacpeInjectedCode(rawCode) {
  rawCode = rawCode
  .replace(/\\`/gm, "`")
  //.replace(/\\\\/gm, "\\")
  .replace(/\\\${/gm, '${')
  ;
  
  /*for (var i = rawCode.length - 1; i > 0; i--) {
    if (rawCode.charAt(i) == "\\" && rawCode.charAt(i - 1) == "\\") {
      rawCode = rawCode.slice(0, i - 1) + rawCode.slice(i--)
    }
  }*/

  return rawCode;
}

function parseRawCode(rawCode) {
  return parseInjectedCode(escapeRawCode(rawCode));
}
function parseInjectedCode(rawCode) {
  return "_code.push(`" + rawCode + "`);";
}


function parseKeywords(text) {
  const parsedCodeList = [];

  keywordsSet.forEach(keywordItem => {
    let execMatch;

    while ((execMatch = keywordItem.regexp.exec(text)) !== null) {
      const startsAt = execMatch.index;
      const endsAt = keywordItem.regexp.lastIndex;

      const codeItem = {
        keywordItem,
        fullMatch: execMatch[0],
        expr: execMatch[3],
        startsAt,
        endsAt,
        pre: text.substring(0, startsAt),
        post: text.substring(endsAt)
      };

      parsedCodeList.push(codeItem);
    }
  });

  parsedCodeList.sort((a, b) => a.startsAt > b.startsAt ? 1 : -1);

  return parsedCodeList;
}

function parseInjectingCode(parsedCodeList, text) {
  const injectingCodeList = [];
  let prevEndIdx = 0;

  parsedCodeList.forEach(codeItem => {
    const rawCode = text.substring(prevEndIdx, codeItem.startsAt);
    const parsedRowCode = parseRawCode(rawCode);
    const injectedExpression = codeItem.keywordItem.compile(codeItem.expr);

    injectingCodeList.push(parsedRowCode, injectedExpression);

    prevEndIdx = codeItem.endsAt;
  });
  injectingCodeList.push(parseRawCode(text.substring(prevEndIdx)))

  injectingCodeList.unshift("(function() { const _code = [];");
  injectingCodeList.push("; return _code.join(''); })();");

  return injectingCodeList.join("");
}

module.exports.preprocess = function (text, context) {
  // add newline in case of a preprocessor directive at the end of text
  text += require('os').EOL;

  const parsedCodeList = parseKeywords(text);
  const parsedRowCode = parseInjectingCode(parsedCodeList, text);
  const unescapedParsedRowCode = unescapeRowCode(parsedRowCode);

  let preprocessedCode;
  //TODO: improve isolation
  with (context) {
    const evaluatedCode = eval(unescapedParsedRowCode);
    preprocessedCode = unesacpeInjectedCode(evaluatedCode);
  }

  return preprocessedCode;
}