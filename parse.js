system.parse(`

86400 VALUE SECONDS/DAY
3600  VALUE SECONDS/HOUR
60    VALUE SECONDS/MINUTE

OBJECT VALUE Names
OBJECT VALUE Users

: DECOLONISE { tokens -- tokens }
  0 tokens ? { first }
  0 first ? ":" = IF
    1 first SLICE { first }
    first 0 tokens !
  THEN
  tokens ;

: DAYS? { seconds -- days }
  seconds SECONDS/DAY / FLOOR ;

: HOURS? { seconds -- hours }
  seconds SECONDS/DAY  MOD
          SECONDS/HOUR / FLOOR ;

: MINUTES? { seconds -- hours }
  seconds SECONDS/DAY    MOD
          SECONDS/HOUR   MOD
          SECONDS/MINUTE / FLOOR ;

: SECONDS? { seconds -- hours }
  seconds SECONDS/DAY    MOD
          SECONDS/HOUR   MOD
          SECONDS/MINUTE MOD ;

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
  1 remaining ?                { channel }
  channel Names ?              { existing }
  2 remaining SLICE DECOLONISE { names }

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

: PARSE-WHOIS-USER { source type target remaining -- }
  0 remaining ?                               { nick }
  1 remaining ?                               { user }
  2 remaining ?                               { address }
  4 remaining SLICE " " JOIN                  { info }
  <[ "IDENTITY" user address info ]> " " JOIN { message }
  message nick #view MESSAGE ;

: PARSE-WHOIS-CHANNELS { source type target remaining -- }
  0 remaining ?                         { nick }
  1 remaining SLICE DECOLONISE " " JOIN { channels }
  <[ "CHANNELS" channels ]> " " JOIN    { message }
  message nick #view MESSAGE ;

: PARSE-WHOIS-SERVER { source type target remaining -- }
  0 remaining ?                       { nick }
  1 remaining ?                       { server }
  2 remaining SLICE " " JOIN          { info }
  <[ "SERVER" server info ]> " " JOIN { message }
  message nick #view MESSAGE ;

: PARSE-WHOIS-CONNECTION { source type target remaining -- }
  0 remaining ?                         { nick }
  1 remaining SLICE DECOLONISE " " JOIN { message }
  message nick #view MESSAGE ;

: PARSE-WHOIS-HOST { source type target remaining -- }
  0 remaining ?                         { nick }
  1 remaining SLICE DECOLONISE " " JOIN { message }
  message nick #view MESSAGE ;

: PARSE-WHOIS-ACTUALLY { source type target remaining -- }
  0 remaining ?              { nick }
  1 remaining ?              { host }
  <[ "HOST" host ]> " " JOIN { message }
  message nick #view MESSAGE ;

: PARSE-WHOIS-IDLE { source type target remaining -- }
  0 remaining ? { nick }
  1 remaining ? { idle }
  <[ "IDLE"
     <[ idle DAYS?    "d" ]> "" JOIN
     <[ idle HOURS?   "h" ]> "" JOIN
     <[ idle MINUTES? "m" ]> "" JOIN
     <[ idle SECONDS? "s" ]> "" JOIN
  ]> " " JOIN { message }
  message nick #view MESSAGE ;

: PARSE-AWAY { source type target remaining -- }
  0 remaining ?                         { nick }
  1 remaining SLICE DECOLONISE " " JOIN { reason }
  <[ "AWAY" reason ]> " " JOIN          { message }
  message nick #view MESSAGE ;

: PARSE-WHOIS-ACCOUNT { source type target remaining -- }
  0 remaining ?                    { nick }
  1 remaining ?                    { account }
  <[ "ACCOUNT" account ]> " " JOIN { message }
  message nick #view MESSAGE ;

: IGNORE-LINE { source type target remaining -- } ;

<{
   "JOIN"    ' PARSE-MOVEMENT
   "PART"    ' PARSE-MOVEMENT
   "MODE"    ' PARSE-MODE
   "PRIVMSG" ' PARSE-MESSAGE
   "NOTICE"  ' PARSE-MESSAGE
   "332"     ' PARSE-TOPIC
   "353"     ' PARSE-NAMES
   "366"     ' PARSE-END-NAMES
   "352"     ' PARSE-WHO
   "315"     ' PARSE-END-WHO
   "311"     ' PARSE-WHOIS-USER
   "319"     ' PARSE-WHOIS-CHANNELS
   "312"     ' PARSE-WHOIS-SERVER
   "671"     ' PARSE-WHOIS-CONNECTION
   "378"     ' PARSE-WHOIS-HOST
   "338"     ' PARSE-WHOIS-ACTUALLY
   "317"     ' PARSE-WHOIS-IDLE
   "330"     ' PARSE-WHOIS-ACCOUNT
   "301"     ' PARSE-AWAY
   "318"     ' IGNORE-LINE
   "333"     ' IGNORE-LINE
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
    source type target remaining parser EXECUTE
    EXIT
  THEN

  data InboundColour #view TEXT ;

`);
