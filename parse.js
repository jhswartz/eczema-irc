system.parse(`

OBJECT VALUE Names
OBJECT VALUE Users

: PONG { type -- }
  <[ "PONG" type ]> " " JOIN { message }
  message 1 "send" Socket ? METHOD ;

: PARSE-MOVEMENT { source type target remaining -- }
  <[ type source ]> " " JOIN { message }
  message target #view MESSAGE ;

: PARSE-TOPIC { source type target remaining -- }
  0 remaining ?                { channel }
  1 remaining SLICE " " JOIN   { topic }
  <[ "TOPIC" topic ]> " " JOIN { message }
  message channel #view MESSAGE ;

: PARSE-MODE { source type target remaining -- }
  <[ "MODE" remaining ]> " " JOIN { message }
  message target #view MESSAGE ;

: PARSE-NICK { source -- }
  source "!" SPLIT { tokens }
  0 tokens ?       { nick }
  1 nick SLICE ;

: ADORN-NICK { type nick -- }
  type "NOTICE" = IF
    "(" { introducer }
    ")" { terminator }
  ELSE
    "<" { introducer }
    ">" { terminator }
  THEN
  <[ introducer nick terminator ]> "" JOIN ;

: PARSE-MESSAGE { source type target remaining -- }
  1 remaining " " JOIN SLICE { text }
  source PARSE-NICK          { nick }
  type nick ADORN-NICK       { from }
  <[ from text ]> " " JOIN   { message }
  message target #view MESSAGE ;

: PARSE-NAMES { source type target remaining -- }
  1 remaining ?     { channel }
  channel Names ?   { existing }
  2 remaining SLICE { names }
  1 0 names ? SLICE { first }
  first 0 names !

  existing IF
    existing names CONCAT { names }
  THEN

  names channel Names ! ;

: PARSE-END-NAMES { source type target remaining -- }
  0 remaining ?                 { channel }
  channel Names ? SORT " " JOIN { names }
  <[ "NAMES" names ]> " " JOIN  { message }
  message channel #view MESSAGE
  ARRAY channel Names ! ;

: PARSE-WHO { source type target remaining -- }
  0 remaining ? { channel }
  4 remaining ? { nick }
  <{
    "username" 1 remaining ?
    "address"  2 remaining ?
    "info"     7 remaining SLICE " " JOIN
  }> nick Users ! ;

: PARSE-END-WHO { source type target remaining -- }
  0 remaining ?   { channel }
  Users KEYS SORT { nicks }

  BEGIN nicks COUNT WHILE
    nicks POP    { nick }
    nick Users ? { user }
    <[
      "WHO" nick
      "username" user ?
      "address"  user ?
      "info"     user ?
    ]> " " JOIN channel #view MESSAGE
    nick Users DELETE
  REPEAT ;

: IGNORE-LINE { source type target remaining -- } ;

<{
   "JOIN"    "PARSE-MOVEMENT"
   "PART"    "PARSE-MOVEMENT"
   "MODE"    "PARSE-MODE"
   "PRIVMSG" "PARSE-MESSAGE"
   "NOTICE"  "PARSE-MESSAGE"
   "332"     "PARSE-TOPIC"
   "353"     "PARSE-NAMES"
   "366"     "PARSE-END-NAMES"
   "352"     "PARSE-WHO"
   "315"     "PARSE-END-WHO"
   "318"     "IGNORE-LINE"
   "333"     "IGNORE-LINE"
}>
VALUE LineTypes

: PARSE-LINE { event -- }
  "data" event ? { data }
  data " " SPLIT { tokens }
  0 tokens ?     { source }
  1 tokens ?     { type }
  2 tokens ?     { target }
  3 tokens SLICE { remaining }

  source "PING" = IF
    type PONG
    EXIT
  THEN

  type LineTypes KEYS CONTAINS IF
    type LineTypes ? { parser }
    source type target remaining parser EVALUATE
    EXIT
  THEN

  data InboundColour #view TEXT ;

`);
