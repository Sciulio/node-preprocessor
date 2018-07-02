/*
let text = `
	var gigi = 12;
	// #if FRIK > 0
		gigi += 4;
	// #else
		gigi -= 4;
	// #endif
	//#if FRIK > 120
		gigi += 0.5;
	// #else
		gigi -= 0.25;
	// #endif
	//  #if FRIK > 120
		gigi = -gigi;
	// #endif
	// #echo var lello = gigi + \${FRIK};
	//  #ifdef GIGI
		gigi *= 100;
	// #endif
	//  #ifdef GIGIo
		gigi = 0;
	// #endif
	console.log("GIGI:", gigi);
`;

const context = {
  FRIK: 50,
  GIGI: true
};
*/

/*

// ( _expr_varN_ ~ _var1_ || _var2_ && (_var3_ || _var4_) )

// #if _expr1_
// #elseifdef _expr_var1_
// #elseif _expr2_
// #else
// #endif


// #ifdef _expr_var1_
// #elseifdef _expr_var2_
// #elseif _expr1_
// #elseifnotdef _expr_var3_
// #else
// #endif

// #echo ...code... ${var_or_expr_1} ...code... ${var_or_expr_2}

*/

function defKeywordParser(expr, undef) {
  /*console.log("----------------------------------------")
  console.log(expr)
  console.log(expr.replace(/\b(\w+)\b/gi, function(match) {
    return `(typeof ${match.trim()} ${undef ? "=" : "!" }= 'undefined')`;
  }))*/
  return expr.replace(/\b(\w+)\b/gi, function(match) {
    return `(typeof ${match.trim()} ${undef ? "=" : "!" }= 'undefined')`;
  });
  //return expr.split("&&").map(param => `typeof ${param.trim()} ${undef ? "=" : "!" }= 'undefined'`).join(" && ");
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
    //console.log("Parsing keyword:", keywordItem.name);

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
    const injectedExpression = codeItem.keywordItem.compile(codeItem.expr)

    /*
    console.log(codeItem.keywordItem.name, codeItem.startsAt, codeItem.endsAt, prevEndIdx);
    console.log("EXPR:", codeItem.expr);
    console.log("CODE:", rawCode);
    console.log("---------------");
    */

    injectingCodeList.push(parsedRowCode, injectedExpression);

    prevEndIdx = codeItem.endsAt;
  });
  injectingCodeList.push(parseRawCode(text.substring(prevEndIdx)))

  injectingCodeList.unshift("(function() { const _code = [];");
  injectingCodeList.push("; return _code.join(''); })();");

  return injectingCodeList.join("");
}

module.exports.preprocess = function (text, context) {
  text += require('os').EOL; // add newline in case of a preprocessor directive at the end of text;

  const parsedCodeList = parseKeywords(text);
  const parsedInjectingCode = parseInjectingCode(parsedCodeList, text);
  const unescapedParsedInjectingCode = unescapeRowCode(parsedInjectingCode);

  //return fullInjectingCode;

  let preprocessedCode;
  //TODO: improve isolation
  with (context) {
    const evaluatedCode = eval(unescapedParsedInjectingCode);
    preprocessedCode = unesacpeInjectedCode(evaluatedCode);
  }

  return preprocessedCode;
}

/*
const funcParams = Object.keys(context); //.concat(fullInjectingCode);
const compilerOfCompiler = new Function(
	funcParams.length ?
		//"return new Function('" + funcParams.join("','") + "', `" + fullInjectingCode + "+`);" :
		"return new Function('" + funcParams.join("','") + "', '" + fullInjectingCode.replace(/\n/g, "\\n") + "');" :
		"return new Function(`" + fullInjectingCode + "`);"
);
const builtCompiler = compilerOfCompiler();
console.log(builtCompiler.toString())
const compiler = builtCompiler(context);
console.log(compiler.toString())
let built = compiler(context);
console.log("built")
console.log("Context:", context)
console.log(built)
*/