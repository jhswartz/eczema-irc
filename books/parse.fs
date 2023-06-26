system.parse(`

OBJECT VALUE Names
OBJECT VALUE Users

OBJECT :VARIABLE Channels

: DROP-COLON { token -- token }
  token IF
    0 token ? ":" = IF
      1 token SLICE { token }
    THEN
  THEN
  token ;

: PONG { type -- }
  <[ "PONG" type ]> " " JOIN { message }
  message 1 "send" Socket ? METHOD ;

: PARSE-MOVEMENT { source type remaining -- }
  0 remaining ? DROP-COLON   { target }
  <[ type source ]> " " JOIN { message }
  message target #view MESSAGE ;

: PARSE-INFO { source type remaining -- }
  1 remaining ?               { channel }
  2 remaining SLICE " " JOIN  { info }
  <[ "INFO" topic ]> " " JOIN { message }
  message channel #view MESSAGE ;

: PARSE-TOPIC { source type remaining -- }
  1 remaining ?                         { channel }
  2 remaining SLICE " " JOIN DROP-COLON { topic }
  <[ "TOPIC" topic ]> " " JOIN          { message }
  message channel #view MESSAGE ;

: PARSE-TOPIC-SET-BY { source type remaining -- }
  1 remaining ?                { channel }
  2 remaining ?                { user }
  3 remaining ?                { at }
  <[ "SET-BY" user ]> " " JOIN { message }
  message channel #view MESSAGE ;

: PARSE-MODE { source type remaining -- }
  0 remaining ? DROP-COLON              { target }
  1 remaining ?                         { flags }
  2 remaining SLICE " " JOIN DROP-COLON { subject }
  <[ "MODE" flags subject ]> " " JOIN   { message }
  message target #view MESSAGE ;

: PARSE-NICK { source -- }
  source "!" SPLIT { tokens }
  0 tokens ? ;

: ADORN-NICK { type nick -- }
  type "NOTICE" = IF
    "(" { introducer }
    ")" { terminator }
  ELSE
    "<" { introducer }
    ">" { terminator }
  THEN
  <[ introducer nick terminator ]> "" JOIN ;

: PARSE-MESSAGE { source type remaining -- }
  0 remaining ? DROP-COLON              { target }
  1 remaining SLICE " " JOIN DROP-COLON { text }
  source PARSE-NICK                     { nick }
  type nick ADORN-NICK                  { from }
  <[ from text ]> " " JOIN              { message }
  message target #view MESSAGE ;

: PARSE-NAMES { source type remaining -- }
  2 remaining ?        { channel }
  channel Names ?      { existing }
  3 remaining SLICE    { names }
  0 names ? DROP-COLON { first }
  first 0 names !

  existing IF
    existing names CONCAT { names }
  THEN

  names channel Names ! ;

: PARSE-END-NAMES { source type remaining -- }
  1 remaining ?                 { channel }
  channel Names ? SORT " " JOIN { names }
  <[ "NAMES" names ]> " " JOIN  { message }
  message channel #view MESSAGE
  ARRAY channel Names ! ;

: PARSE-WHO { source type remaining -- }
  1 remaining ? { channel }
  5 remaining ? { nick }
  <{
    "username" 2 remaining ?
    "address"  3 remaining ?
    "info"     8 remaining SLICE " " JOIN
  }> nick Users ! ;

: PARSE-END-WHO { source type remaining -- }
  1 remaining ?   { channel }
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

: PARSE-WHOIS-USER { source type remaining -- }
  1 remaining ?                               { nick }
  2 remaining ?                               { user }
  3 remaining ?                               { address }
  5 remaining SLICE " " JOIN                  { info }
  <[ "IDENTITY" user address info ]> " " JOIN { message }
  message nick #view MESSAGE ;

: PARSE-WHOIS-CHANNELS { source type remaining -- }
  1 remaining ?                         { nick }
  2 remaining SLICE " " JOIN DROP-COLON { channels }
  <[ "CHANNELS" channels ]> " " JOIN    { message }
  message nick #view MESSAGE ;

: PARSE-WHOIS-SERVER { source type remaining -- }
  1 remaining ?                       { nick }
  2 remaining ?                       { server }
  3 remaining SLICE " " JOIN          { info }
  <[ "SERVER" server info ]> " " JOIN { message }
  message nick #view MESSAGE ;

: PARSE-WHOIS-CONNECTION { source type remaining -- }
  1 remaining ?                         { nick }
  2 remaining SLICE " " JOIN DROP-COLON { message }
  message nick #view MESSAGE ;

: PARSE-WHOIS-MODE { source type remaining -- }
  1 remaining ?                         { nick }
  2 remaining SLICE " " JOIN DROP-COLON { message }
  message nick #view MESSAGE ;

: PARSE-WHOIS-HOST { source type remaining -- }
  1 remaining ?                         { nick }
  2 remaining SLICE " " JOIN DROP-COLON { message }
  message nick #view MESSAGE ;

: PARSE-WHOIS-ACTUALLY { source type remaining -- }
  1 remaining ?              { nick }
  2 remaining ?              { host }
  <[ "HOST" host ]> " " JOIN { message }
  message nick #view MESSAGE ;

: PARSE-WHOIS-IDLE { source type remaining -- }
  1 remaining ? { nick }
  2 remaining ? { idle }
  <[ "IDLE"
     <[ idle DAYS?    "d" ]> "" JOIN
     <[ idle HOURS?   "h" ]> "" JOIN
     <[ idle MINUTES? "m" ]> "" JOIN
     <[ idle SECONDS? "s" ]> "" JOIN
  ]> " " JOIN { message }
  message nick #view MESSAGE ;

: PARSE-AWAY { source type remaining -- }
  1 remaining ?                         { nick }
  2 remaining SLICE " " JOIN DROP-COLON { reason }
  <[ "AWAY" reason ]> " " JOIN          { message }
  message nick #view MESSAGE ;

: PARSE-WHOIS-ACCOUNT { source type remaining -- }
  1 remaining ?                    { nick }
  2 remaining ?                    { account }
  <[ "ACCOUNT" account ]> " " JOIN { message }
  message nick #view MESSAGE ;

: PARSE-WHOIS-REGISTERED { source type remaining -- }
  1 remaining ?                    { nick }
  <[ "REGISTERED" nick ]> " " JOIN { message }
  message nick #view MESSAGE ;

: PARSE-LIST { source type remaining -- }
  1 remaining ? { channel }
  <{
    "users" 2 remaining ?
    "topic" 3 remaining SLICE " " JOIN DROP-COLON
  }> channel Channels ? ! ;

: PARSE-END-LIST { source type remaining -- }
  Channels ? KEYS SORT         { names }
  BEGIN names COUNT WHILE
    names POP                  { name }
    name Channels ? ?          { channel }
    "users" channel ?          { users }
    "topic" channel ?          { topic }
    <[ users topic ]> " " JOIN { info }
    info name #view MESSAGE
  REPEAT
  OBJECT Channels ! ;

: IGNORE-LINE { source type remaining -- } ;

<{
  "JOIN"    ' PARSE-MOVEMENT
  "PART"    ' PARSE-MOVEMENT
  "MODE"    ' PARSE-MODE
  "PRIVMSG" ' PARSE-MESSAGE
  "NOTICE"  ' PARSE-MESSAGE
  "331"     ' PARSE-INFO
  "332"     ' PARSE-TOPIC
  "333"     ' PARSE-TOPIC-SET-BY
  "353"     ' PARSE-NAMES
  "366"     ' PARSE-END-NAMES
  "352"     ' PARSE-WHO
  "315"     ' PARSE-END-WHO
  "311"     ' PARSE-WHOIS-USER
  "314"     ' PARSE-WHOIS-USER
  "319"     ' PARSE-WHOIS-CHANNELS
  "312"     ' PARSE-WHOIS-SERVER
  "671"     ' PARSE-WHOIS-CONNECTION
  "379"     ' PARSE-WHOIS-MODE
  "378"     ' PARSE-WHOIS-HOST
  "338"     ' PARSE-WHOIS-ACTUALLY
  "317"     ' PARSE-WHOIS-IDLE
  "330"     ' PARSE-WHOIS-ACCOUNT
  "307"     ' PARSE-WHOIS-REGISTERED
  "301"     ' PARSE-AWAY
  "322"     ' PARSE-LIST
  "323"     ' PARSE-END-LIST
  "318"     ' IGNORE-LINE
  "369"     ' IGNORE-LINE
}>
VALUE LineTypes

: PARSE-LINE { event -- }
  "data" event ?        { data }
  data " " SPLIT        { tokens }
  0 tokens ? DROP-COLON { source }
  1 tokens ?            { type }
  2 tokens SLICE        { remaining }

  source "PING" = IF
    type PONG
    EXIT
  THEN

  type LineTypes KEYS CONTAINS IF
    type LineTypes ? { parser }
    source type remaining parser EXECUTE
    EXIT
  THEN

  data InboundColour DefaultOpacity ? #view "unparsed" TEXT ;

`);
