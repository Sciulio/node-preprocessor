# NodePreprocessor

## info
Node preprocessor for any text-type file.

Brutally tested ;)

## instructions

### installations

```
npm install node-preprocessor
```

or

```
npm install --save-dev node-preprocessor
```

### usage in file

```javascript
// #if _expr1_
... code here ...
// #elseifdef _expr_var1_
... code here ...
// #elseif _expr2_
... code here ...
// #else
... code here ...
// #endif

...

// #ifdef _expr_var1_
... code here ...
// #elseifdef _expr_var2_
... code here ...
// #elseif _expr1_
... code here ...
// #elseifnotdef _expr_var3_
... code here ...
// #else
... code here ...
// #endif

...

// #echo ...code... ${var_or_expr_1} ...code... ${var_or_expr_2}
```
where _\_expr_varN\__ may be a series of boleean expressions between variables like:
```
_var1_ || _var2_ && (_var3_ || _var4_)
```

### usage in NodeJs

```javascript
const nodepreprocess = require("nodepreprocess");

const preprocessedText = nodepreprocess.preprocess(text, context);
```

```typescript
import { preprocess } from "nodepreprocess";

const preprocessedText = preprocess(text, context);
```

## todo

 - [ ] include
 - [ ] improve documentation