const Interpret = 0;
const Compile   = 1;

const Direct   = 0;
const Indirect = 1;

class Frame {
  constructor(word, offset = 0, local = {}) {
    this.word   = word;
    this.offset = offset;
    this.local  = local;
  }

  add(key, value) {
    this.local[key] = value;
  }

  has(key) {
    return key in this.local;
  }

  get(key) {
    return this.local[key];
  }
}

class Word {
  constructor(type, token, definition = [], immediate = false) {
    this.type       = type;
    this.token      = token; 
    this.definition = definition; 
    this.immediate  = immediate;
    this.boundary   = 0;

    if (definition) {
      this.finalise();
    }
  }

  append(...token) {
    this.definition.push(...token);
  }

  data() {
    return this.definition.slice(0, this.boundary);
  }

  source() {
    return this.definition.slice(this.boundary);
  }

  finalise() {
    if (this.type == Direct) {
      this.execute = new Function("system", this.source().join(" "));
    }
  }

  execute(system) {
    let frame = system.frames.top();
    frame.offset = this.boundary;
    while (frame.offset < this.definition.length) {
      system.evaluate(this.definition.at(frame.offset++));
    }
  }
}

class Stack {
  constructor(label) {
    this.label = label;
    this.cells = [];
  }

  clear() {
    this.cells = [];
  }

  depth() {
    return this.cells.length;
  }

  push(...values) {
    this.cells.push(...values);
  }

  pop() {
    this.abortOnUnderflow();
    return this.cells.pop();
  }

  top() {
    return this.cells.at(-1);
  }

  drop() {
    this.pop();
  }

  get(n) {
    return this.cells.at(-(n + 1));
  }

  pick(n) {
    this.push(this.get(n));
  }

  roll(n) {
    this.push(this.cells.splice(-(n + 1), 1).at(0));
  }

  dup() {
    this.push(this.top());
  }

  swap() {
    const y = this.pop(); 
    const x = this.pop();
    this.push(y, x);
  }

  over() {
    const y = this.pop(); 
    const x = this.pop();
    this.push(x, y, x);
  }

  nip() {
    const y = this.pop(); 
    const x = this.pop();
    this.push(y);
  }

  tuck() {
    const y = this.pop(); 
    const x = this.pop();
    this.push(y, x, y);
  }

  rot() {
    const z = this.pop(); 
    const y = this.pop(); 
    const x = this.pop();
    this.push(y, z, x);
  }

  nrot() {
    const z = this.pop(); 
    const y = this.pop(); 
    const x = this.pop();
    this.push(z, x, y);
  }

  state() {
    return this.cells.map(JSON.stringify).join(" ");
  }

  abortOnUnderflow() {
    if (this.cells.length == 0) {
      throw new Error(`${this.label} underflow!`);
    }
  }
}

class Pile extends Stack {
  constructor() {
    super("books");
  }

  find(title) {
    for (let index = 0; index < this.depth(); index++) {
      let book = this.get(index);
      if (book.title == title) {
        this.roll(index);
        return this.top();
      }
    }
    this.abortIfNotFound(title);
  }

  search(token) {
    for (let index = 0; index < this.depth(); index++) {
      let book = this.get(index);
      let word = book.get(token);
      if (word) {
        return word;
      }
    }
  }

  titles() {
    return this.cells.map(book => book.title);
  }

  abortIfNotFound(token) {
    throw new Error(`${token} book not found`);
  }
}

class Book {
  constructor(title) {
    this.title = title;
    this.word  = undefined;
    this.words = {};
  }

  add(word) {
    this.words[word.token] = word;
    this.word = word;
  }

  remove(token) {
    delete this.words[token];
  }

  count() {
    return Object.keys(this.words.length);
  }

  contains(token) {
    return token in this.words;
  }

  get(token) {
    return this.words[token];
  }

  state() {
    return Object.keys(this.words).join(" ");
  }
}

class Input {
  constructor(text = "", offset = 0) {
    this.update(text, offset);
    this.space = [ ' ', '\t', '\n' ];
  }

  update(text = "", offset = 0) {
    this.text = text;
    this.offset = offset;
  }

  nextSpace() {
    let offset = this.offset;
    while (offset < this.text.length) {
      if (this.space.includes(this.text[offset])) {
        break;
      }
      offset++;
    }
    return offset;
  }

  skipSpace() {
    while (this.offset < this.text.length) {
      if (!this.space.includes(this.text[this.offset])) {
        break;
      }
      this.offset++;
    }
  }

  nextBoundary() {
    if (this.text[this.offset] == '"') {
      let next = this.text.indexOf('"', this.offset + 1);
      if (next != -1) {
        return next + 1;
      }
    }
    return this.nextSpace();
  }

  token() {
    if (this.offset < this.text.length) {
      let boundary = this.nextBoundary();
      let token = this.text.slice(this.offset, boundary);
      this.offset = boundary;
      return token;
    }
  }

  next() {
    this.skipSpace();
    return this.token();
  }

  tokens() {
    let tokens = [];
    while (this.offset < this.text.length) {
      tokens.push(this.next());
    }
    return tokens;
  }

  skipLine() {
    while (this.offset < this.text.length) {
      if (this.text[this.offset] == '\n') {
        this.offset++;
        break;
      }
      this.offset++;
    }
  }

  static isString(token) {
    return token[0] == '"' && token[token.length - 1] == '"';
  }

  static dequote(string) {
    if (this.isString(string)) {
      string = string.slice(1, -1);
    }
    return string;
  }
}

class InputError extends Error {
  constructor(message) {
    super(message);
  }
}

class Console {
  constructor(writer = console.log, reader = undefined) {
    this.write = writer;
    this.read  = reader; 
  }
}

class SystemError extends Error {
  constructor(message, cause) {
    super(message, cause);
  }
}

class System {
  constructor() {
    this.mode    = Interpret; 
    this.input   = new Input();
    this.console = new Console();
    this.aux     = new Stack("aux");
    this.data    = new Stack("data");
    this.frames  = new Stack("frames");
    this.pile    = new Pile();
    this.book    = undefined;

    this.initialise();
  }

  parse(source) {
    this.input.update(source);
    let token;
    do { 
      token = this.input.next();
      if (token) {
         this.evaluate(token);
      }
    } while (token);
  }

  evaluate(token) {
    if (token) {
      if (this.mode == Compile) {
        this.compile(token);
      }
      else {
        this.interpret(token);
      }
    }
  }

  compile(token) {
    let word = this.pile.search(token);
    if (word && word.immediate) {
      this.execute(word);
    }
    else {
      this.book.word.append(token);
    }
  }

  interpret(token) {
    let frame = this.frames.top();
    if (frame) {
      if (frame.has(token)) {
        this.data.push(frame.get(token));
        return;
      }
    }

    let word = this.pile.search(token);
    if (word) {
      this.execute(word);
      return;
    }

    if (Input.isString(token)) {
      this.data.push(Input.dequote(token));
      return;
    }

    let number = parseFloat(token);
    if (!isNaN(number)) {
      this.data.push(number);
      return;
    }

    this.error(`Unrecognised token: ${token}`);
  }

  execute(word) {
    let frame = new Frame(word);
    system.frames.push(frame);
    try {
      word.execute(this);
    }
    catch (error) {
      this.interpret('BACKTRACE');
      this.console.error(error.message);
    }
    system.frames.drop();
  }

  error(message) {
    throw new SystemError(message, {
      cause: {
        "offset": this.input.offset,
        "text": this.input.text
      }
    });
  }

  initialise() {
    this.book = new Book("CORE");

    this.book.add(
      new Word(Direct, "CREATE", [
        "system.book.add(new Word(Indirect, system.input.next()));"
      ])
    );
    
    this.book.add(
      new Word(Direct, "POSTPONE", [
        "system.book.word.append(system.input.next());"
      ], true)
    );
    
    this.book.add(
      new Word(Direct, "]", [
        "system.mode = Compile"
      ])
    );
    
    this.book.add(
      new Word(Direct, "[", [
        "system.mode = Interpret"
      ], true)
    );
    
    this.book.add(
      new Word(Direct, "FINAL", [
        "system.book.word.finalise();"
      ])
    );
    
    this.book.add(
      new Word(Direct, "IMMEDIATE", [
        "system.book.word.immediate = true;"
      ])
    );
    
    this.book.add(
      new Word(Direct, "CODE", [
        "system.book.word.type = Direct;"
      ])
    );

    this.pile.push(this.book);
  }
}

let system = new System();
system.parse(

// Core
`
CREATE ; ] POSTPONE [ POSTPONE FINAL [ IMMEDIATE
CREATE : ] POSTPONE CREATE POSTPONE ] ;

: CODE: CREATE POSTPONE CODE POSTPONE ] ;

CODE: MACRO:
  system.book.add(new Word(Indirect, system.input.next()));
  system.book.word.immediate = true;
  let token;
  while ((token = system.input.next()) !== ";") {
    system.book.word.append(token);
  }
;

CODE: \\
  system.input.skipLine();
; IMMEDIATE

CODE: (
  while (system.input.next() !== ")");
; IMMEDIATE

CODE: PARSE 
  system.parse(system.data.pop());
;


\\ ECMAScript

CODE: :CODE
  system.data.push(eval(system.data.pop()));
;

CODE: FUNCTION
  let code = system.data.pop();
  let parameters = system.data.pop();
  let definition = [];
  while (parameters--) {
    definition.unshift(system.data.pop());
  }
  definition.push(code);
  system.data.push(new Function(...definition));
;

CODE: CALL
  let code = system.data.pop();
  let count = system.data.pop();
  let parameters = [];
  while (count--) {
    parameters.unshift(system.data.pop());
  }
  let result = code(...parameters);
  if (result !== undefined) {
    system.data.push(result);
  }
;

CODE: NEW
  let code = system.data.pop();
  let count = system.data.pop();
  let parameters = [];
  while (count--) {
    parameters.unshift(system.data.pop());
  }
  let result = eval(\`new \${code}(...parameters)\`);
  if (result !== undefined) {
    system.data.push(result);
  }
;

CODE: METHOD
  let object = system.data.pop();
  let method = system.data.pop();
  let count = system.data.pop();
  let parameters = [];
  while (count--) {
    parameters.unshift(system.data.pop());
  }
  let result = object[method](...parameters);
  if (result !== undefined) {
    system.data.push(result);
  }
;

CODE: UNDEFINED
  system.data.push(undefined);
;
 
CODE: OBJECT
  system.data.push({});
;

CODE: :OBJECT
  let count = system.data.pop();
  let object = {};
  while (count--) {
    let value = system.data.pop();
    let key = system.data.pop();
    object[key] = value;
  }
  system.data.push(object);
;

: <{ ( -- )
  DEPTH >A ;

: }> ( -- object )
  DEPTH A> - 2 / :OBJECT ;

CODE: ARRAY
  system.data.push([]);
;

CODE: :ARRAY
  let count = system.data.pop();
  let array = [];
  while (count--) {
    array.unshift(system.data.pop());
  }
  system.data.push(array);
;

: <[ ( -- )
  DEPTH >A ;

: ]> ( -- array )
  DEPTH A> - :ARRAY ;

CODE: SPREAD
  let array = system.data.pop();
  system.data.push(...array);
;

CODE: KEYS
  let object = system.data.pop();
  system.data.push(Object.keys(object));
;

CODE: VALUES 
  let object = system.data.pop();
  system.data.push(Object.values(object));
;

CODE: DELETE
  let object = system.data.pop();
  let attribute = system.data.pop();
  delete object[attribute];
;

CODE: ?
  let object = system.data.pop();
  let key = system.data.pop();
  system.data.push(object[key]);
;

CODE: !
  let object = system.data.pop();
  let key = system.data.pop();
  let value = system.data.pop();
  object[key] = value; 
;

: +! { addend key object -- }
  key object ? addend + key object ! ;

: REVERSE { array -- yarra }
  0 "reverse" array METHOD ;

: SORT { unsorted -- sorted }
  0 "sort" unsorted METHOD ;

: SPLICE# { index count array -- subarray }
  index count 2 "splice" array METHOD ;

: SPLICE { index array -- subarray }
  index array COUNT array SPLICE# ;

: SLICE# { index count array -- subarray }
  index count + { boundary }
  index boundary 2 "slice" array METHOD ;

: SLICE { index array -- subarray }
  index array COUNT array SLICE# ;

: JOIN { array glue -- string }
  glue 1 "join" array METHOD ;

: MERGE { count glue -- string }
  count :ARRAY glue JOIN ;

: FIT { string form -- fitted }
  form string +   { composite }
  form COUNT -1 * { index }
  index 1 "slice" composite METHOD ;

: SPLIT { string delimiter -- array }
  delimiter 1 "split" string METHOD ;

: CONTAINS { item array -- boolean }
  item 1 "indexOf" array METHOD -1 <> ;

CODE: CONCAT
  let y = system.data.pop();
  let x = system.data.pop();
  system.data.push(x.concat(y));
;

CODE: COUNT 
  let array = system.data.pop();
  system.data.push(array.length);
;

CODE: PUSH
  let array = system.data.pop();
  let value = system.data.pop();
  array.push(value);
;

CODE: POP
  let array = system.data.pop();
  system.data.push(array.pop());
;

CODE: TIME
  let start = performance.now();
  system.evaluate(system.input.next());
  let end = performance.now();
  system.console.write(\`\${end - start}ms\`);
;


\\ Memory

CODE: VARIABLE
  system.book.add(new Word(Direct, system.input.next()));
  system.book.word.boundary = 1;
  system.book.word.execute = new Function(\`
    let frame = system.frames.top();
    system.data.push(0);
    system.data.push(frame.word.definition);
  \`);
;

CODE: VALUE
  system.book.add(new Word(Direct, system.input.next()));
  system.book.word.boundary = 1;
  system.book.word.append(system.data.pop());
  system.book.word.execute = new Function(\`
    let frame = system.frames.top();
    system.data.push(frame.word.definition.at(0));
  \`);
;

CODE: TO
  let token = system.input.next();
  let word = system.pile.search(token);
  word.definition[0] = system.data.pop();
;

CODE: {
  let local = true, locals = [];
  let token, frame = system.frames.get(1);
  while (token = frame.word.definition.at(frame.offset)) {
    if (token === "}") {
      break;
    }
    else if (token === "--") {
      local = false;
    }
    else {
      if (local) {
        locals.unshift(token);
      }
    }
    frame.offset++;
  }
  frame.offset++;
  locals.forEach(local => {
    frame.add(local, system.data.pop());
  });
;


\\ Pile

CODE: BOOKS?
  let titles = system.pile.cells.map(book => book.title);
  system.console.write(titles.join(' '));
;

CODE: PUBLISH 
  system.book = new Book(system.input.next());
  system.pile.push(system.book);
;

CODE: BURN 
  system.pile.pop();
;

CODE: USE 
  system.book = system.pile.find(system.input.next());
;


\\ Book

CODE: BOOK?
  system.console.write(system.book.title);
;

CODE: LATEST?
  system.data.push(system.book.word);
;

CODE: WORDS?
  system.console.write(system.book.state());
;


\\ Word

CODE: ,
  system.book.word.append(system.data.pop());
;

CODE: '
  system.data.push(system.pile.search(system.input.next()));
;

: DEFINITION ( word -- definition )
  "definition" SWAP ? ;

: FUNCTION? ( word -- function )
  "execute" SWAP ? ;

: SEE ( token -- )
  " " 1 "join" POSTPONE ' DEFINITION METHOD . ;

: INSPECT ( item -- ) 
  DUP . ;


\\ Flow

CODE: BACKTRACE
  let depth = system.frames.depth();
  for (let level = depth - 1; level > 0; level--) {
    let frame  = system.frames.get(level);
    let token  = frame.word.token;
    let type   = frame.word.type;
    let offset = frame.offset;
    if (type == Indirect) {
      offset--;
    }
    let printableOffset = ("0000" + offset).slice(-4);
    system.console.write(
      \`\${type} \${printableOffset} \${token}\`
    );
  }
;

CODE: EXIT
  let frame = system.frames.get(1);
  frame.offset = frame.word.definition.length;
;

CODE: JUMP
  let frame = system.frames.get(1);
  frame.offset = frame.word.definition.at(frame.offset);
;

CODE: JUMP?
  let frame = system.frames.get(1);
  if (system.data.pop()) {
    frame.offset++;
  }
  else {
    frame.offset = frame.word.definition.at(frame.offset);
  }
;

MACRO: IF
  JUMP? [ LATEST? DEFINITION COUNT ] 0 ;

MACRO: THEN
  [ LATEST? DEFINITION COUNT SWAP LATEST? DEFINITION ! ] ;

MACRO: ELSE
  JUMP [ LATEST? DEFINITION COUNT SWAP ] 0 THEN ;

MACRO: BEGIN
  [ LATEST? DEFINITION COUNT ] ;

MACRO: UNTIL
  JUMP? [ , ] ;

MACRO: AGAIN
  JUMP [ , ] ;

MACRO: WHILE
  IF ;

MACRO: REPEAT
  JUMP [ SWAP , ] THEN ;


\\ Input

CODE: WORD 
  system.data.push(system.input.next());
;


\\ Stack

CODE: DEPTH
  system.data.push(system.data.depth());
;

CODE: CLEAR
  system.data.clear();
;

CODE: DUP
  system.data.dup();
;

CODE: DROP
  system.data.drop();
;

CODE: SWAP
  system.data.swap();
;

CODE: OVER
  system.data.over();
;

CODE: NIP 
  system.data.nip();
;

CODE: TUCK
  system.data.tuck();
;

CODE: ROLL 
  system.data.roll(system.data.pop());
;

CODE: PICK
  system.data.pick(system.data.pop());
;

CODE: ROT
  system.data.rot();
;

CODE: -ROT
  system.data.nrot();
;

CODE: .
  system.console.write(JSON.stringify(system.data.pop()));
;

CODE: .S
  let depth = system.data.depth();
  let state = system.data.state();
  system.console.write(\`<\${depth}> \${state}\`);
;

CODE: >A
  system.aux.push(system.data.pop());
;

CODE: A>
  system.data.push(system.aux.pop());
;

CODE: A?
  system.data.push(system.aux.top());
;

CODE: .A
  let depth = system.aux.depth();
  let state = system.aux.state();
  system.console.write(\`<\${depth}> \${state}\`);
;

CODE: ADROP
  system.aux.drop();
;


\\ Arithmetic 

CODE: +
  let y = system.data.pop();
  let x = system.data.pop();
  system.data.push(x + y);
;

CODE: -
  let y = system.data.pop();
  let x = system.data.pop();
  system.data.push(x - y);
;

CODE: *
  let y = system.data.pop();
  let x = system.data.pop();
  system.data.push(x * y);
;

CODE: /
  let y = system.data.pop();
  let x = system.data.pop();
  system.data.push(x / y);
;

CODE: MOD 
  let y = system.data.pop();
  let x = system.data.pop();
  system.data.push(x % y);
;

CODE: <<
  let y = system.data.pop();
  let x = system.data.pop();
  system.data.push(x << y);
;

CODE: >>
  let y = system.data.pop();
  let x = system.data.pop();
  system.data.push(x >> y);
;

CODE: AND 
  let y = system.data.pop();
  let x = system.data.pop();
  system.data.push(x & y);
;

CODE: OR 
  let y = system.data.pop();
  let x = system.data.pop();
  system.data.push(x | y);
;

CODE: XOR 
  let y = system.data.pop();
  let x = system.data.pop();
  system.data.push(x ^ y);
;

CODE: INVERT 
  system.data.push(~system.data.pop());
;

CODE: TRUE
  system.data.push(true);
;

CODE: FALSE
  system.data.push(false);
;

CODE: FLOOR
  system.data.push(Math.floor(system.data.pop()));
;

CODE: CEILING
  system.data.push(Math.ceil(system.data.pop()));
;


\\ Comparison

CODE: =
  let y = system.data.pop();
  let x = system.data.pop();
  system.data.push(x === y);
;

CODE: <>
  let y = system.data.pop();
  let x = system.data.pop();
  system.data.push(x !== y);
;

CODE: <
  let y = system.data.pop();
  let x = system.data.pop();
  system.data.push(x < y);
;

CODE: <=
  let y = system.data.pop();
  let x = system.data.pop();
  system.data.push(x <= y);
;

CODE: >
  let y = system.data.pop();
  let x = system.data.pop();
  system.data.push(x > y);
;

CODE: >=
  let y = system.data.pop();
  let x = system.data.pop();
  system.data.push(x >= y);
;

`);
system.parse(`

PUBLISH DOM

CODE: DOCUMENT
  system.data.push(document);
;

: SELECT-CLASS { name -- selector }
  <[ "." name ]> "" JOIN ;

: QUERY-SELECTOR ( selector -- element )
  1 "querySelector" DOCUMENT METHOD ;

: QUERY-ALL ( selector -- element )
  1 "querySelectorAll" DOCUMENT METHOD ;

: CREATE-ELEMENT ( name -- element )
  1 "createElement" DOCUMENT METHOD ;

: CLASS! { name element -- }
  name "className" element ! ;

: APPEND { child parent -- }
  child 1 "append" parent METHOD ;

: PREPEND { child parent -- }
  child 1 "prepend" parent METHOD ;

: ADD-EVENT-LISTENER { function event element -- }
  event function 2 "addEventListener" element METHOD ;
  
: ON-EVENT { token -- function }
  "event" 1 <[
    "system.data.push(event);
     system.interpret('" token "');"
  ]> "" JOIN
  FUNCTION ;

: WHEN-POINTER-MOVES { function element -- }
  function "pointermove" element ADD-EVENT-LISTENER ;

: WHEN-CLICKED { function element -- }
  function "click" element ADD-EVENT-LISTENER ;

: WHEN-KEY-RELEASED { function element -- }
  function "keyup" element ADD-EVENT-LISTENER ;

: WHEN-MENU-REQUESTED { function element -- }
  function "contextmenu" element ADD-EVENT-LISTENER ;

: STYLE? { element -- style }
  "style" element ? ;

: COLOUR? { element -- colour }
  "color" element STYLE? ;

: HIDE { element -- }
  "none" "display" element STYLE? ! ;

: DISPLAY { type element -- }
  type "display" element STYLE? ! ;

: VISIBLE? { element -- }
  "none" "display" element STYLE? ? <> ;

: TOGGLE-VISIBILITY { type element -- }
  element VISIBLE? IF
    element HIDE
  ELSE
    type element DISPLAY
  THEN ;

: FOCUS { element -- }
  0 "focus" element METHOD ;

`);
system.console.error = function(error) {
  system.data.push(error);
  system.interpret("ERROR");
}

system.console.write = function(text, colour = "#ccc") {
  system.data.push(text, colour);
  system.interpret("WRITE");
};

system.console.read = function(text) {
  try {
    system.data.push(text);
    system.interpret("READ");
  }
  catch (error) {
    system.interpret("BACKTRACE");
    system.console.error(error);
  }
}

system.parse(`

PUBLISH CONSOLE

\\ View

VARIABLE LineIndex
-1 LineIndex !

"#2a9" VALUE TimestampOutput
"#ccc" VALUE DefaultOutput
"#6ec" VALUE InputOutput
"#ec2" VALUE ErrorOutput

"#view"    QUERY-SELECTOR VALUE #view
"#output"  QUERY-SELECTOR VALUE #output
"#control" QUERY-SELECTOR VALUE #control
"#input"   QUERY-SELECTOR VALUE #input
"#enter"   QUERY-SELECTOR VALUE #enter
"#mode"    QUERY-SELECTOR VALUE #mode


\\ Input / Output

: LINE { text colour -- line }
  "p" CREATE-ELEMENT { line }
  colour line COLOUR? !
  text line APPEND
  line ;

: WRITE ( text colour -- )
  LINE #output PREPEND ;

: BREAK ( -- )
  "br" CREATE-ELEMENT #output PREPEND ;

: TIMESTAMP ( -- )
  0 "Date" NEW                { date }
  0 "toUTCString" date METHOD { utcDate }
  utcDate TimestampOutput WRITE ;

: INPUT ( text -- )
  InputOutput LINE { line }
  "input-line" line CLASS!
  line #output PREPEND ;

: ERROR ( error -- )
  ErrorOutput WRITE ;

: READ { text -- }
  BREAK TIMESTAMP
  text INPUT
  text PARSE ;


\\ Control 

: TOGGLE-MODE { event -- }
  "zIndex" #view STYLE? ? "2" <> IF
    "2" "zIndex" #view STYLE? !
    "CODE" "innerHTML" #mode !
  ELSE
    "0" "zIndex" #view STYLE? !
    "VIEW" "innerHTML" #mode !
  THEN
  #input FOCUS ;

: INPUT! { text -- }
  text "value" #input ! ;

: CLEAR-INPUT { -- }
  "" INPUT!
  -1 LineIndex ! ;

: ENTER { event -- }
  "value" #input ? { text }
  text IF
    text READ
    CLEAR-INPUT
  THEN
  #input FOCUS ;

: STEP-INPUT { step -- }
  ".input-line" QUERY-ALL { inputs }
  LineIndex ?             { index }
  index step + inputs ? UNDEFINED = IF 
    CLEAR-INPUT
  ELSE
    step LineIndex +!
    LineIndex ? inputs ? { input }
    input IF
      "textContent" input ? INPUT!
    THEN
  THEN ;

: KEY { event -- }
  "key" event ? "ArrowUp" = IF
    0 "preventDefault" event METHOD
    +1 STEP-INPUT
  EXIT THEN

  "key" event ? "ArrowDown" = IF
    0 "preventDefault" event METHOD
    -1 STEP-INPUT
  EXIT THEN

  "key" event ? "Enter" = IF
    0 "preventDefault" event METHOD
    event ENTER
  THEN ;

"TOGGLE-MODE" ON-EVENT #mode  WHEN-CLICKED
"ENTER"       ON-EVENT #enter WHEN-CLICKED
"KEY"         ON-EVENT #input WHEN-KEY-RELEASED

#input FOCUS

`);

system.console.write('слава україні! https://war.ukraine.ua/support-ukraine/', "#fd0");
system.console.write('россия будет свободной! https://legionliberty.army/', "#5cd");
